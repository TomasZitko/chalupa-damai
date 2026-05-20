import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import {
  properties,
  reservations,
  ical_feeds,
  blocked_dates,
} from "../lib/schema.js";
import { jwtMiddleware } from "../lib/auth.js";
import { sendBookingConfirmation } from "../lib/email.js";
import { fetchAndSync } from "../lib/icalSync.js";

const admin = new Hono();

// All /api/admin/* routes require a valid JWT
admin.use("/*", jwtMiddleware());

// Helper: assert the target reservation belongs to the JWT owner's property
async function getOwnedReservation(db, reservationId, propertyId) {
  return db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.id, reservationId),
        eq(reservations.property_id, propertyId)
      )
    )
    .get();
}

// ─── Reservations ────────────────────────────────────────────────────────────

// GET /api/admin/reservations
admin.get("/reservations", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");

  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.property_id, propertyId))
    .orderBy(reservations.check_in)
    .all();

  return c.json(rows);
});

// GET /api/admin/reservations/:id
admin.get("/reservations/:id", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const id = Number(c.req.param("id"));

  const row = await getOwnedReservation(db, id, propertyId);
  if (!row) return c.json({ error: "Not found" }, 404);

  return c.json(row);
});

const updateStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "cancelled"]),
});

// PATCH /api/admin/reservations/:id/status
admin.patch(
  "/reservations/:id/status",
  zValidator("json", updateStatusSchema),
  async (c) => {
    const db = getDb(c.env);
    const { propertyId } = c.get("jwtPayload");
    const id = Number(c.req.param("id"));
    const { status } = c.req.valid("json");

    const existing = await getOwnedReservation(db, id, propertyId);
    if (!existing) return c.json({ error: "Not found" }, 404);

    const [updated] = await db
      .update(reservations)
      .set({ status })
      .where(eq(reservations.id, id))
      .returning();

    // Send confirmation email to guest when owner confirms
    if (status === "confirmed") {
      const property = await db
        .select()
        .from(properties)
        .where(eq(properties.id, propertyId))
        .get();

      c.executionCtx.waitUntil(
        sendBookingConfirmation(updated, property, c.env.RESEND_API_KEY)
      );
    }

    return c.json(updated);
  }
);

// DELETE /api/admin/reservations/:id
admin.delete("/reservations/:id", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const id = Number(c.req.param("id"));

  const existing = await getOwnedReservation(db, id, propertyId);
  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(reservations).where(eq(reservations.id, id));
  return c.json({ success: true });
});

// ─── iCal Feeds ──────────────────────────────────────────────────────────────

const feedSchema = z.object({
  platform_name: z.string().min(1).max(60),
  feed_url: z.string().url(),
  active: z.boolean().optional().default(true),
});

// GET /api/admin/feeds
admin.get("/feeds", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");

  const rows = await db
    .select()
    .from(ical_feeds)
    .where(eq(ical_feeds.property_id, propertyId))
    .all();

  return c.json(rows);
});

// POST /api/admin/feeds
admin.post("/feeds", zValidator("json", feedSchema), async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const data = c.req.valid("json");

  const [feed] = await db
    .insert(ical_feeds)
    .values({ ...data, property_id: propertyId })
    .returning();

  // Trigger immediate sync for the new feed
  c.executionCtx.waitUntil(
    fetchAndSync(c.env, propertyId, feed.platform_name, feed.feed_url)
  );

  return c.json(feed, 201);
});

// PATCH /api/admin/feeds/:id
admin.patch(
  "/feeds/:id",
  zValidator("json", feedSchema.partial()),
  async (c) => {
    const db = getDb(c.env);
    const { propertyId } = c.get("jwtPayload");
    const id = Number(c.req.param("id"));
    const data = c.req.valid("json");

    const existing = await db
      .select()
      .from(ical_feeds)
      .where(and(eq(ical_feeds.id, id), eq(ical_feeds.property_id, propertyId)))
      .get();

    if (!existing) return c.json({ error: "Not found" }, 404);

    const [updated] = await db
      .update(ical_feeds)
      .set(data)
      .where(eq(ical_feeds.id, id))
      .returning();

    return c.json(updated);
  }
);

// DELETE /api/admin/feeds/:id
admin.delete("/feeds/:id", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const id = Number(c.req.param("id"));

  const existing = await db
    .select()
    .from(ical_feeds)
    .where(and(eq(ical_feeds.id, id), eq(ical_feeds.property_id, propertyId)))
    .get();

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(ical_feeds).where(eq(ical_feeds.id, id));
  return c.json({ success: true });
});

// POST /api/admin/feeds/:id/sync — manual trigger for a single feed
admin.post("/feeds/:id/sync", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const id = Number(c.req.param("id"));

  const feed = await db
    .select()
    .from(ical_feeds)
    .where(and(eq(ical_feeds.id, id), eq(ical_feeds.property_id, propertyId)))
    .get();

  if (!feed) return c.json({ error: "Not found" }, 404);

  const result = await fetchAndSync(
    c.env,
    propertyId,
    feed.platform_name,
    feed.feed_url
  );

  return c.json(result);
});

// ─── Blocked Dates ───────────────────────────────────────────────────────────

// GET /api/admin/blocked — view all externally-imported blocks
admin.get("/blocked", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");

  const rows = await db
    .select()
    .from(blocked_dates)
    .where(eq(blocked_dates.property_id, propertyId))
    .orderBy(blocked_dates.date_from)
    .all();

  return c.json(rows);
});

// DELETE /api/admin/blocked/:id — remove a manually-imported block if needed
admin.delete("/blocked/:id", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");
  const id = Number(c.req.param("id"));

  const existing = await db
    .select()
    .from(blocked_dates)
    .where(
      and(eq(blocked_dates.id, id), eq(blocked_dates.property_id, propertyId))
    )
    .get();

  if (!existing) return c.json({ error: "Not found" }, 404);

  await db.delete(blocked_dates).where(eq(blocked_dates.id, id));
  return c.json({ success: true });
});

// ─── Property info ───────────────────────────────────────────────────────────

// GET /api/admin/property — current owner's property details
admin.get("/property", async (c) => {
  const db = getDb(c.env);
  const { propertyId } = c.get("jwtPayload");

  const property = await db
    .select({
      id: properties.id,
      name: properties.name,
      slug: properties.slug,
      owner_email: properties.owner_email,
      active: properties.active,
    })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .get();

  if (!property) return c.json({ error: "Not found" }, 404);
  return c.json(property);
});

export default admin;
