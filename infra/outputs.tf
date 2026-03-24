output "alb_dns" {
  description = "ALB DNS name — use this to update /lks-url/base-url after apply"
  value       = module.alb.alb_dns
}

output "ecr_api_url" {
  description = "ECR repository URL for shortener-api"
  value       = module.ecr.api_ecr_url
}

output "ecr_analytics_url" {
  description = "ECR repository URL for analytics-svc"
  value       = module.ecr.analytics_ecr_url
}

output "ecr_frontend_url" {
  description = "ECR repository URL for frontend"
  value       = module.ecr.frontend_ecr_url
}

output "sqs_url" {
  description = "SQS click events queue URL"
  value       = module.sqs.queue_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.rds.db_endpoint
  sensitive   = true
}
