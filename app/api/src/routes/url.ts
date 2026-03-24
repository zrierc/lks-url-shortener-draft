import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { urls } from "../database/schema/urls";
import { getCacheDriver } from "../config/cache";
import { ok, err } from "../types/response";

const app = new Hono();

app.delete("/api/url/:code", async (c) => {
  const code = c.req.param("code");

  try {
    // Check if it exists first
    const [existing] = await db
      .select({ code: urls.code })
      .from(urls)
      .where(eq(urls.code, code))
      .limit(1);

    if (!existing) {
      return c.json(err("Short code not found"), 404);
    }

    // Delete from DB
    await db.delete(urls).where(eq(urls.code, code));

    // Invalidate cache (fire and forget)
    const cache = await getCacheDriver();
    cache.del(code).catch(console.error);

    return c.json(ok({ code }), 200);
  } catch (e) {
    console.error("[delete] error:", e);
    return c.json(err("Internal server error"), 500);
  }
});

export default app;
