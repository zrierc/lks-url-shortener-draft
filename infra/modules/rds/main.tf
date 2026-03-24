locals {
  tags = { Project = "lks-url" }
}

resource "aws_db_subnet_group" "main" {
  name       = "lks-url-db-subnet-group"
  subnet_ids = var.private_subnet_ids
  tags       = merge(local.tags, { Name = "lks-url-db-subnet-group" })
}

resource "aws_db_instance" "main" {
  identifier             = "lks-url-db"
  engine                 = "postgres"
  engine_version         = "17"
  instance_class         = "db.t3.micro"
  allocated_storage      = 20
  db_name                = "urlshortener"
  username               = var.db_username
  password               = var.db_password
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_sg_id]
  skip_final_snapshot    = true
  deletion_protection    = false
  multi_az               = false
  publicly_accessible    = false

  tags = merge(local.tags, { Name = "lks-url-db" })
}
