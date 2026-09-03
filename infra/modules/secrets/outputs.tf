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
