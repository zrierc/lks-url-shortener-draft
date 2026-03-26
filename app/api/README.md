# shortener-api

Core service of the lks-url URL Shortener. Handles URL creation, short-link redirects, URL deletion, and exposes a health endpoint. Publishes click events to SQS for async analytics processing. Supports DynamoDB (Batch A) or Redis (Batch B) as a cache layer on the redirect hot path.

---

## Tech Stack

shortener-api uses a number of technologies to work properly:

- [Bun](https://bun.sh) - fast all-in-one JavaScript runtime and toolkit
- [TypeScript](https://www.typescriptlang.org) - typed JavaScript at any scale
- [Hono](https://hono.dev) - lightweight web framework for the edge
- [DrizzleORM](https://orm.drizzle.team) - TypeScript ORM with SQL-first approach
- [Zod](https://zod.dev) - TypeScript-first schema validation
- [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) - OpenAPI + Zod integration for Hono
- [nanoid](https://github.com/ai/nanoid) - tiny, secure, URL-friendly unique ID generator
- [AWS SDK v3 — DynamoDB](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/) - AWS DynamoDB client for cache layer
- [AWS SDK v3 — SQS](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/) - AWS SQS client for publishing click events
- [PostgreSQL](https://www.postgresql.org) - advanced open source relational database

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) v22 or [Bun](https://bun.sh) v1
- PostgreSQL 17 running locally (or via Docker Compose: `docker compose up -d postgres`)
- LocalStack or real AWS credentials for SQS and DynamoDB

### Setup

```bash
# 1. Install dependencies
bun install

# 2. Copy and configure env
cp .env.example .env
# Edit .env — set DATABASE_URL, SQS_URL, BASE_URL, and cache vars

# 3. Run database migrations
bun run db:migrate

# 4. Start development server (with hot reload)
bun run dev
```

Server starts at `http://localhost:3000`.  
Swagger UI: `http://localhost:3000/api/docs`

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

| Variable                | Required | Default       | Description                                                              |
| ----------------------- | -------- | ------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`          | Yes      | —             | PostgreSQL connection string                                             |
| `SQS_URL`               | Yes      | —             | SQS queue URL for publishing click events                                |
| `BASE_URL`              | Yes      | —             | Base URL for building short links (e.g. `http://alb-dns`)                |
| `PORT`                  | No       | `3000`        | HTTP listen port                                                         |
| `APP_ENV`               | No       | `development` | `development`, `production`, or `test`                                   |
| `DYNAMODB_TABLE`        | No       | —             | DynamoDB table name — activates Batch A cache driver                     |
| `DYNAMODB_REGION`       | No       | —             | AWS region for DynamoDB (required if `DYNAMODB_TABLE` is set)            |
| `DYNAMODB_ENDPOINT`     | No       | —             | Override DynamoDB endpoint (e.g. `http://localhost:4566` for LocalStack) |
| `REDIS_URL`             | No       | —             | Redis connection URL — activates Batch B cache driver                    |
| `AWS_ACCESS_KEY_ID`     | No       | —             | AWS access key (not needed on ECS — LabRole is used)                     |
| `AWS_SECRET_ACCESS_KEY` | No       | —             | AWS secret key (not needed on ECS)                                       |
| `AWS_DEFAULT_REGION`    | No       | `us-east-1`   | Default AWS region                                                       |

**Cache driver selection (evaluated at startup):**

- `DYNAMODB_TABLE` + `DYNAMODB_REGION` both set → DynamoDB driver (Batch A)
- `REDIS_URL` set → Redis driver (Batch B)
- Neither set → no-op driver (caching disabled — suitable for local dev without cache)

On production ECS, all variables are injected from SSM Parameter Store via `valueFrom`.

---

## API Reference

All responses follow the `ApiResponse<T>` envelope:

```json
{ "success": true, "data": { ... }, "timestamp": "2026-03-26T10:00:00.000Z" }
{ "success": false, "error": "Short code not found", "timestamp": "..." }
```

OpenAPI spec: `GET /api/docs` (Swagger UI) · `GET /api/openapi.json`

---

### `POST /api/shorten`

Shorten a URL. Generates a 6-character nanoid, persists to PostgreSQL, returns the short link.

**Request:**

```json
{ "url": "https://example.com/very/long/url" }
```

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "code": "ab1234",
    "short_url": "http://<BASE_URL>/s/ab1234",
    "original_url": "https://example.com/very/long/url",
    "created_at": "2026-03-26T10:00:00.000Z"
  }
}
```

---

### `GET /api/shorten`

Paginated, filterable list of all shortened URLs.

**Query params:** `q` (search), `sort`, `order` (`asc`/`desc`), `page`, `limit`

---

### `GET /s/:code`

Resolve a short code. Cache-aside lookup → RDS fallback on miss → publishes click event to SQS → `301 Moved Permanently`.

**Response `301`:** `Location: <original_url>`  
**Response `404`:** Short code not found.

---

### `DELETE /api/url/:code`

Delete a short URL from the database and invalidate the cache entry.

**Response `200`:**

```json
{ "success": true, "data": { "code": "ab1234" } }
```

---

### `GET /api/health`

Live dependency status. Pings PostgreSQL (`SELECT 1`) and the active cache driver.

**Response `200`:**

```json
{
  "status": "ok",
  "timestamp": "2026-03-26T10:00:00.000Z",
  "services": {
    "postgres": { "status": "ok", "latency_ms": 4 },
    "dynamodb": { "status": "ok", "latency_ms": 12 }
  }
}
```

Returns HTTP `503` when `status` is `degraded` or `error`. The cache key is `dynamodb` (Batch A) or `redis` (Batch B).

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
docker build -t lks-url-shortener-api .
docker run -p 3000:3000 --env-file .env lks-url-shortener-api
```

**Deploy to AWS:**

Push any change under `app/api/` to the `main` branch. The `deploy-api.yml` GitHub Actions workflow builds the image, pushes to ECR (`lks-url-shortener-api`), and forces a new ECS deployment on `lks-url-api-svc` automatically.

---

## References

- [Bun documentation](https://bun.sh/docs)
- [Hono documentation](https://hono.dev/docs)
- [DrizzleORM documentation](https://orm.drizzle.team/docs/overview)
- [Zod documentation](https://zod.dev)
- [AWS SDK v3 — DynamoDB client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/)
- [AWS SDK v3 — SQS client](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/)
- [GitHub Actions — `actions/checkout`](https://github.com/actions/checkout)
- [GitHub Actions — `aws-actions/configure-aws-credentials`](https://github.com/aws-actions/configure-aws-credentials)
- [GitHub Actions — `aws-actions/amazon-ecr-login`](https://github.com/aws-actions/amazon-ecr-login)
- [Amazon ECS — update-service CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html)
- [Amazon DynamoDB — developer guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
