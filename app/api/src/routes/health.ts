import { Hono } from "hono";
import { checkDatabase } from "../config/database";
import { getCacheDriver } from "../config/cache";
import { ok } from "../types/response";
import { env } from "../env";
import type { HealthData, ServiceHealth } from "../types";

const app = new Hono();

app.get("/api/health", async (c) => {
  const [pgHealth, cacheHealth] = await Promise.all([
    checkDatabase(),
    getCacheDriver().then((d) => d.checkHealth()),
  ]);

  const services: HealthData["services"] = {
    postgres: pgHealth,
  };

  // Determine which cache backend is active for the key name
  if (env.DYNAMODB_TABLE && env.DYNAMODB_REGION) {
    services.dynamodb = cacheHealth as ServiceHealth;
  } else if (env.REDIS_URL) {
    services.redis = cacheHealth as ServiceHealth;
  }

  const allOk = Object.values(services).every((s) => s.status === "ok");

  const data: HealthData = {
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    services,
  };

  // Always return HTTP 200 — status is in the body
  return c.json(ok(data), 200);
});

export default app;
