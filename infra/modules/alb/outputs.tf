output "alb_dns" {
  description = "ALB DNS name"
  value       = aws_lb.main.dns_name
}

output "tg_frontend_arn" {
  description = "Target group ARN for frontend"
  value       = aws_lb_target_group.frontend.arn
}

output "tg_api_arn" {
  description = "Target group ARN for shortener-api"
  value       = aws_lb_target_group.api.arn
}

output "tg_analytics_arn" {
  description = "Target group ARN for analytics-svc"
  value       = aws_lb_target_group.analytics.arn
}
