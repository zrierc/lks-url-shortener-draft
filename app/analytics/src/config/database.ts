import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env";

const pool = new Pool({ connectionString: env.DATABASE_URL });

export const db = drizzle(pool);

export async function checkDatabase(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
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
