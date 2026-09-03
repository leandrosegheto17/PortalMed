output "database_credentials_arn" {
  value = aws_secretsmanager_secret.database_credentials.arn
}

output "redis_auth_arn" {
  value = aws_secretsmanager_secret.redis_auth.arn
}

output "internal_service_api_key_arn" {
  value = aws_secretsmanager_secret.internal_service_api_key.arn
}

output "email_provider_api_key_arn" {
  value = aws_secretsmanager_secret.email_provider_api_key.arn
}

# SEC-DEBT-002 -- consumidos por environments/*/main.tf ao montar o
# `secrets = [...]` da task definition do ECS com o nome de variavel exato
# que o codigo da aplicacao espera (APP_DATABASE_URL).
output "app_database_url_arn" {
  value = aws_secretsmanager_secret.app_database_url.arn
}

output "app_db_role_password_arn" {
  value = aws_secretsmanager_secret.app_db_role_password.arn
}

output "migration_database_url_arn" {
  value = aws_secretsmanager_secret.migration_database_url.arn
}
