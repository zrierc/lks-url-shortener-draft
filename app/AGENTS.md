# lks-url-app — Application Monorepo

## Project Overview

Monorepo containing 3 services for the `lks-url` URL shortener:

- `api/` — shortener-api: core redirect + shorten logic (Bun + Hono, port 3000)
- `analytics/` — analytics-service: async click processing + stats API (Bun + Hono, port 3001)
- `frontend/` — React SPA served by nginx (port 80)

All services run as ECS Fargate tasks behind a single ALB in `lks-url-infra`.
Infrastructure is fully managed in the separate `lks-url-infra` repo.

---

## Architecture Context

```
ALB (lks-url-alb)
  │
  ├─ /api/stats*  → analytics-svc :3001   (priority 1)
  ├─ /api/*       → shortener-api :3000   (priority 2)
  └─ /*           → frontend      :80     (default)

shortener-api ──push──► SQS (lks-url-click-events) ◄──poll── analytics-svc
shortener-api ◄──────► Cache (DynamoDB or Redis)
shortener-api + analytics-svc ◄──────► RDS PostgreSQL 17 (urlshortener db)
```

---

## Runtime & Language

- **All services**: Bun latest stable, TypeScript strict mode
- **Backend framework**: Hono (api + analytics)
- **ORM**: DrizzleORM with `drizzle-kit` for migrations (api + analytics)
- **Frontend**: React 19, Vite, TanStack Router, TanStack Query, Recharts, TailwindCSS v4, ShadCN

---

## Environment Variables — SSM Injection

All runtime config comes from SSM Parameter Store, injected by ECS at container startup.
**Never read from `.env` files at runtime. Never hardcode values.**
Each service's `env.ts` resolves vars from `process.env` (already injected by ECS).

| Env Var           | SSM Parameter                           | Services           |
| ----------------- | --------------------------------------- | ------------------ |
| `DATABASE_URL`    | `/lks-url/db-url`                       | api, analytics     |
| `SQS_URL`         | `/lks-url/sqs-url`                      | api, analytics     |
| `BASE_URL`        | `/lks-url/base-url`                     | api                |
| `PORT`            | `/lks-url/port-api` or `port-analytics` | api, analytics     |
| `DYNAMODB_TABLE`  | `/lks-url/dynamodb-table`               | api (Batch A only) |
| `DYNAMODB_REGION` | `/lks-url/dynamodb-region`              | api (Batch A only) |
| `REDIS_URL`       | `/lks-url/redis-url`                    | api (Batch B only) |

---

## Shared Response Envelope

All API endpoints return this wrapper — no exceptions:

```typescript
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
};
```

Success:

```json
{ "success": true, "data": { ... }, "timestamp": "2025-03-10T10:30:00Z" }
```

Error:

```json
{
  "success": false,
  "error": "Short code not found",
  "timestamp": "2025-03-10T10:30:00Z"
}
```

---

## Cross-Service Contracts

### shortener-api → SQS (click event message)

```typescript
type ClickEvent = {
  code: string;
  clicked_at: string; // ISO 8601
  ip: string;
  user_agent: string;
  referrer: string;
};
```

### analytics-svc → RDS (what gets written per click)

```typescript
// url_stats: upserted
{ code, click_count: +1, last_clicked: now }

// click_log: inserted
{ code, clicked_at, ip, country, city, device_type, os, browser, referrer }
```

### frontend → API (HTTP calls via TanStack Query)

```
POST /api/shorten    body: { url: string }
GET  /api/stats/:code
GET  /api/stats
GET  /api/health     (shortener-api)
GET  /api/health     (analytics-svc, via /api/stats* routing)
```

---

## PostgreSQL Schema

### `urls` table (owned by api)

```sql
CREATE TABLE urls (
  id         SERIAL       PRIMARY KEY,
  code       VARCHAR(10)  UNIQUE NOT NULL,
  original   TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### `url_stats` table (owned by analytics)

```sql
CREATE TABLE url_stats (
  code         VARCHAR(10)  PRIMARY KEY,
  click_count  INTEGER      NOT NULL DEFAULT 0,
  last_clicked TIMESTAMPTZ
);
```

### `click_log` table (owned by analytics)

```sql
CREATE TABLE click_log (
  id          BIGSERIAL    PRIMARY KEY,
  code        VARCHAR(10)  NOT NULL,
  clicked_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ip          VARCHAR(45),
  country     VARCHAR(8),
  city        VARCHAR(128),
  device_type VARCHAR(16),
  os          VARCHAR(64),
  browser     VARCHAR(64),
  referrer    TEXT
);
```

---

## Infra Boundary

- This repo contains **zero Terraform** — all infra is in `lks-url-infra`
- Load the `infra-interface` skill to understand what infra exposes
- If a new AWS resource is needed (e.g. new SQS queue), that change
  goes in `lks-url-infra`, not here

---

## Git & CI/CD

- GitHub Actions in `.github/workflows/` — one workflow per service
- Each workflow triggers only on changes to its service directory:
  - `deploy-api.yml` → `paths: [api/**]`
  - `deploy-analytics.yml` → `paths: [analytics/**]`
  - `deploy-frontend.yml` → `paths: [frontend/**]`
- Each workflow: ECR login → Docker build+push (:latest + :<git-sha>) → ECS force redeploy
- Required secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_SESSION_TOKEN`, `AWS_REGION`, `AWS_ACCOUNT_ID`

---

## Code Quality Rules

- TypeScript strict mode — no `any`, no untyped returns
- Zod for all external input validation (request bodies, env vars, SQS messages)
- All async functions must handle errors — no unhandled promise rejections
- DrizzleORM for all DB access — no raw SQL unless Drizzle cannot express it
- `bun test` must pass before pushing
