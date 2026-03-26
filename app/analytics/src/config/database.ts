import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from "../env";

// Create PostgreSQL connection
const client = postgres(env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: true,
  onnotice: (notice) => {
    // This warning occurs when database has no actual collation version but a version was recorded
    // It's safe to ignore as it doesn't affect functionality
    if (notice.code === '01000' && notice.message?.includes('collation version')) {
      return; // Suppress this specific warning
    }
  },
});

export const db = drizzle(client);

export async function checkDatabase(): Promise<{ status: "ok" | "error"; latency_ms: number; error?: string }> {
  const start = Date.now();
  try {
    await client`SELECT 1`;
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
  await client.end();
}
