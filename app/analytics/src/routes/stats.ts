import { Hono } from "hono";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "../config/database";
import { urlStats, clickLog, urls } from "../database/schema/index";
import { ok, err } from "../types/response";
import type { StatsResponse, LeaderboardEntry } from "../types/index";

const stats = new Hono();

// GET /api/stats — Leaderboard (top 10)
stats.get("/", async (c) => {
  const rows = await db
    .select({
      code: urlStats.code,
      click_count: urlStats.clickCount,
      last_clicked: urlStats.lastClicked,
    })
    .from(urlStats)
    .orderBy(desc(urlStats.clickCount))
    .limit(10);

  const data: LeaderboardEntry[] = rows.map((r) => ({
    code: r.code,
    click_count: r.click_count,
    last_clicked: r.last_clicked ? r.last_clicked.toISOString() : null,
  }));

  return c.json(ok(data));
});

// GET /api/stats/:code — Full analytics for one code
stats.get("/:code", async (c) => {
  const code = c.req.param("code");

  // Get url_stats row
  const [statsRow] = await db
    .select()
    .from(urlStats)
    .where(eq(urlStats.code, code))
    .limit(1);

  if (!statsRow) {
    return c.json(err("No stats found for this code"), 404);
  }

  // Run remaining queries in parallel
  const [urlRows, clicksOverTime, byDevice, byOs, byBrowser, byCountry] = await Promise.all([
    db.select({ original: urls.original }).from(urls).where(eq(urls.code, code)).limit(1),

    // clicks_over_time (daily buckets)
    db.execute<{ date: string; count: string }>(
      sql`SELECT DATE(clicked_at AT TIME ZONE 'UTC') AS date, COUNT(*)::text AS count
          FROM click_log WHERE code = ${code}
          GROUP BY DATE(clicked_at AT TIME ZONE 'UTC')
          ORDER BY date ASC`,
    ),

    // by_device
    db.execute<{ device_type: string | null; count: string }>(
      sql`SELECT device_type, COUNT(*)::text AS count
          FROM click_log WHERE code = ${code}
          GROUP BY device_type`,
    ),

    // by_os
    db.execute<{ os: string | null; count: string }>(
      sql`SELECT os, COUNT(*)::text AS count
          FROM click_log WHERE code = ${code}
          GROUP BY os`,
    ),

    // by_browser
    db.execute<{ browser: string | null; count: string }>(
      sql`SELECT browser, COUNT(*)::text AS count
          FROM click_log WHERE code = ${code}
          GROUP BY browser`,
    ),

    // by_country
    db.execute<{ country: string | null; count: string }>(
      sql`SELECT country, COUNT(*)::text AS count
          FROM click_log WHERE code = ${code}
          GROUP BY country`,
    ),
  ]);

  const originalUrl = urlRows[0]?.original ?? "";

  const data: StatsResponse = {
    code,
    original_url: originalUrl,
    click_count: statsRow.clickCount,
    last_clicked: statsRow.lastClicked ? statsRow.lastClicked.toISOString() : null,
    clicks_over_time: (clicksOverTime.rows as Array<{ date: string; count: string }>).map((r) => ({
      date: r.date,
      count: parseInt(r.count, 10),
    })),
    by_device: (byDevice.rows as Array<{ device_type: string | null; count: string }>).map((r) => ({
      device_type: r.device_type ?? "Unknown",
      count: parseInt(r.count, 10),
    })),
    by_os: (byOs.rows as Array<{ os: string | null; count: string }>).map((r) => ({
      os: r.os ?? "Unknown",
      count: parseInt(r.count, 10),
    })),
    by_browser: (byBrowser.rows as Array<{ browser: string | null; count: string }>).map((r) => ({
      browser: r.browser ?? "Unknown",
      count: parseInt(r.count, 10),
    })),
    by_country: (byCountry.rows as Array<{ country: string | null; count: string }>).map((r) => ({
      country: r.country ?? "Unknown",
      count: parseInt(r.count, 10),
    })),
  };

  return c.json(ok(data));
});

export default stats;
