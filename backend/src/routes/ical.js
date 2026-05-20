import { Hono } from "hono";
import { eq, and, ne } from "drizzle-orm";
import { getDb } from "../lib/db.js";
import { properties, reservations } from "../lib/schema.js";
import { generateIcal } from "../lib/icalGenerate.js";

const icalRoute = new Hono();

// GET /ical/:slug.ics — served to Booking.com, e-chalupy, TripAdvisor
icalRoute.get("/:slug", async (c) => {
  const rawSlug = c.req.param("slug");
  // Strip .ics extension if present
  const slug = rawSlug.endsWith(".ics") ? rawSlug.slice(0, -4) : rawSlug;

  const db = getDb(c.env);

  const property = await db
    .select()
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.active, true)))
    .get();

  if (!property) {
    return c.text("Not found", 404);
  }

  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.property_id, property.id),
        ne(reservations.status, "cancelled")
      )
    )
    .all();

  const icsContent = generateIcal(property, rows);

  return new Response(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Disposition": `attachment; filename="${slug}.ics"`,
    },
  });
});

export default icalRoute;
