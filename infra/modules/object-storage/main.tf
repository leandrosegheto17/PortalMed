# Object Storage para laudo/imagem - SDD.md §3: "compativel S3, criptografado
# (SSE-KMS), regiao Brasil" + GUARDRAILS.md #23/#24.

resource "aws_kms_key" "this" {
  description             = "Chave KMS dedicada ao Object Storage de laudo/imagem (${var.name})"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                     = { Name = "${var.name}-object-storage-kms" }
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.name}-object-storage"
  target_key_id = aws_kms_key.this.key_id
}

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
  tags   = { Name = var.bucket_name, Conteudo = "laudo-imagem-exame" }
}

resource "aws_s3_bucket_versioning" "this" {
  bucket = aws_s3_bucket.this.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  bucket = aws_s3_bucket.this.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.this.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Nunca URL publica permanente (GUARDRAILS.md #23) - acesso so via URL
# assinada de curta duracao, gerada pela aplicacao core (RF-08/RF-09).
resource "aws_s3_bucket_policy" "deny_insecure_transport" {
  bucket = aws_s3_bucket.this.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.this.arn,
          "${aws_s3_bucket.this.arn}/*",
        ]
        Condition = {
          Bool = { "aws:SecureTransport" = "false" } # TLS 1.2 piso, GUARDRAILS.md #21
        }
      },
      {
        Sid       = "DenyUnEncryptedObjectUploads"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:PutObject"
        Resource  = "${aws_s3_bucket.this.arn}/*"
        Condition = {
          StringNotEquals = { "s3:x-amz-server-side-encryption" = "aws:kms" }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_lifecycle_configuration" "this" {
  bucket = aws_s3_bucket.this.id

  rule {
    id     = "abort-incomplete-multipart-upload"
    status = "Enabled"
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "noncurrent-version-transition"
    status = "Enabled"
    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class    = "STANDARD_IA"
    }
    # Sem expiracao automatica: RNF-04 (retencao) segue "a confirmar"
    # (SDD.md §6.2) - PROIBIDO purgar sem confirmacao juridica formal do CTO
    # (GUARDRAILS.md #19).
  }
}

resource "aws_s3_bucket_logging" "this" {
  count         = var.access_log_bucket != null ? 1 : 0
  bucket        = aws_s3_bucket.this.id
  target_bucket = var.access_log_bucket
  target_prefix = "s3-access-logs/${var.bucket_name}/"
}
