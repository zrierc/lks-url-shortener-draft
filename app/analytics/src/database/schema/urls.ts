// Read-only reference to the urls table owned by shortener-api.
// analytics-svc queries this table directly (same RDS instance) — no HTTP calls.
import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const urls = pgTable("urls", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 10 }).unique().notNull(),
  original: text("original").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});
