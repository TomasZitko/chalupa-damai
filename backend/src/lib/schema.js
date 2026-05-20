import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const properties = sqliteTable("properties", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  owner_email: text("owner_email").notNull(),
  owner_password_hash: text("owner_password_hash").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const ical_feeds = sqliteTable("ical_feeds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  property_id: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  platform_name: text("platform_name").notNull(),
  feed_url: text("feed_url").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  last_synced_at: text("last_synced_at"),
});

export const blocked_dates = sqliteTable("blocked_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  property_id: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  external_uid: text("external_uid").notNull().unique(),
  source: text("source").notNull(),
  date_from: text("date_from").notNull(),
  date_to: text("date_to").notNull(),
  summary: text("summary"),
});

export const reservations = sqliteTable("reservations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  property_id: integer("property_id")
    .notNull()
    .references(() => properties.id, { onDelete: "cascade" }),
  guest_name: text("guest_name").notNull(),
  guest_email: text("guest_email").notNull(),
  guest_phone: text("guest_phone"),
  check_in: text("check_in").notNull(),
  check_out: text("check_out").notNull(),
  guests_count: integer("guests_count").notNull().default(1),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "confirmed", "cancelled"] })
    .notNull()
    .default("pending"),
  source: text("source").notNull().default("direct"),
  created_at: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
