# lks-url — app

Application monorepo for the lks-url URL Shortener. Contains three services deployed as ECS Fargate containers behind a single ALB.

---

## Services

| Service | Directory | Port | Description |
| --- | --- | --- | --- |
| **shortener-api** | `app/api/` | 3000 | URL creation, short-link redirect, delete |
| **analytics-service** | `app/analytics/` | 3001 | SQS consumer + click stats API |
| **frontend** | `app/frontend/` | 80 | React SPA served by nginx |

See each service's `README.md` for setup and API details.

---

## Run with Docker Compose

From the **repository root** (not from this directory):

```bash
docker compose up --build
```

| Service | Local URL |
| --- | --- |
| Frontend | http://localhost:8080 |
| shortener-api | http://localhost:3000 |
| analytics-service | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| LocalStack (SQS + DynamoDB) | http://localhost:4566 |

To stop and remove containers:

```bash
docker compose down
```
