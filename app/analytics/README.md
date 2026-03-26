# analytics-service

Async click analytics service for lks-url. Consumes click events from SQS, enriches them with geolocation and user-agent data, persists aggregated stats to PostgreSQL, and exposes a REST API for querying per-code stats and a paginated leaderboard.

---

## Tech Stack

analytics-service uses a number of technologies to work properly:

- [Bun](https://bun.sh) - fast all-in-one JavaScript runtime and toolkit
- [TypeScript](https://www.typescriptlang.org) - typed JavaScript at any scale
- [Hono](https://hono.dev) - lightweight web framework for the edge
- [DrizzleORM](https://orm.drizzle.team) - TypeScript ORM with SQL-first approach
- [Zod](https://zod.dev) - TypeScript-first schema validation
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) - OpenAPI + Zod integration for Hono
- [geoip-lite](https://github.com/geoip-lite/node-geoip) - IP address to geolocation lookup
- [ua-parser-js](https://github.com/faisalman/ua-parser-js) - user-agent string parser for device/OS/browser detection
- [AWS SDK v3 — SQS](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/) - AWS SQS client for consuming click events
- [PostgreSQL](https://www.postgresql.org) - advanced open source relational database

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v22 or [Bun](https://bun.sh) v1
- PostgreSQL 17 running locally (or via Docker Compose: `docker compose up -d postgres`)
- LocalStack or real AWS credentials for SQS

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy and configure env
cp .env.example .env
# Edit .env — set DATABASE_URL and SQS_URL

# 3. Run database migrations
bun run db:migrate

# 4. Start development server (with hot reload)
bun run dev
```

Server starts at `http://localhost:3001`.  
Swagger UI: `http://localhost:3001/api/docs`

The SQS consumer loop starts automatically at boot alongside the HTTP server.

---

## Running with Node.js

> [!NOTE]
> Bun is the primary and recommended runtime. The scripts above assume Bun.
> If you prefer Node.js v22, the following adjustments are required.

**1. Install `tsx` for TypeScript execution:**

```bash
npm install -D tsx
```

**2. Update `package.json` scripts:**

Replace the Bun-specific scripts with Node.js equivalents:

```json
"scripts": {
  "dev":         "tsx --watch src/index.ts",
  "start":       "tsx src/index.ts",
  "db:generate": "npx drizzle-kit generate",
  "db:migrate":  "npx drizzle-kit migrate",
  "db:push":     "npx drizzle-kit push",
  "typecheck":   "tsc --noEmit"
}
```

> [!WARNING]
> The `build` script (`bun build --compile --target bun`) produces a Bun-native binary and
> cannot be replicated with Node.js. Skip this script — use `npm run start` (via `tsx`) for
> local execution instead.

**3. Update `tsconfig.json`:**

Remove `"bun-types"` from the `types` array and add `"@types/node"`:

```bash
npm install -D @types/node
```

```json
{
  "compilerOptions": {
    "types": ["@types/node"]
  }
}
```

**4. Install dependencies and run:**

```bash
npm install
npm run db:migrate
npm run dev
```

All other commands (`db:generate`, `db:push`, `typecheck`) work the same way with `npm run <command>` after the changes above.

---

## Environment Variables

| Variable                | Required | Default       | Description                                          |
| ----------------------- | -------- | ------------- | ---------------------------------------------------- |
| `DATABASE_URL`          | Yes      | —             | PostgreSQL connection string                         |
| `SQS_URL`               | Yes      | —             | SQS queue URL to poll for click events               |
| `PORT`                  | No       | `3001`        | HTTP listen port                                     |
| `APP_ENV`               | No       | `development` | `development`, `production`, or `test`               |
| `AWS_ACCESS_KEY_ID`     | No       | —             | AWS access key (not needed on ECS — LabRole is used) |
| `AWS_SECRET_ACCESS_KEY` | No       | —             | AWS secret key (not needed on ECS)                   |
| `AWS_DEFAULT_REGION`    | No       | `us-east-1`   | Default AWS region                                   |

On production ECS, all variables are injected from SSM Parameter Store via `valueFrom`.

---

## API Reference

All responses follow the `ApiResponse<T>` envelope:

```json
{ "success": true, "data": { ... }, "timestamp": "2026-03-26T10:00:00.000Z" }
{ "success": false, "error": "Code not found", "timestamp": "..." }
```

OpenAPI spec: `GET /api/docs` (Swagger UI) · `GET /api/openapi.json`

---

### `GET /api/stats/:code`

Full click analytics for a single short code.

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "code": "ab1234",
    "original_url": "https://example.com/very/long/url",
    "click_count": 42,
    "last_clicked": "2026-03-26T09:55:00.000Z",
    "clicks_over_time": [
      { "date": "2026-03-25", "count": 10 },
      { "date": "2026-03-26", "count": 32 }
    ],
    "by_device": [
      { "device_type": "desktop", "count": 28 },
      { "device_type": "mobile", "count": 14 }
    ],
    "by_os": [
      { "os": "Windows", "count": 20 },
      { "os": "macOS", "count": 8 }
    ],
    "by_browser": [
      { "browser": "Chrome", "count": 35 },
      { "browser": "Firefox", "count": 7 }
    ],
    "by_country": [
      { "country": "US", "count": 30 },
      { "country": "ID", "count": 12 }
    ]
  }
}
```

**Response `404`:** Short code not found.

All chart arrays (`clicks_over_time`, `by_device`, `by_os`, `by_browser`, `by_country`) are aggregated from `click_log` with `GROUP BY`. `original_url` is fetched directly from the `urls` table in the same RDS instance (no HTTP call to shortener-api).

---

### `GET /api/stats`

Paginated, filterable leaderboard of most-clicked URLs.

**Query params:**

| Param   | Type         | Default       | Description                     |
| ------- | ------------ | ------------- | ------------------------------- |
| `q`     | string       | —             | Search filter (matches on code) |
| `from`  | ISO date     | —             | Filter clicks after this date   |
| `to`    | ISO date     | —             | Filter clicks before this date  |
| `sort`  | string       | `click_count` | Field to sort by                |
| `order` | `asc`/`desc` | `desc`        | Sort direction                  |
| `page`  | number       | `1`           | Page number                     |
| `limit` | number       | `10`          | Items per page                  |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "code": "ab1234",
        "click_count": 42,
        "last_clicked": "2026-03-26T09:55:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "total_pages": 10
  }
}
```

---

### `GET /api/health`

Live dependency check. Pings PostgreSQL and SQS and reports latency.

**Response `200`:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-26T10:00:00.000Z",
  "services": {
    "postgres": { "status": "ok", "latency_ms": 3 },
    "sqs": { "status": "ok", "latency_ms": 18 }
  }
}
```

Returns HTTP `503` when `status` is `degraded` or `error`. SQS health check uses `GetQueueAttributes`; failure returns `{ "status": "error", "latency_ms": -1 }`.

---

## SQS Consumer

The consumer starts at app boot as a background loop (fire-and-forget, does not block the HTTP server). It uses SQS long polling (20s wait, up to 10 messages per receive) with a 5-second back-off on error.

**Per-message processing:**

1. Parse + validate the `ClickEvent` JSON body with Zod
2. Resolve IP → `{ country, city }` via `geoip-lite`
3. Parse `user_agent` → `{ device_type, os, browser }` via `ua-parser-js`
4. Upsert `url_stats` (`click_count + 1`, `last_clicked = NOW()`)
5. Insert into `click_log`
6. Delete message from SQS

**ClickEvent shape (sent by shortener-api):**

```typescript
{
  code: string;
  clicked_at: string; // ISO 8601
  ip: string;
  user_agent: string;
  referrer: string;
}
```

---

## Commands

| Command               | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `bun run dev`         | Start with hot reload (`--watch`)                       |
| `bun run start`       | Start in interpretive mode (local use)                  |
| `bun run build`       | Compile to single binary at `./dist/server`             |
| `bun run db:generate` | Generate a new DrizzleORM migration from schema changes |
| `bun run db:migrate`  | Apply pending migrations to the database                |
| `bun run db:push`     | Push schema directly without migration files (dev only) |
| `bun run typecheck`   | Run TypeScript type checking without emitting           |

**Build Docker image:**

```bash
docker build -t lks-url-analytics .
docker run -p 3001:3001 --env-file .env lks-url-analytics
```

> **Note:** The Docker image copies `node_modules/geoip-lite/data` explicitly because `bun build --compile` does not bundle binary data files.

**Deploy to AWS:**

Push any change under `app/analytics/` to the `main` branch. The `deploy-analytics.yml` GitHub Actions workflow builds the image, pushes to ECR (`lks-url-analytics`), and forces a new ECS deployment on `lks-url-analytics-svc` automatically.

---

## References

- [Bun documentation](https://bun.sh/docs)
- [Hono documentation](https://hono.dev/docs)
- [DrizzleORM documentation](https://orm.drizzle.team/docs/overview)
- [Zod documentation](https://zod.dev)
- [geoip-lite — npm](https://www.npmjs.com/package/geoip-lite)
- [ua-parser-js — npm](https://www.npmjs.com/package/ua-parser-js)
- [AWS SDK v3 — SQS client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/)
- [Amazon SQS — long polling guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html)
- [GitHub Actions — `actions/checkout`](https://github.com/actions/checkout)
- [GitHub Actions — `aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials)
- [GitHub Actions — `aws-actions/amazon-ecr-login`](https://github.com/aws-actions/amazon-ecr-login)
- [Amazon ECS — update-service CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html)
