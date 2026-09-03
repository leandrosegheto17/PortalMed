# Bootstrap: provisiona o backend remoto do Terraform (S3 + DynamoDB lock).
# Roda UMA VEZ, com state local, antes de qualquer outro diretório deste
# repositório. Depois de aplicado, environments/{staging,production}/backend.tf
# apontam para os recursos criados aqui.
#
# NAO chamado pelo pipeline de CI/CD automaticamente (evita recriação
# acidental do próprio backend) — execução manual e única, documentada em
# .md/DEPLOY.md.

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Projeto   = "portal-resultados-exames"
      GerenciadoPor = "terraform"
      Camada    = "bootstrap"
    }
  }
}

variable "aws_region" {
  description = "Região AWS com residência de dado no Brasil (ADR-010)."
  type        = string
  default     = "sa-east-1"
}

variable "state_bucket_name" {
  description = "Nome globalmente único do bucket S3 de Terraform state."
  type        = string
  default     = "portalmed-terraform-state"
}

variable "lock_table_name" {
  description = "Nome da tabela DynamoDB usada para lock de state."
  type        = string
  default     = "portalmed-terraform-locks"
}

resource "aws_kms_key" "state" {
  description             = "Chave KMS dedicada à criptografia do Terraform state"
  deletion_window_in_days = 30
  enable_key_rotation     = true
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_dynamodb_table" "locks" {
  name         = var.lock_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.state.arn
  }
}

output "state_bucket" {
  value = aws_s3_bucket.state.bucket
}

output "lock_table" {
  value = aws_dynamodb_table.locks.name
}

output "kms_key_arn" {
  value = aws_kms_key.state.arn
}
