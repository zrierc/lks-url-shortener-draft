import { pgTable, bigserial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const clickLog = pgTable("click_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: varchar("code", { length: 10 }).notNull(),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
  ip: varchar("ip", { length: 45 }),
  country: varchar("country", { length: 8 }),
  city: varchar("city", { length: 128 }),
  deviceType: varchar("device_type", { length: 16 }),
  os: varchar("os", { length: 64 }),
  browser: varchar("browser", { length: 64 }),
  referrer: text("referrer"),
});
