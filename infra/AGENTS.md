# lks-url-infra — Terraform Infrastructure Repo

## Project Overview

This repo provisions ALL AWS infrastructure for the `lks-url` URL shortener app.
The app repo (`lks-url-app`) contains 3 services: `shortener-api`, `analytics-service`, `frontend`.
All resources are deployed on AWS using Terraform >= 1.6 with AWS Provider >= 5.0.

## Architecture Summary

```
Internet → ALB (public subnet) → path-based routing →
  /api/stats*   → analytics-svc  (ECS Fargate, port 3001, private subnet)
  /api/*        → shortener-api  (ECS Fargate, port 3000, private subnet)
  /*            → frontend       (ECS Fargate, port 80,   private subnet)

shortener-api → SQS → analytics-svc (async click event processing)
shortener-api → cache (DynamoDB Batch A / ElastiCache Redis Batch B)
shortener-api + analytics-svc → RDS PostgreSQL 17 (private subnet)
```

## Resource Naming Convention — MUST FOLLOW EXACTLY

All resources use the `lks-url-*` prefix. Incorrect names break application
routing, health checks, and ECS service discovery.

### Network

| Resource             | Name                     |
| -------------------- | ------------------------ |
| VPC                  | lks-url-vpc              |
| Internet Gateway     | lks-url-igw              |
| NAT Gateway          | lks-url-nat              |
| Public Route Table   | lks-url-public-rt        |
| Private Route Table  | lks-url-private-rt       |
| Public Subnet A      | lks-url-public-subnet-a  |
| Public Subnet B      | lks-url-public-subnet-b  |
| Private Subnet A     | lks-url-private-subnet-a |
| Private Subnet B     | lks-url-private-subnet-b |
| ALB Security Group   | lks-url-alb-sg           |
| ECS Security Group   | lks-url-ecs-sg           |
| RDS Security Group   | lks-url-rds-sg           |
| Cache Security Group | lks-url-cache-sg         |

### Compute & Routing

| Resource               | Name                  |
| ---------------------- | --------------------- |
| ECS Cluster            | lks-url-cluster       |
| ALB                    | lks-url-alb           |
| Target Group FE        | lks-url-tg-frontend   |
| Target Group API       | lks-url-tg-api        |
| Target Group Analytics | lks-url-tg-analytics  |
| Task Def Frontend      | lks-url-frontend-td   |
| Task Def API           | lks-url-api-td        |
| Task Def Analytics     | lks-url-analytics-td  |
| ECS Svc Frontend       | lks-url-frontend-svc  |
| ECS Svc API            | lks-url-api-svc       |
| ECS Svc Analytics      | lks-url-analytics-svc |

### Data & Messaging

| Resource            | Name                       |
| ------------------- | -------------------------- |
| RDS Instance        | lks-url-db                 |
| DB Subnet Group     | lks-url-db-subnet-group    |
| SQS Queue           | lks-url-click-events       |
| DynamoDB Table      | lks-url-cache-table        |
| ElastiCache Cluster | lks-url-cache              |
| Cache Subnet Group  | lks-url-cache-subnet-group |

### ECR Repositories

| Resource  | Name                  |
| --------- | --------------------- |
| API       | lks-url-shortener-api |
| Analytics | lks-url-analytics     |
| Frontend  | lks-url-frontend      |

### Observability

| Resource            | Name                       |
| ------------------- | -------------------------- |
| Log Group API       | /ecs/lks-url-shortener-api |
| Log Group Analytics | /ecs/lks-url-analytics     |
| Log Group Frontend  | /ecs/lks-url-frontend      |

## Network CIDR Allocation

```
VPC:              172.16.0.0/16
Public Subnet A:  172.16.1.0/24   (AZ-A)
Public Subnet B:  172.16.2.0/24   (AZ-B)
Private Subnet A: 172.16.11.0/24  (AZ-A)
Private Subnet B: 172.16.12.0/24  (AZ-B)
```

## AWS Academy Constraints — CRITICAL

- NEVER create `aws_iam_role` — IAM role creation is disabled
- Use `LabRole` for ALL ECS task execution role and task role
- LabRole ARN: `arn:aws:iam::${var.aws_account_id}:role/LabRole`
- No ACM, no custom domains, no HTTPS — HTTP only
- Region: us-east-1

## ECS Task Specifications

| Service       | Port | CPU | Memory | Desired |
| ------------- | ---- | --- | ------ | ------- |
| frontend      | 80   | 256 | 512    | 2       |
| shortener-api | 3000 | 512 | 1024   | 2       |
| analytics     | 3001 | 512 | 1024   | 2       |

- Network mode: `awsvpc`
- Launch type: `FARGATE`
- Log driver: `awslogs` → CloudWatch
- All env vars sourced via SSM Parameter Store using `valueFrom`

## ALB Routing — Priority Order Matters

```
Priority 1: /api/stats*  → lks-url-tg-analytics  (MUST be first)
Priority 2: /api/*       → lks-url-tg-api
Default:    /*           → lks-url-tg-frontend
```

Wrong priority causes /api/stats/\* to be misrouted to shortener-api.

## Module Dependency Order

networking → ecr → rds → cache → sqs → ecs → alb → ssm → cloudwatch

Each module outputs values consumed by downstream modules.
Always wire module outputs through root main.tf — never hardcode ARNs or IDs
across module boundaries.

## Terraform Conventions

- All resources must have a `Name` tag matching the resource name in the naming table
- Use `terraform.tfvars` for all environment-specific values
- Remote state in S3 — configured in `backend.tf`
- Output `alb_dns`, `ecr_urls`, `sqs_url` from root `outputs.tf`
- Run `terraform fmt` before committing
- Run `terraform validate` before pushing
