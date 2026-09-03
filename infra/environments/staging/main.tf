# Ambiente: STAGING
# Deriva dos mesmos modules/ que producao (infrastructure-as-code-
# provisioning, regra de paridade). Diferenca e so parametro: sem Multi-AZ/
# failover redundante, instancias menores, deploy automatico no merge a main
# (ver .github/workflows/*-ci.yml).

module "network" {
  source = "../../modules/network"

  name     = "portalmed-staging"
  vpc_cidr = "10.20.0.0/16"
  azs       = var.azs

  public_subnet_cidrs      = ["10.20.0.0/24", "10.20.1.0/24"]
  app_subnet_cidrs          = ["10.20.10.0/24", "10.20.11.0/24"]
  data_subnet_cidrs          = ["10.20.20.0/24", "10.20.21.0/24"]
  integration_subnet_cidrs = ["10.20.30.0/24", "10.20.31.0/24"]

  enable_hospital_channel = var.enable_hospital_channel
  hospital_vpn_cidr        = var.hospital_vpn_cidr
  dicom_source_cidr        = var.dicom_source_cidr
}

module "database" {
  source = "../../modules/database"

  name                    = "portalmed-staging"
  data_subnet_ids         = module.network.data_subnet_ids
  data_security_group_id = module.network.data_security_group_id
  kms_key_arn              = module.object_storage.kms_key_arn

  instance_class          = "db.t4g.medium" # piloto: 1 hospital, volume baixo (SDD.md §6.2)
  multi_az                 = false           # staging: sem HA (custo), producao = true
  backup_retention_days   = 3
  deletion_protection     = false
}

module "cache" {
  source = "../../modules/cache"

  name                    = "portalmed-staging"
  data_subnet_ids         = module.network.data_subnet_ids
  data_security_group_id = module.network.data_security_group_id
  kms_key_arn              = module.object_storage.kms_key_arn

  node_type                   = "cache.t4g.small"
  num_cache_clusters         = 1     # staging: sem replica
  automatic_failover_enabled = false
}

module "object_storage" {
  source = "../../modules/object-storage"

  name        = "portalmed-staging"
  bucket_name = var.object_storage_bucket_name
}

module "secrets" {
  source = "../../modules/secrets"

  name        = "portalmed-staging"
  kms_key_arn = module.object_storage.kms_key_arn

  database_endpoint  = module.database.endpoint
  database_username = module.database.master_username
  database_password = module.database.master_password
  database_name      = module.database.db_name

  redis_primary_endpoint = module.cache.primary_endpoint
  redis_auth_token         = module.cache.auth_token
}

resource "aws_ecs_cluster" "this" {
  name = "portalmed-staging"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = "internal.portalmed-staging.local"
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

# --- Aplicacao Core (publica, atras do ALB) ------------------------------------

module "edge" {
  source = "../../modules/edge"
  providers = {
    aws = aws
  }

  name                   = "portalmed-staging"
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
  name     = "portalmed-staging-cf-waf"
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
      metric_name                 = "portalmed-staging-cf-common"
      sampled_requests_enabled    = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                 = "portalmed-staging-cf-waf"
    sampled_requests_enabled    = true
  }
}

module "core_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-staging-core"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.app_subnet_ids

  allowed_ingress_security_group_ids = [module.network.alb_security_group_id]

  image           = var.container_image_core
  container_port = 3000
  cpu              = 512
  memory           = 1024
  desired_count   = 1 # staging: 1 instancia; producao: 2+ (HA)

  environment = {
    NODE_ENV                    = "staging"
    APP_PORT                     = "3000"
    OBJECT_STORAGE_BUCKET        = module.object_storage.bucket_name
    INTEGRATION_GATEWAY_HOST    = "integration-gateway.internal.portalmed-staging.local"
    IMAGING_GATEWAY_HOST        = "imaging-gateway.internal.portalmed-staging.local"
  }

  secrets = [
    { name = "DATABASE_CREDENTIALS", value_from = module.secrets.database_credentials_arn },
    { name = "REDIS_AUTH", value_from = module.secrets.redis_auth_arn },
    { name = "INTERNAL_SERVICE_API_KEY", value_from = module.secrets.internal_service_api_key_arn },
    { name = "EMAIL_PROVIDER_API_KEY", value_from = module.secrets.email_provider_api_key_arn },
  ]
  secret_arns = [
    module.secrets.database_credentials_arn,
    module.secrets.redis_auth_arn,
    module.secrets.internal_service_api_key_arn,
    module.secrets.email_provider_api_key_arn,
  ]

  # Core precisa ler/escrever no bucket de laudo/imagem e gerar URL assinada
  # (RF-08/RF-09) - escopo minimo, so este bucket.
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

# --- Integration Gateway (Mirth/NextGen Connect) - privado, sem ALB -----------

module "integration_gateway_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-staging-integration-gateway"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.integration_subnet_ids

  # So a aplicacao core acessa via rede interna (GUARDRAILS.md #14); canal do
  # hospital tratado por security group dedicado dentro de modules/network.
  allowed_ingress_security_group_ids = [module.network.app_security_group_id]

  image           = var.container_image_integration_gateway
  container_port = 8080 # porta administrativa/ACL do motor; canal HL7 MLLP tratado por SG dedicado
  cpu              = 1024
  memory           = 2048
  desired_count   = 1

  environment = {
    CORE_INGEST_ENDPOINT = "https://${var.domain_name}/api/internal/ingest"
  }
  secrets = [
    { name = "INTERNAL_SERVICE_API_KEY", value_from = module.secrets.internal_service_api_key_arn },
  ]
  secret_arns = [module.secrets.internal_service_api_key_arn]

  service_discovery_registry_arn = aws_service_discovery_service.integration_gateway.arn
}

# --- Imaging Gateway (Orthanc) - privado, sem ALB -----------------------------

module "imaging_gateway_service" {
  source = "../../modules/ecs-service"

  name        = "portalmed-staging-imaging-gateway"
  aws_region  = var.aws_region
  vpc_id       = module.network.vpc_id
  cluster_arn = aws_ecs_cluster.this.arn
  subnet_ids  = module.network.integration_subnet_ids

  allowed_ingress_security_group_ids = [module.network.app_security_group_id]

  image           = var.container_image_imaging_gateway
  container_port = 8042 # porta REST/DICOMweb do Orthanc, so acessivel internamente (GUARDRAILS.md #15)
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

  # Orthanc precisa gravar o JPEG/PNG convertido no Object Storage
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

# --- Observabilidade (fundacao) -------------------------------------------------

module "observability" {
  source = "../../modules/observability"

  name        = "portalmed-staging"
  alert_email = var.alert_email

  rds_instance_id            = module.database.instance_id
  redis_replication_group_id = "portalmed-staging-redis"
  alb_arn_suffix               = module.edge.alb_dns_name
  ecs_cluster_name            = aws_ecs_cluster.this.name
  ecs_core_service_name      = module.core_service.service_name
}
