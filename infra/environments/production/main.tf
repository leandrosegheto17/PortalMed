# Ambiente: PRODUCAO
# Mesma base de modules/ que staging (infrastructure-as-code-provisioning,
# regra de paridade) - diferenca e parametro: Multi-AZ/failover redundante
# (mitiga riscos "Alta" severidade do SDD.md §6.1 para Postgres e Redis),
# deletion_protection=true, desired_count=2 (HA de aplicacao). Deploy NUNCA
# automatico - so via workflow_dispatch manual com aprovacao humana no
# ambiente `production` do GitHub (ver deploy-production.yml) e sempre
# condicionado a dupla aprovacao QA+DevSecOps do mesmo build (ver .md/DEPLOY.md).

module "network" {
  source = "../../modules/network"

  name     = "portalmed-production"
  vpc_cidr = "10.30.0.0/16"
  azs       = var.azs

  public_subnet_cidrs      = ["10.30.0.0/24", "10.30.1.0/24"]
  app_subnet_cidrs          = ["10.30.10.0/24", "10.30.11.0/24"]
  data_subnet_cidrs          = ["10.30.20.0/24", "10.30.21.0/24"]
  integration_subnet_cidrs = ["10.30.30.0/24", "10.30.31.0/24"]

  enable_hospital_channel = var.enable_hospital_channel
  hospital_vpn_cidr        = var.hospital_vpn_cidr
  dicom_source_cidr        = var.dicom_source_cidr
}

module "database" {
  source = "../../modules/database"

  name                    = "portalmed-production"
  data_subnet_ids         = module.network.data_subnet_ids
  data_security_group_id = module.network.data_security_group_id
  kms_key_arn              = module.object_storage.kms_key_arn

  instance_class          = "db.r6g.large"
  multi_az                 = true # mitiga risco Alta severidade, SDD.md §6.1
  backup_retention_days   = 14
  deletion_protection     = true
}

module "cache" {
  source = "../../modules/cache"

  name                    = "portalmed-production"
  data_subnet_ids         = module.network.data_subnet_ids
  data_security_group_id = module.network.data_security_group_id
  kms_key_arn              = module.object_storage.kms_key_arn

  node_type                   = "cache.r6g.large"
  num_cache_clusters         = 2    # replica + failover automatico
  automatic_failover_enabled = true # mitiga risco Alta severidade, SDD.md §6.1
}

module "object_storage" {
  source = "../../modules/object-storage"

  name        = "portalmed-production"
  bucket_name = var.object_storage_bucket_name
}

module "secrets" {
  source = "../../modules/secrets"

  name        = "portalmed-production"
  kms_key_arn = module.object_storage.kms_key_arn

  database_endpoint  = module.database.endpoint
  database_username = module.database.master_username
  database_password = module.database.master_password
  database_name      = module.database.db_name

  redis_primary_endpoint = module.cache.primary_endpoint
  redis_auth_token         = module.cache.auth_token
}

resource "aws_ecs_cluster" "this" {
  name = "portalmed-production"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "internal.portalmed-production.local"
  vpc  = module.network.vpc_id
}

resource "aws_service_discovery_service" "integration_gateway" {
  name = "integration-gateway"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id
    dns_records {
      ttl  = 10
      type = "A"
    }
  }
}

resource "aws_service_discovery_service" "imaging_gateway" {
  name = "imaging-gateway"
  dns_config {
    namespace_id = aws_service_discovery_private_dns_namespace.internal.id
    dns_records {
      ttl  = 10
      type = "A"
    }
  }
}

module "edge" {
  source = "../../modules/edge"
  providers = {
    aws = aws
  }

  name                   = "portalmed-production"
  domain_name             = var.domain_name
  vpc_id                   = module.network.vpc_id
  public_subnet_ids       = module.network.public_subnet_ids
  alb_security_group_id  = module.network.alb_security_group_id
  app_port                 = 3000
  spa_bucket_name          = var.spa_bucket_name

  cloudfront_waf_web_acl_arn = aws_wafv2_web_acl.cloudfront.arn
  cloudfront_certificate_arn = aws_acm_certificate.cloudfront.arn
}

resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_wafv2_web_acl" "cloudfront" {
  provider = aws.us_east_1
  name     = "portalmed-production-cf-waf"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "aws-managed-common"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "portalmed-production-cf-common"
      sampled_requests_enabled    = true
    }
  }

  rule {
    name     = "aws-managed-sqli"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "portalmed-production-cf-sqli"
      sampled_requests_enabled    = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                 = "portalmed-production-cf-waf"
    sampled_requests_enabled    = true
  }
}

