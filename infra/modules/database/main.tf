# PostgreSQL gerenciado (RDS) - ADR-006.
#
# RLS e pgcrypto (GUARDRAILS.md #16-17) sao configurados via migration da
# aplicacao (BE-02/BE-03), nao aqui - este modulo so garante o "berco"
# seguro: rede privada, criptografia em repouso, backup/replicacao.
#
# SDD.md §6.1 classifica "Banco de dados unico sem redundancia documentada"
# como risco Alta severidade -> instancia gerenciada com Multi-AZ e backup
# automatizado e a mitigacao, parametrizada por ambiente (var.multi_az).

resource "random_password" "db_master" {
  length  = 32
  special = true
  # Evita caracteres que a URL de conexao / secrets manager podem escapar mal
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db-subnet-group"
  subnet_ids = var.data_subnet_ids
  tags       = { Name = "${var.name}-db-subnet-group" }
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name}-pg-params"
  family = var.parameter_group_family

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "this" {
  identifier     = "${var.name}-postgres"
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage_gb
  max_allocated_storage = var.max_allocated_storage_gb
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id              = var.kms_key_arn

  db_name  = var.db_name
  username = var.master_username
  password = random_password.db_master.result
  port      = 5432

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [var.data_security_group_id]
  publicly_accessible     = false # GUARDRAILS.md #16 / SDD.md §7.5

  multi_az                     = var.multi_az
  backup_retention_period      = var.backup_retention_days
  backup_window                 = "05:00-06:00" # madrugada, horario de Brasilia (UTC-3) ~ 02h-03h local
  maintenance_window            = "sun:06:30-sun:07:30"
  deletion_protection           = var.deletion_protection
  skip_final_snapshot           = !var.deletion_protection
  final_snapshot_identifier     = var.deletion_protection ? "${var.name}-postgres-final-snapshot" : null
  copy_tags_to_snapshot         = true

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  parameter_group_name = aws_db_parameter_group.this.name

  apply_immediately = var.apply_immediately

  tags = { Name = "${var.name}-postgres" }
}
