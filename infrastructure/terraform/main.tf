# WedSync Production Infrastructure
# Terraform configuration for scalable, secure production deployment

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  backend "s3" {
    # Configure backend in terraform.tfvars or via CLI
    # bucket = "wedsync-terraform-state"
    # key    = "production/terraform.tfstate"
    # region = "us-east-1"
    # encrypt = true
    # dynamodb_table = "wedsync-terraform-locks"
  }
}

# Provider configuration
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = "WedSync"
      ManagedBy   = "Terraform"
      Owner       = var.owner_email
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  azs = slice(data.aws_availability_zones.available.names, 0, var.az_count)
  
  common_tags = {
    Environment = var.environment
    Project     = var.project_name
    ManagedBy   = "Terraform"
    Owner       = var.owner_email
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"
  
  name_prefix = local.name_prefix
  cidr_block  = var.vpc_cidr
  azs         = local.azs
  
  enable_nat_gateway = var.enable_nat_gateway
  enable_vpn_gateway = var.enable_vpn_gateway
  
  tags = local.common_tags
}

# Security Groups
module "security_groups" {
  source = "./modules/security"
  
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  vpc_cidr    = var.vpc_cidr
  
  tags = local.common_tags
}

# Application Load Balancer
module "alb" {
  source = "./modules/alb"
  
  name_prefix               = local.name_prefix
  vpc_id                   = module.vpc.vpc_id
  subnet_ids               = module.vpc.public_subnet_ids
  security_group_ids       = [module.security_groups.alb_security_group_id]
  
  domain_name              = var.domain_name
  certificate_arn          = var.ssl_certificate_arn
  enable_waf               = var.enable_waf
  
  tags = local.common_tags
}

# Auto Scaling Group for Application
module "app_asg" {
  source = "./modules/asg"
  
  name_prefix                = local.name_prefix
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  security_group_ids        = [module.security_groups.app_security_group_id]
  
  target_group_arn          = module.alb.target_group_arn
  
  instance_type             = var.app_instance_type
  min_size                  = var.app_min_size
  max_size                  = var.app_max_size
  desired_capacity          = var.app_desired_capacity
  
  key_pair_name             = var.key_pair_name
  
  tags = local.common_tags
}

# RDS Database with Read Replicas
module "rds" {
  source = "./modules/rds"
  
  name_prefix                = local.name_prefix
  vpc_id                    = module.vpc.vpc_id
  subnet_ids                = module.vpc.private_subnet_ids
  security_group_ids        = [module.security_groups.rds_security_group_id]
  
  db_instance_class         = var.db_instance_class
  db_allocated_storage      = var.db_allocated_storage
  db_max_allocated_storage  = var.db_max_allocated_storage
  
  db_name                   = var.db_name
  db_username               = var.db_username
  
  enable_read_replicas      = var.enable_read_replicas
  read_replica_count        = var.read_replica_count
  
  backup_retention_period   = var.backup_retention_period
  backup_window            = var.backup_window
  maintenance_window       = var.maintenance_window
  
  enable_performance_insights = var.enable_performance_insights
  monitoring_interval         = var.monitoring_interval
  
  tags = local.common_tags
}

# Redis Cache Cluster
module "redis" {
  source = "./modules/redis"
  
  name_prefix           = local.name_prefix
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.private_subnet_ids
  security_group_ids   = [module.security_groups.redis_security_group_id]
  
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  
  engine_version       = var.redis_engine_version
  parameter_group_name = var.redis_parameter_group
  
  tags = local.common_tags
}

# S3 Buckets for file storage
module "s3" {
  source = "./modules/s3"
  
  name_prefix = local.name_prefix
  
  enable_versioning     = var.s3_enable_versioning
  enable_encryption     = var.s3_enable_encryption
  lifecycle_rules       = var.s3_lifecycle_rules
  
  cors_rules = var.s3_cors_rules
  
  tags = local.common_tags
}

# CloudFront CDN
module "cloudfront" {
  source = "./modules/cloudfront"
  
  name_prefix = local.name_prefix
  
  origin_domain_name    = module.alb.dns_name
  s3_bucket_domain_name = module.s3.bucket_domain_name
  
  domain_name           = var.domain_name
  certificate_arn       = var.cloudfront_certificate_arn
  
  enable_waf            = var.enable_waf
  
  tags = local.common_tags
}

# WAF for Application Security
module "waf" {
  count = var.enable_waf ? 1 : 0
  
  source = "./modules/waf"
  
  name_prefix = local.name_prefix
  
  alb_arn           = module.alb.arn
  cloudfront_arn    = module.cloudfront.distribution_arn
  
  rate_limit        = var.waf_rate_limit
  blocked_countries = var.waf_blocked_countries
  
  tags = local.common_tags
}

# Secrets Manager
module "secrets" {
  source = "./modules/secrets"
  
  name_prefix = local.name_prefix
  
  secrets = {
    db_password         = random_password.db_password.result
    supabase_service_key = var.supabase_service_key
    stripe_secret_key   = var.stripe_secret_key
    openai_api_key     = var.openai_api_key
    resend_api_key     = var.resend_api_key
  }
  
  tags = local.common_tags
}

# CloudWatch Monitoring and Alerting
module "monitoring" {
  source = "./modules/monitoring"
  
  name_prefix = local.name_prefix
  
  alb_arn               = module.alb.arn
  asg_name              = module.app_asg.asg_name
  rds_identifier        = module.rds.db_instance_id
  redis_cluster_id      = module.redis.cluster_id
  
  sns_topic_arn         = module.notifications.sns_topic_arn
  
  enable_detailed_monitoring = var.enable_detailed_monitoring
  
  tags = local.common_tags
}

# SNS for Notifications
module "notifications" {
  source = "./modules/notifications"
  
  name_prefix = local.name_prefix
  
  alert_email     = var.alert_email
  slack_webhook   = var.slack_webhook_url
  
  tags = local.common_tags
}

# IAM Roles and Policies
module "iam" {
  source = "./modules/iam"
  
  name_prefix = local.name_prefix
  
  s3_bucket_arn = module.s3.bucket_arn
  secrets_arns  = module.secrets.secret_arns
  
  tags = local.common_tags
}

# Random password for RDS
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Output values
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.vpc.vpc_id
}

output "load_balancer_dns" {
  description = "DNS name of the load balancer"
  value       = module.alb.dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain name"
  value       = module.cloudfront.domain_name
}

output "database_endpoint" {
  description = "RDS instance endpoint"
  value       = module.rds.db_instance_endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.redis.primary_endpoint
  sensitive   = true
}

output "s3_bucket_name" {
  description = "Name of the S3 bucket"
  value       = module.s3.bucket_name
}

output "environment_info" {
  description = "Environment information"
  value = {
    environment = var.environment
    region      = var.aws_region
    vpc_cidr    = var.vpc_cidr
    deployed_at = timestamp()
  }
}