module "core_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-production-core"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.app_subnet_ids

  allowed_ingress_security_group_ids = [module.network.alb_security_group_id]

  image           = var.container_image_core
  container_port = 3000
  cpu              = 1024
  memory           = 2048
  desired_count   = 2 # HA de aplicacao - 2 tasks em AZs distintas

  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent          = 200

  environment = {
    NODE_ENV                    = "production"
    APP_PORT                     = "3000"
    OBJECT_STORAGE_BUCKET        = module.object_storage.bucket_name
    # ElastiCache exige TLS em transito (infra/modules/cache/main.tf,
    # transit_encryption_enabled = true) -- REDIS_TLS nao e segredo, so
    # precisa bater com o parametro real do Redis (SEC-DEBT-002).
    REDIS_TLS                    = "true"
    INTEGRATION_GATEWAY_HOST    = "integration-gateway.internal.portalmed-production.local"
    IMAGING_GATEWAY_HOST        = "imaging-gateway.internal.portalmed-production.local"
  }

  # SEC-DEBT-002 (SECURITY-REVIEW.md) -- ver mesmo racional em
  # infra/environments/staging/main.tf (paridade staging/producao, so
  # parametro de dimensionamento difere, nunca a forma de wiring de secret).
  secrets = [
    { name = "APP_DATABASE_URL", value_from = module.secrets.app_database_url_arn },
    { name = "REDIS_HOST", value_from = "${module.secrets.redis_auth_arn}:primary_endpoint::" },
    { name = "REDIS_PASSWORD", value_from = "${module.secrets.redis_auth_arn}:auth_token::" },
    { name = "INTERNAL_SERVICE_API_KEY", value_from = module.secrets.internal_service_api_key_arn },
    { name = "EMAIL_PROVIDER_API_KEY", value_from = module.secrets.email_provider_api_key_arn },
  ]
  secret_arns = [
    module.secrets.app_database_url_arn,
    module.secrets.redis_auth_arn,
    module.secrets.internal_service_api_key_arn,
    module.secrets.email_provider_api_key_arn,
  ]

  task_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "${module.object_storage.bucket_arn}/*"
    }]
  })

  target_group_arn                 = module.edge.core_target_group_arn
  container_health_check_command = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
}

module "integration_gateway_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-production-integration-gateway"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.integration_subnet_ids

  allowed_ingress_security_group_ids = [module.network.app_security_group_id]

  image           = var.container_image_integration_gateway
  container_port = 8080
  cpu              = 1024
  memory           = 2048
  desired_count   = 1 # ponto unico de falha aceito no MVP (SDD.md §6.1 - "operar com redundancia minima: health check + restart automatico")

  environment = {
    CORE_INGEST_ENDPOINT = "https://${var.domain_name}/api/internal/ingest"
  }
  secrets = [
    { name = "INTERNAL_SERVICE_API_KEY", value_from = module.secrets.internal_service_api_key_arn },
  ]
  secret_arns = [module.secrets.internal_service_api_key_arn]

  service_discovery_registry_arn = aws_service_discovery_service.integration_gateway.arn
}

module "imaging_gateway_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-production-imaging-gateway"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.integration_subnet_ids

  allowed_ingress_security_group_ids = [module.network.app_security_group_id]

  image           = var.container_image_imaging_gateway
  container_port = 8042
  cpu              = 1024
  memory           = 2048
  desired_count   = 1

  environment = {
    ORTHANC_CORE_NOTIFY_ENDPOINT = "https://${var.domain_name}/api/internal/imaging/notify"
  }
  secrets = [
    { name = "INTERNAL_SERVICE_API_KEY", value_from = module.secrets.internal_service_api_key_arn },
  ]
  secret_arns = [module.secrets.internal_service_api_key_arn]

  task_policy_json = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${module.object_storage.bucket_arn}/*"
    }]
  })

  service_discovery_registry_arn = aws_service_discovery_service.imaging_gateway.arn
}

module "observability" {
  source = "../../modules/observability"

  name        = "portalmed-production"
  alert_email = var.alert_email

  rds_instance_id            = module.database.instance_id
  redis_replication_group_id = "portalmed-production-redis"
  alb_arn_suffix               = module.edge.alb_dns_name
  ecs_cluster_name            = aws_ecs_cluster.this.name
  ecs_core_service_name      = module.core_service.service_name
}
