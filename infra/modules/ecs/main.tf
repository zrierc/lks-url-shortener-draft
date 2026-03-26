locals {
  # Build the cache-specific secrets for shortener-api
  api_cache_secrets_dynamodb = var.cache_type == "dynamodb" ? [
    {
      name      = "DYNAMODB_TABLE"
      valueFrom = var.ssm_dynamodb_table_arn
    },
    {
      name      = "DYNAMODB_REGION"
      valueFrom = var.ssm_dynamodb_region_arn
    }
  ] : []

  api_cache_secrets_redis = var.cache_type == "redis" ? [
    {
      name      = "REDIS_URL"
      valueFrom = var.ssm_redis_url_arn
    }
  ] : []

  api_cache_secrets = concat(local.api_cache_secrets_dynamodb, local.api_cache_secrets_redis)

  # Base secrets for shortener-api
  api_base_secrets = [
    {
      name      = "DATABASE_URL"
      valueFrom = var.ssm_db_url_arn
    },
    {
      name      = "SQS_URL"
      valueFrom = var.ssm_sqs_url_arn
    },
    {
      name      = "BASE_URL"
      valueFrom = var.ssm_base_url_arn
    },
    {
      name      = "PORT"
      valueFrom = var.ssm_port_api_arn
    }
  ]

  api_secrets = concat(local.api_base_secrets, local.api_cache_secrets)

  # Secrets for analytics-svc
  analytics_secrets = [
    {
      name      = "DATABASE_URL"
      valueFrom = var.ssm_db_url_arn
    },
    {
      name      = "SQS_URL"
      valueFrom = var.ssm_sqs_url_arn
    },
    {
      name      = "PORT"
      valueFrom = var.ssm_port_analytics_arn
    }
  ]
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = var.cluster_name

  tags = {
    Name    = var.cluster_name
    Project = "lks-url"
  }
}

# ─── shortener-api ───────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "api" {
  family                   = "lks-url-api-td"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.lab_role_arn
  task_role_arn            = var.lab_role_arn

  container_definitions = jsonencode([
    {
      name      = "shortener-api"
      image     = "${var.ecr_api_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
        }
      ]

      secrets = local.api_secrets

      environment = [
        {
          name  = "APP_ENV"
          value = "production"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_api
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name    = "lks-url-api-td"
    Project = "lks-url"
  }
}

resource "aws_ecs_service" "api" {
  name            = "lks-url-api-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.tg_api_arn
    container_name   = "shortener-api"
    container_port   = 3000
  }

  tags = {
    Name    = "lks-url-api-svc"
    Project = "lks-url"
  }
}

# ─── analytics-svc ───────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "analytics" {
  family                   = "lks-url-analytics-td"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = var.lab_role_arn
  task_role_arn            = var.lab_role_arn

  container_definitions = jsonencode([
    {
      name      = "analytics-svc"
      image     = "${var.ecr_analytics_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3001
          protocol      = "tcp"
        }
      ]

      secrets = local.analytics_secrets

      environment = [
        {
          name  = "APP_ENV"
          value = "production"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_analytics
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name    = "lks-url-analytics-td"
    Project = "lks-url"
  }
}

resource "aws_ecs_service" "analytics" {
  name            = "lks-url-analytics-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.analytics.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.tg_analytics_arn
    container_name   = "analytics-svc"
    container_port   = 3001
  }

  tags = {
    Name    = "lks-url-analytics-svc"
    Project = "lks-url"
  }
}

# ─── frontend ────────────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "frontend" {
  family                   = "lks-url-frontend-td"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = var.lab_role_arn
  task_role_arn            = var.lab_role_arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${var.ecr_frontend_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      secrets     = []
      environment = []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = var.log_group_frontend
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])

  tags = {
    Name    = "lks-url-frontend-td"
    Project = "lks-url"
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "lks-url-frontend-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.tg_frontend_arn
    container_name   = "frontend"
    container_port   = 80
  }

  tags = {
    Name    = "lks-url-frontend-svc"
    Project = "lks-url"
  }
}
