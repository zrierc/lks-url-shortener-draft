resource "aws_ssm_parameter" "db_url" {
  name  = "/lks-url/db-url"
  type  = "SecureString"
  value = var.db_url

  tags = {
    Name    = "/lks-url/db-url"
    Project = "lks-url"
  }
}

resource "aws_ssm_parameter" "sqs_url" {
  name  = "/lks-url/sqs-url"
  type  = "String"
  value = var.sqs_url

  tags = {
    Name    = "/lks-url/sqs-url"
    Project = "lks-url"
  }
}

# base-url is set to a placeholder on first apply; updated manually post-deploy
resource "aws_ssm_parameter" "base_url" {
  name  = "/lks-url/base-url"
  type  = "String"
  value = "http://placeholder"

  lifecycle {
    # Prevent Terraform from overwriting the value after the initial apply
    ignore_changes = [value]
  }

  tags = {
    Name    = "/lks-url/base-url"
    Project = "lks-url"
  }
}

resource "aws_ssm_parameter" "port_api" {
  name  = "/lks-url/port-api"
  type  = "String"
  value = "3000"

  tags = {
    Name    = "/lks-url/port-api"
    Project = "lks-url"
  }
}

resource "aws_ssm_parameter" "port_analytics" {
  name  = "/lks-url/port-analytics"
  type  = "String"
  value = "3001"

  tags = {
    Name    = "/lks-url/port-analytics"
    Project = "lks-url"
  }
}

# Batch A: DynamoDB table name
resource "aws_ssm_parameter" "dynamodb_table" {
  count = var.cache_type == "dynamodb" ? 1 : 0
  name  = "/lks-url/dynamodb-table"
  type  = "String"
  value = var.dynamodb_table_name

  tags = {
    Name    = "/lks-url/dynamodb-table"
    Project = "lks-url"
  }
}

# Batch A: DynamoDB region
resource "aws_ssm_parameter" "dynamodb_region" {
  count = var.cache_type == "dynamodb" ? 1 : 0
  name  = "/lks-url/dynamodb-region"
  type  = "String"
  value = var.aws_region

  tags = {
    Name    = "/lks-url/dynamodb-region"
    Project = "lks-url"
  }
}

# Batch B: Redis URL
resource "aws_ssm_parameter" "redis_url" {
  count = var.cache_type == "redis" ? 1 : 0
  name  = "/lks-url/redis-url"
  type  = "String"
  value = var.redis_endpoint

  tags = {
    Name    = "/lks-url/redis-url"
    Project = "lks-url"
  }
}
