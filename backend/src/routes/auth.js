import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { properties } from "../lib/schema.js";
import { verifyPassword, createToken } from "../lib/auth.js";

const auth = new Hono();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  // owner_password_hash must be seeded directly in D1 — no registration endpoint
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const db = getDb(c.env);

  const property = await db
    .select()
    .from(properties)
    .where(eq(properties.owner_email, email))
    .get();

  if (!property || !property.active) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  // owner_password_hash is stored on the property row — seed it via migration
  const valid = await verifyPassword(password, property.owner_password_hash);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = await createToken(
    { sub: email, propertyId: property.id, propertySlug: property.slug },
    c.env.JWT_SECRET
  );

  return c.json({ token, property: { id: property.id, name: property.name, slug: property.slug } });
});

export default auth;
