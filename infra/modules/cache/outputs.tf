output "dynamodb_table_name" {
  description = "DynamoDB cache table name (Batch A)"
  value       = var.cache_type == "dynamodb" ? aws_dynamodb_table.cache[0].name : ""
}

output "redis_endpoint" {
  description = "ElastiCache Redis primary endpoint (Batch B)"
  value       = var.cache_type == "redis" ? "${aws_elasticache_cluster.redis[0].cache_nodes[0].address}:6379" : ""
}
