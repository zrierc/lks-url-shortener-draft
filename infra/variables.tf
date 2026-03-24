variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
}

variable "cache_type" {
  description = "Cache backend type: 'dynamodb' (Batch A) or 'redis' (Batch B)"
  type        = string
  default     = "dynamodb"

  validation {
    condition     = contains(["dynamodb", "redis"], var.cache_type)
    error_message = "cache_type must be 'dynamodb' or 'redis'."
  }
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "urlshortener"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}
