resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/lks-url-shortener-api"
  retention_in_days = 7

  tags = {
    Name    = "/ecs/lks-url-shortener-api"
    Project = "lks-url"
  }
}

resource "aws_cloudwatch_log_group" "analytics" {
  name              = "/ecs/lks-url-analytics"
  retention_in_days = 7

  tags = {
    Name    = "/ecs/lks-url-analytics"
    Project = "lks-url"
  }
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/lks-url-frontend"
  retention_in_days = 7

  tags = {
    Name    = "/ecs/lks-url-frontend"
    Project = "lks-url"
  }
}
