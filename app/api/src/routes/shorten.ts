import { Hono } from "hono";
import { z } from "zod";
import { eq, ilike, or, desc, asc, sql } from "drizzle-orm";
import { db } from "../config/database";
import { urls } from "../database/schema/urls";
import { generateCode } from "../utils/nanoid";
import { ok, err } from "../types/response";
import { env } from "../env";
import type { ShortenResult, PaginatedLinks } from "../types";

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

// GET /api/shorten — list all shortened URLs with filter, sort, pagination
app.get("/api/shorten", async (c) => {
  const q     = c.req.query("q")     ?? "";
  const sort  = c.req.query("sort")  ?? "created_at";
  const order = c.req.query("order") ?? "desc";
  const page  = Math.max(1, parseInt(c.req.query("page")  ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") ?? "20", 10)));
  const offset = (page - 1) * limit;

  try {
    // WHERE clause: search by code or original URL
    const where = q.trim()
      ? or(ilike(urls.code, `%${q}%`), ilike(urls.original, `%${q}%`))
      : undefined;

    // Sort column
    const sortCol =
      sort === "code"         ? urls.code :
      sort === "original_url" ? urls.original :
                                urls.createdAt;
    const orderFn = order === "asc" ? asc : desc;

    // Run items + count in parallel
    const [rows, [countRow]] = await Promise.all([
      db.select().from(urls).where(where).orderBy(orderFn(sortCol)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(urls).where(where),
    ]);

    const total = countRow?.total ?? 0;

    const result: PaginatedLinks = {
      items: rows.map((r) => ({
        code:         r.code,
        short_url:    `${env.BASE_URL}/${r.code}`,
        original_url: r.original,
        created_at:   r.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };

    return c.json(ok(result), 200);
  } catch (e) {
    console.error("[list-shorten] error:", e);
    return c.json(err("Internal server error"), 500);
  }
});

export default app;
