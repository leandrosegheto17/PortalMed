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

# --- SEC-DEBT-002 (SECURITY-REVIEW.md) --------------------------------------
# `redis-config.ts` (BE-05) le REDIS_HOST/REDIS_PASSWORD como variaveis de
# ambiente planas, nunca um blob JSON. O secret acima (`redis_auth`)
# permanece como estava (util para acesso operacional/break-glass via
# console), mas a task definition do ECS (`environments/*/main.tf`) passou a
# referenciar cada chave do JSON individualmente via a sintaxe nativa do ECS
# de selecao de chave dentro do secret (`<arn>:<json-key>::`), nunca via um
# entrypoint de parse nem reintroduzindo a senha em texto plano em lugar
# nenhum deste repositorio. Nao precisa de recurso Terraform adicional aqui
# -- a referencia e feita na hora de montar `secrets = [...]` de cada
# `module.core_service`.

# `DatabaseModule` (backend/src/database/database.module.ts) espera
# `APP_DATABASE_URL` como uma unica connection string completa (role de
# runtime `portalmed_app`, nunca a role master usada so para
# migration/DDL) -- diferente do Redis, uma URL de conexao nao pode ser
# remontada por selecao de chave JSON isolada (nao existe concatenacao no
# `valueFrom` do ECS), entao ela precisa existir como o proprio valor do
# secret. Senha gerada sem caracteres especiais de proposito, para nunca
# exigir URL-encoding manual ao montar a string abaixo (evita todo um bug
# potencial de char especial mal escapado numa connection string).
resource "random_password" "app_db_role" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "app_db_role_password" {
  name        = "${var.name}/database/app-role-password"
  kms_key_id  = var.kms_key_arn
  description = "Senha da role de runtime portalmed_app (menor privilegio, backend/migrations/*_create-app-database-role.ts) -- consumida tambem pelo job de migration para criar/atualizar a role via APP_DB_ROLE_PASSWORD."
}

resource "aws_secretsmanager_secret_version" "app_db_role_password" {
  secret_id     = aws_secretsmanager_secret.app_db_role_password.id
  secret_string = random_password.app_db_role.result
}

resource "aws_secretsmanager_secret" "app_database_url" {
  name        = "${var.name}/database/app-database-url"
  kms_key_id  = var.kms_key_arn
  description = "Connection string pronta para APP_DATABASE_URL (DatabaseModule) -- role portalmed_app, nunca a role master. Resolve SEC-DEBT-002 para o componente de banco."
}

resource "aws_secretsmanager_secret_version" "app_database_url" {
  secret_id      = aws_secretsmanager_secret.app_database_url.id
  secret_string  = "postgresql://portalmed_app:${random_password.app_db_role.result}@${var.database_endpoint}/${var.database_name}"
}

# Connection string com a role master/admin -- uso exclusivo do job de
# migration (node-pg-migrate, DDL + criacao da role portalmed_app), nunca
# injetada na task definition da aplicacao em runtime (mesma separacao de
# privilegio que backend/.env.example ja documenta entre DATABASE_URL e
# APP_DATABASE_URL).
resource "aws_secretsmanager_secret" "migration_database_url" {
  name        = "${var.name}/database/migration-database-url"
  kms_key_id  = var.kms_key_arn
  description = "Connection string com a role master/admin -- uso exclusivo do job de migration (equivalente a DATABASE_URL), nunca da aplicacao em runtime."
}

resource "aws_secretsmanager_secret_version" "migration_database_url" {
  secret_id      = aws_secretsmanager_secret.migration_database_url.id
  secret_string  = "postgresql://${var.database_username}:${var.database_password}@${var.database_endpoint}/${var.database_name}"
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
