import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const urlStats = pgTable("url_stats", {
  code: varchar("code", { length: 10 }).primaryKey(),
  clickCount: integer("click_count").default(0).notNull(),
  lastClicked: timestamp("last_clicked", { withTimezone: true }),
});
