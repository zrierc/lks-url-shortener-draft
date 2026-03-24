variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "cache_type" {
  description = "Cache backend type: 'dynamodb' or 'redis'"
  type        = string
}

variable "db_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "sqs_url" {
  description = "SQS queue URL"
  type        = string
}

variable "dynamodb_table_name" {
  description = "DynamoDB cache table name (Batch A)"
  type        = string
  default     = ""
}

variable "redis_endpoint" {
  description = "ElastiCache Redis endpoint host:port (Batch B)"
  type        = string
  default     = ""
}
