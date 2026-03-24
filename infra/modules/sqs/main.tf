resource "aws_sqs_queue" "dlq" {
  name                      = "lks-url-click-events-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name    = "lks-url-click-events-dlq"
    Project = "lks-url"
  }
}

resource "aws_sqs_queue" "click_events" {
  name                       = "lks-url-click-events"
  visibility_timeout_seconds = 30
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Name    = "lks-url-click-events"
    Project = "lks-url"
  }
}
