import { Hono } from "hono";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../config/database";
import { urls } from "../database/schema/urls";
import { generateCode } from "../utils/nanoid";
import { ok, err } from "../types/response";
import { env } from "../env";
import type { ShortenResult } from "../types";

const shortenSchema = z.object({
  url: z.string().url({ message: "Invalid URL" }),
});

const app = new Hono();

app.post("/api/shorten", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(err("Invalid JSON body"), 400);
  }

  const parsed = shortenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(err("Invalid URL"), 400);
  }

  const { url } = parsed.data;

  try {
    // Generate unique 6-char code (retry on collision — extremely rare)
    let code: string = generateCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db
        .select({ id: urls.id })
        .from(urls)
        .where(eq(urls.code, code))
        .limit(1);
      if (existing.length === 0) break;
      code = generateCode();
    }

    const [inserted] = await db
      .insert(urls)
      .values({ code, original: url })
      .returning();

    if (!inserted) {
      return c.json(err("Failed to create short URL"), 500);
    }

    const result: ShortenResult = {
      code: inserted.code,
      short_url: `${env.BASE_URL}/${inserted.code}`,
      original_url: inserted.original,
      created_at: inserted.createdAt.toISOString(),
    };

    return c.json(ok(result), 200);
  } catch (e) {
    console.error("[shorten] error:", e);
    return c.json(err("Internal server error"), 500);
  }
});

export default app;
