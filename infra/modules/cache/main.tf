# Redis gerenciado (ElastiCache) - ADR-007 (sessao/cache/fila BullMQ).
#
# SDD.md §6.1: "Redis indisponivel impede validacao/criacao de sessao para
# toda a base" - severidade Alta, mitigacao = "Redis gerenciado com
# replicacao/failover automatico". automatic_failover_enabled=true +
# num_cache_clusters>=2 em producao implementa essa mitigacao.

resource "random_password" "redis_auth" {
  length  = 32
  special = false # AUTH token do Redis nao aceita todos os especiais
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-redis-subnet-group"
  subnet_ids = var.data_subnet_ids
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name}-redis-params"
  family = var.parameter_group_family
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = "${var.name}-redis"
  description           = "Sessao revogavel (ADR-007) + fila BullMQ (conversao de imagem, ingestao)"

  engine         = "redis"
  engine_version = var.engine_version
  node_type       = var.node_type
  port            = 6379

  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.automatic_failover_enabled
  multi_az_enabled            = var.automatic_failover_enabled

  subnet_group_name = aws_elasticache_subnet_group.this.name
  security_group_ids = [var.data_security_group_id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled  = true
  auth_token                   = random_password.redis_auth.result
  kms_key_id                    = var.kms_key_arn

  parameter_group_name = aws_elasticache_parameter_group.this.name

  snapshot_retention_limit = var.snapshot_retention_days
  snapshot_window            = "05:00-06:00"
  maintenance_window          = "sun:06:30-sun:07:30"

  apply_immediately = var.apply_immediately

  tags = { Name = "${var.name}-redis" }
}
