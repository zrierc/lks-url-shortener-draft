output "api_ecr_url" {
  value = aws_ecr_repository.api.repository_url
}

output "analytics_ecr_url" {
  value = aws_ecr_repository.analytics.repository_url
}

output "frontend_ecr_url" {
  value = aws_ecr_repository.frontend.repository_url
}
