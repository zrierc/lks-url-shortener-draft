# lks-url-infra

Terraform IaC for the lks-url URL Shortener. Provisions all AWS infrastructure — VPC, ECS Fargate services, RDS, DynamoDB, SQS, ALB, ECR, SSM parameters, and CloudWatch log groups — in a single `terraform apply`.

---

## Tech Stack

lks-url-infra uses a number of technologies to work properly:

- [Terraform](https://www.terraform.io) - infrastructure as code tool for cloud provisioning
- [AWS Provider for Terraform](https://registry.terraform.io/providers/hashicorp/aws/latest) - HashiCorp AWS provider (~> 5.0)
- [Amazon ECS Fargate](https://aws.amazon.com/ecs/) - serverless container execution for all three services
- [Amazon RDS (PostgreSQL 17)](https://aws.amazon.com/rds/) - managed relational database
- [Amazon DynamoDB](https://aws.amazon.com/dynamodb/) - managed NoSQL cache layer (Batch A)
- [Amazon SQS](https://aws.amazon.com/sqs/) - managed message queue for async click event processing
- [Amazon ALB](https://aws.amazon.com/elasticloadbalancing/) - application load balancer with priority-based path routing
- [Amazon ECR](https://aws.amazon.com/ecr/) - container image registry for all three service images
- [AWS SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/parameter-store/) - secure runtime configuration injected into ECS task definitions

---

## Getting Started

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.6
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured with a valid session
- Active AWS Academy lab session (credentials expire — re-export before each apply)
- S3 bucket `lks-url-tfstate-dami` must exist in `us-east-1` before running `terraform init`

### Setup

```bash
# 1. Copy the example tfvars and fill in required values
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set aws_account_id and db_password

# 2. Initialize Terraform (downloads providers, configures S3 backend)
terraform init

# 3. Preview changes
terraform plan

# 4. Provision infrastructure
terraform apply
```

> [!IMPORTANT]
> After the first `terraform apply`, you must update the `/lks-url/base-url` SSM parameter
> with the ALB DNS name. Until this is done, `POST /api/shorten` will return incorrect
> `short_url` values. See [Post-Deploy Steps](#post-deploy-steps) below.

---

## Variables

| Variable         | Required | Default        | Description                                              |
| ---------------- | -------- | -------------- | -------------------------------------------------------- |
| `aws_account_id` | Yes      | —              | AWS account ID                                           |
| `db_password`    | Yes      | —              | RDS master password (sensitive)                          |
| `aws_region`     | No       | `us-east-1`    | AWS region to deploy into                                |
| `cache_type`     | No       | `dynamodb`     | Cache backend: `dynamodb` (Batch A) or `redis` (Batch B) |
| `db_username`    | No       | `urlshortener` | RDS master username                                      |

---

## Modules

- **`networking`** — VPC (`172.16.0.0/16`), 2 public + 2 private subnets across 2 AZs, IGW, NAT gateway, and 4 security groups (`alb`, `ecs`, `rds`, `cache`)
- **`ecr`** — 3 ECR repositories: `lks-url-shortener-api`, `lks-url-analytics`, `lks-url-frontend`
- **`cloudwatch`** — 3 CloudWatch log groups for ECS service stdout (7-day retention)
- **`rds`** — RDS PostgreSQL 17 (`db.t3.micro`) in private subnets, `urlshortener` database
- **`cache`** — Conditional on `cache_type`: DynamoDB table `lks-url-cache-table` (Batch A) or ElastiCache Redis `cache.t3.micro` (Batch B)
- **`sqs`** — SQS queue `lks-url-click-events` + DLQ `lks-url-click-events-dlq`
- **`alb`** — ALB `lks-url-alb`, HTTP listener on port 80, 3 target groups, priority-ordered listener rules (`/api/stats*` → analytics, `/api/*` → api, `/s/*` → api, default → frontend)
- **`ssm`** — All SSM parameters under `/lks-url/` namespace, referenced by ECS task definitions via `valueFrom`
- **`ecs`** — ECS cluster `lks-url-cluster`, 3 Fargate task definitions (`lks-url-api-td`, `lks-url-analytics-td`, `lks-url-frontend-td`), and 3 services wired to ALB target groups

> [!NOTE]
> AWS Academy environments do not allow creating custom IAM roles. All ECS task execution
> and task roles are hardcoded to the pre-existing `LabRole`
> (`arn:aws:iam::<account_id>:role/LabRole`).

---

## Outputs

| Output              | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `alb_dns`           | ALB DNS name — needed for the post-deploy base-url SSM update |
| `ecr_api_url`       | ECR repository URL for shortener-api                          |
| `ecr_analytics_url` | ECR repository URL for analytics-svc                          |
| `ecr_frontend_url`  | ECR repository URL for frontend                               |
| `sqs_url`           | SQS click events queue URL                                    |
| `rds_endpoint`      | RDS PostgreSQL endpoint (sensitive — redacted in plan output) |

---

## Post-Deploy Steps

After the first `terraform apply`, retrieve the ALB DNS output and write it to the SSM parameter used by shortener-api:

```bash
# Get the ALB DNS name
terraform output alb_dns

# Update the base-url SSM parameter
aws ssm put-parameter \
  --name "/lks-url/base-url" \
  --value "http://<alb_dns>" \
  --type String \
  --overwrite
```

Then force a redeployment of `lks-url-api-svc` so it picks up the new value:

```bash
aws ecs update-service \
  --cluster lks-url-cluster \
  --service lks-url-api-svc \
  --force-new-deployment
```

---

## Commands

| Command                    | Description                                   |
| -------------------------- | --------------------------------------------- |
| `terraform init`           | Initialize providers and configure S3 backend |
| `terraform plan`           | Preview what changes will be made             |
| `terraform apply`          | Provision or update infrastructure            |
| `terraform destroy`        | Tear down all managed resources               |
| `terraform output`         | Print all root-level outputs                  |
| `terraform output alb_dns` | Print just the ALB DNS name                   |

---

## References

- [Terraform documentation](https://developer.hashicorp.com/terraform/docs)
- [AWS Provider documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Amazon ECS — task definition reference](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html)
- [Amazon RDS — PostgreSQL guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Amazon DynamoDB — developer guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- [Amazon SQS — developer guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/)
- [AWS SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [GitHub Actions — `hashicorp/setup-terraform`](https://github.com/hashicorp/setup-terraform)
- [Amazon ECS — update-service CLI reference](https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html)
