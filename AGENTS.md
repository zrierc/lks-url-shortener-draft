# lks-url — URL Shortener Exam Module (Development Build)

## What this project is

A production-grade URL Shortener deployed on AWS (ECS Fargate + RDS + SQS + cache layer).
This is the **fully-completed reference implementation** used as the exam module source.
All application code must be working and deployable to AWS as-is.

## Repository layout (monorepo dev phase)

```
lks-url/
├── infra/   ← Terraform IaC (becomes standalone repo on delivery)
└── app/     ← Application code + Dockerfiles + CI/CD workflows
```

On delivery, the two sub-directories will be pushed as separate GitHub repos.

## Current build target: Batch A (DynamoDB cache)

Batch B (ElastiCache Redis) is deferred. When you see cache-related code:

- **Implement:** DynamoDB path using `@aws-sdk/client-dynamodb`
- **Stub/skip:** Redis path — leave the `if (env.REDIS_URL)` branch returning NoopDriver

## Architecture overview

- **ALB** (public, HTTP:80) → path-based routing → 3 ECS Fargate services
- **shortener-api** (Bun+Hono, :3000) — shorten, redirect, delete
- **analytics-svc** (Bun+Hono, :3001) — SQS consumer + stats API
- **frontend** (nginx:alpine, :80) — React/Vite SPA

ALB routing priority (ORDER IS CRITICAL — wrong order silently breaks stats):
Priority 1 → /api/stats*→ analytics-svc
Priority 2 → /api/* → shortener-api
Default → /\* → frontend

## Naming convention — NEVER deviate

All AWS resource names must use the `lks-url-` prefix exactly.
Wrong names = half points even if provisioned correctly.

Key names (memorize these):

- VPC: lks-url-vpc
- Cluster: lks-url-cluster
- Services: lks-url-api-svc, lks-url-analytics-svc, lks-url-frontend-svc
- Task defs: lks-url-api-td, lks-url-analytics-td, lks-url-frontend-td
- ECR repos: lks-url-shortener-api, lks-url-analytics, lks-url-frontend
- RDS: lks-url-db
- DynamoDB: lks-url-cache-table (Batch A)
- SQS: lks-url-click-events + DLQ: lks-url-click-events-dlq
- ALB: lks-url-alb
- Target groups: lks-url-tg-frontend, lks-url-tg-api, lks-url-tg-analytics
- Security groups: lks-url-alb-sg, lks-url-ecs-sg, lks-url-rds-sg, lks-url-cache-sg

## Network (SPECS.md is authoritative — ignore CONTEXT.md CIDRs)

- VPC CIDR: 172.16.0.0/16
- Public subnets: 172.16.1.0/24 (us-east-1a), 172.16.2.0/24 (us-east-1b)
- Private subnets: 172.16.11.0/24 (us-east-1a), 172.16.12.0/24 (us-east-1b)
- Public: ALB + NAT Gateway
- Private: ECS tasks, RDS, ElastiCache (Batch B, deferred)

## IAM constraint

AWS Academy environment: **no custom IAM roles**.
All ECS task execution role + task role = `LabRole` (hardcoded ARN pattern:
`arn:aws:iam::<account_id>:role/LabRole`)

## Tech stack

- Runtime: Bun >= 1.0
- API framework: Hono + @hono/zod-openapi
- ORM: DrizzleORM (Postgres)
- Validation: Zod
- Frontend: React + Vite + TanStack Router + TanStack Query
- Cache (Batch A): @aws-sdk/client-dynamodb
- Cache (Batch B, deferred): Bun.Redis (native)
- Infrastructure: Terraform >= 1.6
- CI/CD: GitHub Actions
- Containers: Docker multi-stage, final stage on distroless or alpine

## SSM parameters (all under /lks-url/ namespace)

ECS task definitions inject all env vars via SSM `valueFrom` — no plaintext in task JSON.

- /lks-url/db-url SecureString → api, analytics
- /lks-url/sqs-url String → api, analytics
- /lks-url/base-url String → api (set after first terraform apply)
- /lks-url/port-api String → api (value: "3000")
- /lks-url/port-analytics String → analytics (value: "3001")
- /lks-url/dynamodb-table String → api, Batch A only
- /lks-url/dynamodb-region String → api, Batch A only

---

## Keypoints

- if have `package.json` in target, see scripts first
- Always check git state before do changes
- JavaScript/TypeScript related using `bun` (DON'T USE `nodejs` - forget about it)

## Planning Requirements

### Comprehensive Plans Required

- **Always create plan documents** in `docs/plans/<DATE>.md` before implementation
- Before writing plan documents, **always check current date**
- Update plans with user feedback and clarifications
- Include testing strategy in the plan (not as afterthought)
- Keep the conversation and docs in English

### Git Workflow

- **Check git status** before major changes to understand current state
- Update `.gitignore` for new project artifacts before implementation
- Be aware of "ignore all except" patterns in existing `.gitignore` files
