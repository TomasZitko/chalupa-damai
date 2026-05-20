import ical from "node-ical";
import { getDb } from "./db.js";
import { ical_feeds, blocked_dates } from "./schema.js";
import { eq, and } from "drizzle-orm";

export async function fetchAndSync(env, propertyId, platformName, feedUrl) {
  const db = getDb(env);

  let events;
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "Damai-iCal-Sync/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    events = ical.sync.parseICS(text);
  } catch (err) {
    console.error(`[icalSync] Failed to fetch ${feedUrl}:`, err.message);
    return { synced: 0, error: err.message };
  }

  let synced = 0;

  for (const [uid, event] of Object.entries(events)) {
    if (event.type !== "VEVENT") continue;

    const start = event.start;
    const end = event.end;
    if (!start || !end) continue;

    const dateFrom = toDateString(start);
    const dateTo = toDateString(end);
    const externalUid = `${platformName}::${uid}`;
    const summary = event.summary || null;

    try {
      // Upsert: insert or replace based on external_uid unique constraint
      await db
        .insert(blocked_dates)
        .values({
          property_id: propertyId,
          external_uid: externalUid,
          source: platformName,
          date_from: dateFrom,
          date_to: dateTo,
          summary,
        })
        .onConflictDoUpdate({
          target: blocked_dates.external_uid,
          set: {
            date_from: dateFrom,
            date_to: dateTo,
            summary,
          },
        });
      synced++;
    } catch (err) {
      console.error(`[icalSync] Upsert failed for ${externalUid}:`, err.message);
    }
  }

  // Update last_synced_at on the feed row
  await db
    .update(ical_feeds)
    .set({ last_synced_at: new Date().toISOString() })
    .where(
      and(
        eq(ical_feeds.property_id, propertyId),
        eq(ical_feeds.platform_name, platformName)
      )
    );

  console.log(`[icalSync] ${platformName} → property ${propertyId}: ${synced} events synced`);
  return { synced };
}

function toDateString(d) {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}
