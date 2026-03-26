import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { urls } from "../database/schema/urls";
import { getCacheDriver } from "../config/cache";
import { publishClickEvent } from "../utils/sqs";
import { err } from "../types/response";

const app = new Hono();

app.get("/s/:code", async (c) => {
  const code = c.req.param("code");

  try {
    const cache = await getCacheDriver();

    // Cache lookup
    const cached = await cache.get(code);
    if (cached) {
      // Fire and forget — do NOT await
      publishClickEvent({
        code,
        clicked_at: new Date().toISOString(),
        ip: (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "").split(",")[0]?.trim() ?? "",
        user_agent: c.req.header("user-agent") ?? "",
        referrer: c.req.header("referer") ?? "",
      }).catch(console.error);

      return c.redirect(cached, 301);
    }

    // Cache miss — query RDS
    const [row] = await db
      .select({ original: urls.original })
      .from(urls)
      .where(eq(urls.code, code))
      .limit(1);

    if (!row) {
      return c.json(err("Short code not found"), 404);
    }

    // Warm cache for next hit
    cache.set(code, row.original).catch(console.error);

    // Fire and forget SQS event
    publishClickEvent({
      code,
      clicked_at: new Date().toISOString(),
      ip: (c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "").split(",")[0]?.trim() ?? "",
      user_agent: c.req.header("user-agent") ?? "",
      referrer: c.req.header("referer") ?? "",
    }).catch(console.error);

    return c.redirect(row.original, 301);
  } catch (e) {
    console.error("[redirect] error:", e);
    return c.json(err("Internal server error"), 500);
  }
});

export default app;
