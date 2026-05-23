import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { properties } from "../lib/schema.js";
import { verifyPassword, createToken } from "../lib/auth.js";

const auth = new Hono();

// In-process rate limiter: max 10 failed attempts per IP per 15 minutes.
// NOTE: This is per Worker isolate. For distributed rate limiting across all
// instances, add a Cloudflare KV namespace and track counters there, or enable
// Cloudflare WAF rate-limiting rules in the dashboard.
const loginAttempts = new Map();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

function clearAttempts(ip) {
  loginAttempts.delete(ip);
}

const loginSchema = z.object({
  password: z.string().min(1),
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const ip =
    c.req.header("CF-Connecting-IP") ??
    c.req.header("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown";

  if (isRateLimited(ip)) {
    return c.json({ error: "Too many attempts. Please try again later." }, 429);
  }

  const { password } = c.req.valid("json");
  const db = getDb(c.env);

  // Single-property system — find the one active property
  const property = await db
    .select()
    .from(properties)
    .where(eq(properties.active, true))
    .get();

  if (!property) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const valid = await verifyPassword(password, property.owner_password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // Successful login — clear any accumulated failed attempts for this IP
  clearAttempts(ip);

  const token = await createToken(
    { sub: property.owner_email, propertyId: property.id, propertySlug: property.slug },
    c.env.JWT_SECRET
  );

  return c.json({ token, property: { id: property.id, name: property.name, slug: property.slug } });
});

export default auth;
