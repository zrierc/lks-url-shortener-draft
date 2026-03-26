import { Hono } from "hono";
import { swaggerUI } from "@hono/swagger-ui";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { env } from "./env";
import statsRoute from "./routes/stats";
import healthRoute from "./routes/health";
import { startConsumer, stopConsumer } from "./consumer/index";
import { db, closeDatabase } from "./config/database";

// Run DB migrations before starting
console.log("[db] Running migrations...");
await migrate(db, { migrationsFolder: "./src/database/migrations" });
console.log("[db] Migrations applied");

const app = new Hono();

// Routes
app.route("/api/stats", statsRoute);
app.route("/api/health", healthRoute);

// Swagger UI
app.get("/api/docs", swaggerUI({ url: "/api/docs/spec" }));

// Full OpenAPI spec
app.get("/api/docs/spec", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "lks-url Analytics Service",
      version: "1.0.0",
      description:
        "Analytics service — per-code click stats with breakdowns by device, OS, browser, and country. Consumes click events from SQS.",
    },
    servers: [{ url: "/", description: "Current server" }],
    components: {
      schemas: {
        ApiResponse: {
          type: "object",
          required: ["success", "timestamp"],
          properties: {
            success: { type: "boolean" },
            data: { description: "Present on success" },
            error: { type: "string", description: "Present on failure" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["success", "error", "timestamp"],
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "No stats found for this code" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        LeaderboardEntry: {
          type: "object",
          required: ["code", "click_count", "last_clicked"],
          properties: {
            code: { type: "string", example: "ab1234" },
            click_count: { type: "integer", example: 42 },
            last_clicked: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-03-24T12:00:00Z",
            },
          },
        },
        ClickBucket: {
          type: "object",
          required: ["date", "count"],
          properties: {
            date: { type: "string", format: "date", example: "2026-03-24" },
            count: { type: "integer", example: 7 },
          },
        },
        DeviceBucket: {
          type: "object",
          required: ["device_type", "count"],
          properties: {
            device_type: { type: "string", example: "desktop" },
            count: { type: "integer", example: 30 },
          },
        },
        OsBucket: {
          type: "object",
          required: ["os", "count"],
          properties: {
            os: { type: "string", example: "Windows" },
            count: { type: "integer", example: 18 },
          },
        },
        BrowserBucket: {
          type: "object",
          required: ["browser", "count"],
          properties: {
            browser: { type: "string", example: "Chrome" },
            count: { type: "integer", example: 22 },
          },
        },
        CountryBucket: {
          type: "object",
          required: ["country", "count"],
          properties: {
            country: { type: "string", example: "ID" },
            count: { type: "integer", example: 15 },
          },
        },
        StatsResponse: {
          type: "object",
          required: [
            "code",
            "original_url",
            "click_count",
            "last_clicked",
            "clicks_over_time",
            "by_device",
            "by_os",
            "by_browser",
            "by_country",
          ],
          properties: {
            code: { type: "string", example: "ab1234" },
            original_url: {
              type: "string",
              format: "uri",
              example: "https://www.example.com/some/very/long/path",
            },
            click_count: { type: "integer", example: 42 },
            last_clicked: {
              type: "string",
              format: "date-time",
              nullable: true,
              example: "2026-03-24T12:00:00Z",
            },
            clicks_over_time: {
              type: "array",
              items: { $ref: "#/components/schemas/ClickBucket" },
            },
            by_device: {
              type: "array",
              items: { $ref: "#/components/schemas/DeviceBucket" },
            },
            by_os: {
              type: "array",
              items: { $ref: "#/components/schemas/OsBucket" },
            },
            by_browser: {
              type: "array",
              items: { $ref: "#/components/schemas/BrowserBucket" },
            },
            by_country: {
              type: "array",
              items: { $ref: "#/components/schemas/CountryBucket" },
            },
          },
        },
        ServiceStatus: {
          type: "object",
          required: ["status", "latency_ms"],
          properties: {
            status: { type: "string", enum: ["ok", "error"] },
            latency_ms: { type: "number", example: 5 },
            error: { type: "string", description: "Only present on error" },
          },
        },
        HealthData: {
          type: "object",
          required: ["status", "timestamp", "services"],
          properties: {
            status: { type: "string", enum: ["ok", "degraded"] },
            timestamp: { type: "string", format: "date-time" },
            services: {
              type: "object",
              required: ["postgres", "sqs"],
              properties: {
                postgres: { $ref: "#/components/schemas/ServiceStatus" },
                sqs: { $ref: "#/components/schemas/ServiceStatus" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/stats": {
        get: {
          summary: "Leaderboard — top 10 most-clicked URLs",
          description: "Returns the top 10 short codes ordered by click count descending.",
          operationId: "getLeaderboard",
          tags: ["Stats"],
          responses: {
            "200": {
              description: "Top 10 leaderboard entries",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/LeaderboardEntry" },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      "/api/stats/{code}": {
        get: {
          summary: "Full click analytics for a short code",
          description:
            "Returns total click count, last click time, and breakdowns by time, device, OS, browser, and country.",
          operationId: "getStats",
          tags: ["Stats"],
          parameters: [
            {
              name: "code",
              in: "path",
              required: true,
              description: "6-character short code",
              schema: { type: "string", example: "ab1234" },
            },
          ],
          responses: {
            "200": {
              description: "Full analytics for the given code",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/StatsResponse" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description: "No stats found for this code",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/health": {
        get: {
          summary: "Health check",
          description:
            "Returns health status of Postgres and SQS. Always returns HTTP 200 — check `status` field for degraded.",
          operationId: "healthCheck",
          tags: ["Health"],
          responses: {
            "200": {
              description: "Health status (always 200 — check body for degraded)",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/HealthData" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  });
});

// Start SQS consumer (non-blocking)
startConsumer().catch(console.error);

// Start server with explicit reference for graceful shutdown
const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`[analytics] Listening on port ${env.PORT}`);

// Graceful shutdown — stop consumer, drain in-flight requests, close DB pool
async function shutdown(signal: string): Promise<never> {
  console.log(`[analytics] Received ${signal}, shutting down gracefully...`);
  stopConsumer();
  await server.stop(true); // wait for in-flight requests
  await closeDatabase();
  console.log("[analytics] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT",  () => { void shutdown("SIGINT"); });
