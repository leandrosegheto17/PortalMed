# AWS Secrets Manager - nenhum segredo em texto plano em .tf/.tfvars
# (infrastructure-as-code-provisioning, criterio de aceite).
#
# Guarda: credenciais de banco, auth token do Redis, API key de servico
# (Integration/Imaging Gateway -> Core, BE-09/SDD.md §7.1), e outras
# credenciais operacionais (provedor de e-mail transacional).
# Referenciado por ARN nas task definitions do ECS (modules/ecs-service),
# nunca como variavel de ambiente literal no workflow de CI/CD.

resource "aws_secretsmanager_secret" "database_credentials" {
  name        = "${var.name}/database/credentials"
  kms_key_id  = var.kms_key_arn
  description = "Credenciais do RDS PostgreSQL (host/usuario/senha/db)"
}

resource "aws_secretsmanager_secret_version" "database_credentials" {
  secret_id = aws_secretsmanager_secret.database_credentials.id
  secret_string = jsonencode({
    host     = var.database_endpoint
    username = var.database_username
    password = var.database_password
    dbname   = var.database_name
    port     = 5432
  })
}

resource "aws_secretsmanager_secret" "redis_auth" {
  name        = "${var.name}/redis/auth-token"
  kms_key_id  = var.kms_key_arn
  description = "AUTH token do ElastiCache Redis"
}

resource "aws_secretsmanager_secret_version" "redis_auth" {
  secret_id = aws_secretsmanager_secret.redis_auth.id
  secret_string = jsonencode({
    primary_endpoint = var.redis_primary_endpoint
    auth_token         = var.redis_auth_token
  })
}

# API key de servico dedicada (BE-09) - Integration Gateway/Imaging Gateway
# -> Aplicacao Core, nunca a mesma credencial de usuario final
# (SDD.md §7.1, GUARDRAILS.md #13).
resource "random_password" "internal_service_api_key" {
  length  = 48
  special = false
}

resource "aws_secretsmanager_secret" "internal_service_api_key" {
  name        = "${var.name}/internal/service-api-key"
  kms_key_id  = var.kms_key_arn
  description = "API key de servico dedicada para Integration Gateway / Imaging Gateway -> Aplicacao Core (POST /internal/ingest e notificacao de conversao)"
}

resource "aws_secretsmanager_secret_version" "internal_service_api_key" {
  secret_id     = aws_secretsmanager_secret.internal_service_api_key.id
  secret_string = random_password.internal_service_api_key.result
}

# Placeholder para API key do provedor de e-mail transacional (RF-02/RF-03) -
# valor real inserido fora do Terraform (rotacao manual/console), pipeline
# nunca imprime o valor em log.
resource "aws_secretsmanager_secret" "email_provider_api_key" {
  name        = "${var.name}/notification/email-provider-api-key"
  kms_key_id  = var.kms_key_arn
  description = "API key do provedor de e-mail transacional (valor inserido fora do Terraform)"
}
