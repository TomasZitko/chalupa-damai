import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { properties } from "../lib/schema.js";
import { verifyPassword, createToken } from "../lib/auth.js";

const auth = new Hono();

const loginSchema = z.object({
  password: z.string().min(1),
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
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

  const token = await createToken(
    { sub: property.owner_email, propertyId: property.id, propertySlug: property.slug },
    c.env.JWT_SECRET
  );

  return c.json({ token, property: { id: property.id, name: property.name, slug: property.slug } });
});

export default auth;
