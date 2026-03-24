# Batch A: DynamoDB table
resource "aws_dynamodb_table" "cache" {
  count        = var.cache_type == "dynamodb" ? 1 : 0
  name         = "lks-url-cache-table"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  attribute {
    name = "code"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name    = "lks-url-cache-table"
    Project = "lks-url"
  }
}

# Batch B: ElastiCache Redis subnet group
resource "aws_elasticache_subnet_group" "cache" {
  count      = var.cache_type == "redis" ? 1 : 0
  name       = "lks-url-cache-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = {
    Name    = "lks-url-cache-subnet-group"
    Project = "lks-url"
  }
}

# Batch B: ElastiCache Redis cluster
resource "aws_elasticache_cluster" "redis" {
  count                = var.cache_type == "redis" ? 1 : 0
  cluster_id           = "lks-url-cache"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  subnet_group_name    = aws_elasticache_subnet_group.cache[0].name
  security_group_ids   = [var.cache_sg_id]

  tags = {
    Name    = "lks-url-cache"
    Project = "lks-url"
  }
}
