output "queue_url" {
  description = "SQS click events queue URL"
  value       = aws_sqs_queue.click_events.url
}

output "queue_arn" {
  description = "SQS click events queue ARN"
  value       = aws_sqs_queue.click_events.arn
}
