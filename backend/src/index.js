import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq, and, ne } from "drizzle-orm";
import authRoute from "./routes/auth.js";
import reservationsRoute from "./routes/reservations.js";
import icalRoute from "./routes/ical.js";
import adminRoute from "./routes/admin.js";
import { getDb } from "./lib/db.js";
import { ical_feeds, properties, blocked_dates, reservations } from "./lib/schema.js";
import { fetchAndSync } from "./lib/icalSync.js";

const app = new Hono();

// CORS — allow CF Pages deployments + local dev
app.use("*", async (c, next) => {
  const handler = cors({
    origin: (origin) => {
      if (!origin) return null;
      const explicit = c.env.FRONTEND_URL;
      if (explicit && origin === explicit) return origin;
      if (origin.endsWith(".pages.dev")) return origin;
      if (origin.startsWith("http://localhost:")) return origin;
      return null;
    },
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
  });
  return handler(c, next);
});

// Routes
app.route("/api/auth", authRoute);
app.route("/api/reservations", reservationsRoute);
app.route("/api/admin", adminRoute);
app.route("/ical", icalRoute);

// GET /api/availability/:slug — public, returns all blocked ranges for the calendar
app.get("/api/availability/:slug", async (c) => {
  const slug = c.req.param("slug");
  const db = getDb(c.env);

  const property = await db
    .select()
    .from(properties)
    .where(and(eq(properties.slug, slug), eq(properties.active, true)))
    .get();

  if (!property) return c.json({ error: "Not found" }, 404);

  const [externalBlocks, directReservations] = await Promise.all([
    db
      .select({ date_from: blocked_dates.date_from, date_to: blocked_dates.date_to })
      .from(blocked_dates)
      .where(eq(blocked_dates.property_id, property.id))
      .all(),
    db
      .select({ date_from: reservations.check_in, date_to: reservations.check_out })
      .from(reservations)
      .where(
        and(
          eq(reservations.property_id, property.id),
          ne(reservations.status, "cancelled")
        )
      )
      .all(),
  ]);

  return c.json([...externalBlocks, ...directReservations]);
});

// Health check
app.get("/", (c) => c.json({ ok: true, service: "chalupa-backend" }));

// 404 fallback
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Global error handler
app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

// ─── Cron: sync all active iCal feeds every 20 minutes ───────────────────────
async function syncAllFeeds(env) {
  const db = getDb(env);

  const feeds = await db
    .select()
    .from(ical_feeds)
    .where(eq(ical_feeds.active, true))
    .all();

  console.log(`[cron] Syncing ${feeds.length} active feed(s)`);

  await Promise.allSettled(
    feeds.map((feed) =>
      fetchAndSync(env, feed.property_id, feed.platform_name, feed.feed_url)
    )
  );
}

// Cloudflare Workers export — fetch + scheduled handlers
export default {
  fetch: app.fetch,

  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncAllFeeds(env));
  },
};
