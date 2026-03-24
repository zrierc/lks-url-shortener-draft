variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "lab_role_arn" {
  description = "LabRole ARN for ECS task execution and task role"
  type        = string
}

variable "cluster_name" {
  description = "ECS cluster name"
  type        = string
  default     = "lks-url-cluster"
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ECS tasks"
  type        = list(string)
}

variable "ecs_sg_id" {
  description = "Security group ID for ECS tasks"
  type        = string
}

variable "tg_frontend_arn" {
  description = "Target group ARN for frontend"
  type        = string
}

variable "tg_api_arn" {
  description = "Target group ARN for shortener-api"
  type        = string
}

variable "tg_analytics_arn" {
  description = "Target group ARN for analytics-svc"
  type        = string
}

variable "ecr_api_url" {
  description = "ECR repository URL for shortener-api"
  type        = string
}

variable "ecr_analytics_url" {
  description = "ECR repository URL for analytics-svc"
  type        = string
}

variable "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  type        = string
}

variable "cache_type" {
  description = "Cache backend type: 'dynamodb' or 'redis'"
  type        = string
}

variable "ssm_db_url_arn" {
  description = "SSM ARN for /lks-url/db-url"
  type        = string
}

variable "ssm_sqs_url_arn" {
  description = "SSM ARN for /lks-url/sqs-url"
  type        = string
}

variable "ssm_base_url_arn" {
  description = "SSM ARN for /lks-url/base-url"
  type        = string
}

variable "ssm_port_api_arn" {
  description = "SSM ARN for /lks-url/port-api"
  type        = string
}

variable "ssm_port_analytics_arn" {
  description = "SSM ARN for /lks-url/port-analytics"
  type        = string
}

variable "ssm_dynamodb_table_arn" {
  description = "SSM ARN for /lks-url/dynamodb-table (Batch A)"
  type        = string
  default     = ""
}

variable "ssm_dynamodb_region_arn" {
  description = "SSM ARN for /lks-url/dynamodb-region (Batch A)"
  type        = string
  default     = ""
}

variable "ssm_redis_url_arn" {
  description = "SSM ARN for /lks-url/redis-url (Batch B)"
  type        = string
  default     = ""
}

variable "log_group_api" {
  description = "CloudWatch log group name for shortener-api"
  type        = string
}

variable "log_group_analytics" {
  description = "CloudWatch log group name for analytics-svc"
  type        = string
}

variable "log_group_frontend" {
  description = "CloudWatch log group name for frontend"
  type        = string
}
