import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const urls = pgTable(
  "urls",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).unique().notNull(),
    original: text("original").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    codeIdx: index("idx_urls_code").on(table.code),
  }),
);

export type Url = typeof urls.$inferSelect;
export type NewUrl = typeof urls.$inferInsert;
