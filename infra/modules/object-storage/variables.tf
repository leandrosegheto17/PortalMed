variable "name" {
  type = string
}

variable "bucket_name" {
  description = "Nome globalmente unico do bucket S3."
  type        = string
}

variable "access_log_bucket" {
  description = "Bucket de destino para access log do S3 (opcional)."
  type        = string
  default     = null
}
