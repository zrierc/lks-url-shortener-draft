locals {
  lab_role_arn = "arn:aws:iam::${var.aws_account_id}:role/LabRole"
}

module "networking" {
  source = "./modules/networking"
}

module "ecr" {
  source = "./modules/ecr"
}

module "cloudwatch" {
  source = "./modules/cloudwatch"
}

module "rds" {
  source             = "./modules/rds"
  private_subnet_ids = module.networking.private_subnet_ids
  rds_sg_id          = module.networking.rds_sg_id
  db_username        = var.db_username
  db_password        = var.db_password
}

module "cache" {
  source             = "./modules/cache"
  cache_type         = var.cache_type
  private_subnet_ids = module.networking.private_subnet_ids
  cache_sg_id        = module.networking.cache_sg_id
}

module "sqs" {
  source = "./modules/sqs"
}

module "alb" {
  source             = "./modules/alb"
  vpc_id             = module.networking.vpc_id
  public_subnet_ids  = module.networking.public_subnet_ids
  alb_sg_id          = module.networking.alb_sg_id
}

module "ssm" {
  source                = "./modules/ssm"
  aws_region            = var.aws_region
  aws_account_id        = var.aws_account_id
  cache_type            = var.cache_type
  db_url                = "postgresql://${var.db_username}:${var.db_password}@${module.rds.db_endpoint}/urlshortener"
  sqs_url               = module.sqs.queue_url
  dynamodb_table_name   = module.cache.dynamodb_table_name
  redis_endpoint        = module.cache.redis_endpoint
}

module "ecs" {
  source                   = "./modules/ecs"
  aws_region               = var.aws_region
  aws_account_id           = var.aws_account_id
  lab_role_arn             = local.lab_role_arn
  cluster_name             = "lks-url-cluster"
  private_subnet_ids       = module.networking.private_subnet_ids
  ecs_sg_id                = module.networking.ecs_sg_id
  tg_frontend_arn          = module.alb.tg_frontend_arn
  tg_api_arn               = module.alb.tg_api_arn
  tg_analytics_arn         = module.alb.tg_analytics_arn
  ecr_api_url              = module.ecr.api_ecr_url
  ecr_analytics_url        = module.ecr.analytics_ecr_url
  ecr_frontend_url         = module.ecr.frontend_ecr_url
  cache_type               = var.cache_type
  ssm_db_url_arn           = module.ssm.db_url_arn
  ssm_sqs_url_arn          = module.ssm.sqs_url_arn
  ssm_base_url_arn         = module.ssm.base_url_arn
  ssm_port_api_arn         = module.ssm.port_api_arn
  ssm_port_analytics_arn   = module.ssm.port_analytics_arn
  ssm_dynamodb_table_arn   = module.ssm.dynamodb_table_arn
  ssm_dynamodb_region_arn  = module.ssm.dynamodb_region_arn
  ssm_redis_url_arn        = module.ssm.redis_url_arn
  log_group_api            = module.cloudwatch.log_group_api
  log_group_analytics      = module.cloudwatch.log_group_analytics
  log_group_frontend       = module.cloudwatch.log_group_frontend
}
