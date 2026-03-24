import { Hono } from "hono";
import { checkDatabase } from "../config/database";
import { checkSqsHealth } from "../utils/sqs";
import { ok } from "../types/response";
import type { HealthData } from "../types/index";

const health = new Hono();

health.get("/", async (c) => {
  const [postgres, sqs] = await Promise.all([
    checkDatabase(),
    checkSqsHealth(),
  ]);

  const overallStatus = postgres.status === "ok" && sqs.status === "ok" ? "ok" : "degraded";

  const data: HealthData = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    services: { postgres, sqs },
  };

  return c.json(ok(data));
});

export default health;
