import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import authRoute from "./routes/auth.js";
import reservationsRoute from "./routes/reservations.js";
import icalRoute from "./routes/ical.js";
import adminRoute from "./routes/admin.js";
import { getDb } from "./lib/db.js";
import { ical_feeds } from "./lib/schema.js";
import { fetchAndSync } from "./lib/icalSync.js";

const app = new Hono();

// CORS — only allow configured frontend origin
app.use("*", async (c, next) => {
  const handler = cors({
    origin: c.env.FRONTEND_URL,
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
