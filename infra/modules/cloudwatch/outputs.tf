output "log_group_api" {
  description = "CloudWatch log group name for shortener-api"
  value       = aws_cloudwatch_log_group.api.name
}

output "log_group_analytics" {
  description = "CloudWatch log group name for analytics-svc"
  value       = aws_cloudwatch_log_group.analytics.name
}

output "log_group_frontend" {
  description = "CloudWatch log group name for frontend"
  value       = aws_cloudwatch_log_group.frontend.name
}
