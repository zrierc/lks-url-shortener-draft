locals {
  tags = { Project = "lks-url" }
}

resource "aws_ecr_repository" "api" {
  name                 = "lks-url-shortener-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = merge(local.tags, { Name = "lks-url-shortener-api" })
}

resource "aws_ecr_repository" "analytics" {
  name                 = "lks-url-analytics"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = merge(local.tags, { Name = "lks-url-analytics" })
}

resource "aws_ecr_repository" "frontend" {
  name                 = "lks-url-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = merge(local.tags, { Name = "lks-url-frontend" })
}
