import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";
import * as schema from "../database/schema";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const db = drizzle(pool, { schema });

export async function checkDatabase(): Promise<{
  status: "ok" | "error";
  latency_ms: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await pool.query("SELECT 1");
    return { status: "ok", latency_ms: Date.now() - start };
  } catch (e) {
    return {
      status: "error",
      latency_ms: -1,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
