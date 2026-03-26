import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { swaggerUI } from "@hono/swagger-ui";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDatabase } from "./config/database";
import { env } from "./env";
import shortenRoute from "./routes/shorten";
import redirectRoute from "./routes/redirect";
import urlRoute from "./routes/url";
import healthRoute from "./routes/health";

// Run DB migrations before starting
console.log("[db] Running migrations...");
await migrate(db, { migrationsFolder: "./src/database/migrations" });
console.log("[db] Migrations applied");

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors());

// Mount routes
app.route("/", healthRoute);
app.route("/", shortenRoute);
app.route("/", urlRoute);
// Redirect must be last — catches /:code after all /api/* routes
app.route("/", redirectRoute);

// Swagger UI
app.get("/api/docs", swaggerUI({ url: "/api/openapi.json" }));

// Full OpenAPI spec
app.get("/api/openapi.json", (c) => {
  return c.json({
    openapi: "3.0.0",
    info: {
      title: "lks-url Shortener API",
      version: "1.0.0",
      description:
        "URL shortener service — shorten URLs, redirect by code, delete, and health check. DynamoDB cache (Batch A).",
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
        ShortenRequest: {
          type: "object",
          required: ["url"],
          properties: {
            url: {
              type: "string",
              format: "uri",
              example: "https://www.example.com/some/very/long/path",
            },
          },
        },
        ShortenResult: {
          type: "object",
          required: ["code", "short_url", "original_url", "created_at"],
          properties: {
            code: { type: "string", example: "ab1234" },
            short_url: { type: "string", format: "uri", example: "http://localhost:3000/ab1234" },
            original_url: {
              type: "string",
              format: "uri",
              example: "https://www.example.com/some/very/long/path",
            },
            created_at: { type: "string", format: "date-time" },
          },
        },
        DeleteResult: {
          type: "object",
          required: ["code"],
          properties: {
            code: { type: "string", example: "ab1234" },
          },
        },
        ServiceHealth: {
          type: "object",
          required: ["status", "latency_ms"],
          properties: {
            status: { type: "string", enum: ["ok", "error"] },
            latency_ms: { type: "number", example: 4 },
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
              properties: {
                postgres: { $ref: "#/components/schemas/ServiceHealth" },
                dynamodb: { $ref: "#/components/schemas/ServiceHealth" },
                redis: { $ref: "#/components/schemas/ServiceHealth" },
              },
            },
          },
        },
        PaginatedLinks: {
          type: "object",
          required: ["items", "total", "page", "limit", "total_pages"],
          properties: {
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/ShortenResult" },
            },
            total: { type: "integer", example: 42 },
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total_pages: { type: "integer", example: 3 },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["success", "error", "timestamp"],
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Short code not found" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/api/shorten": {
        get: {
          summary: "List all shortened URLs",
          description: "Returns a paginated, filterable, sortable list of all shortened URLs.",
          operationId: "listUrls",
          tags: ["URLs"],
          parameters: [
            {
              name: "q",
              in: "query",
              required: false,
              description: "Search term (matches code or original URL)",
              schema: { type: "string" },
            },
            {
              name: "sort",
              in: "query",
              required: false,
              description: "Sort field",
              schema: { type: "string", enum: ["code", "original_url", "created_at"], default: "created_at" },
            },
            {
              name: "order",
              in: "query",
              required: false,
              description: "Sort direction",
              schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
            },
            {
              name: "page",
              in: "query",
              required: false,
              description: "Page number (1-based)",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Items per page (max 100)",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            "200": {
              description: "Paginated list of shortened URLs",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/PaginatedLinks" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
        post: {
          summary: "Shorten a URL",
          description: "Accepts a long URL and returns a 6-character short code and the full short URL.",
          operationId: "shortenUrl",
          tags: ["URLs"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ShortenRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Short URL created successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/ShortenResult" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Invalid or missing URL",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/{code}": {
        get: {
          summary: "Redirect to original URL",
          description:
            "Looks up the short code, fires a click event to SQS (non-blocking), and returns a 301 redirect to the original URL.",
          operationId: "redirectCode",
          tags: ["URLs"],
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
            "301": {
              description: "Redirect to original URL",
              headers: {
                Location: {
                  schema: { type: "string", format: "uri" },
                  description: "The original URL",
                },
              },
            },
            "404": {
              description: "Short code not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/url/{code}": {
        delete: {
          summary: "Delete a short URL",
          description: "Deletes the URL record from the database and invalidates the cache entry.",
          operationId: "deleteUrl",
          tags: ["URLs"],
          parameters: [
            {
              name: "code",
              in: "path",
              required: true,
              description: "6-character short code to delete",
              schema: { type: "string", example: "ab1234" },
            },
          ],
          responses: {
            "200": {
              description: "URL deleted successfully",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/DeleteResult" },
                        },
                      },
                    ],
                  },
                },
              },
            },
            "404": {
              description: "Short code not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Internal server error",
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
            "Returns health status of all dependencies (Postgres, DynamoDB/Redis). Always returns HTTP 200 — check `status` field in body for degraded state.",
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

// Start server with explicit reference for graceful shutdown
const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
});

console.log(`[api] Listening on port ${env.PORT}`);

// Graceful shutdown — drain in-flight requests before exiting
async function shutdown(signal: string): Promise<never> {
  console.log(`[api] Received ${signal}, shutting down gracefully...`);
  await server.stop(true); // wait for in-flight requests
  await closeDatabase();
  console.log("[api] Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
process.on("SIGINT",  () => { void shutdown("SIGINT"); });
