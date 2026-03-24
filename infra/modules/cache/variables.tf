variable "cache_type" {
  description = "Cache backend type: 'dynamodb' (Batch A) or 'redis' (Batch B)"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for ElastiCache subnet group (Batch B)"
  type        = list(string)
}

variable "cache_sg_id" {
  description = "Security group ID for cache resources"
  type        = string
}
