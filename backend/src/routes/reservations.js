import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, lt, gt, ne } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { properties, reservations, blocked_dates } from "../lib/schema.js";
import { jwtMiddleware } from "../lib/auth.js";
import { sendBookingNotification } from "../lib/email.js";

const reservationsRoute = new Hono();

const createReservationSchema = z.object({
  property_slug: z.string().min(1),
  guest_name: z.string().min(2).max(100),
  guest_email: z.string().email(),
  guest_phone: z.string().optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  guests_count: z.number().int().min(1).max(30).default(1),
  notes: z.string().max(1000).optional(),
});

// POST /api/reservations — public booking form submission
reservationsRoute.post(
  "/",
  zValidator("json", createReservationSchema),
  async (c) => {
    const data = c.req.valid("json");
    const db = getDb(c.env);

    if (data.check_in >= data.check_out) {
      return c.json({ error: "check_out must be after check_in" }, 400);
    }

    // Resolve property
    const property = await db
      .select()
      .from(properties)
      .where(and(eq(properties.slug, data.property_slug), eq(properties.active, true)))
      .get();

    if (!property) {
      return c.json({ error: "Property not found" }, 404);
    }

    // Availability check: overlap = A.start < B.end AND A.end > B.start
    const blockedOverlap = await db
      .select({ id: blocked_dates.id })
      .from(blocked_dates)
      .where(
        and(
          eq(blocked_dates.property_id, property.id),
          lt(blocked_dates.date_from, data.check_out),
          gt(blocked_dates.date_to, data.check_in)
        )
      )
      .get();

    if (blockedOverlap) {
      return c.json({ error: "Selected dates are not available" }, 409);
    }

    const reservationOverlap = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.property_id, property.id),
          lt(reservations.check_in, data.check_out),
          gt(reservations.check_out, data.check_in),
          ne(reservations.status, "cancelled")
        )
      )
      .get();

    if (reservationOverlap) {
      return c.json({ error: "Selected dates are not available" }, 409);
    }

    const [newReservation] = await db
      .insert(reservations)
      .values({
        property_id: property.id,
        guest_name: data.guest_name,
        guest_email: data.guest_email,
        guest_phone: data.guest_phone ?? null,
        check_in: data.check_in,
        check_out: data.check_out,
        guests_count: data.guests_count,
        notes: data.notes ?? null,
        status: "pending",
        source: "direct",
      })
      .returning();

    // Fire-and-forget email to owner
    c.executionCtx.waitUntil(
      sendBookingNotification(newReservation, property, c.env.RESEND_API_KEY)
    );

    return c.json({ success: true, id: newReservation.id }, 201);
  }
);

// GET /api/reservations — admin only, filtered by property
reservationsRoute.get("/", jwtMiddleware(), async (c) => {
  const db = getDb(c.env);
  const payload = c.get("jwtPayload");

  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.property_id, payload.propertyId))
    .orderBy(reservations.check_in)
    .all();

  return c.json(rows);
});

export default reservationsRoute;
