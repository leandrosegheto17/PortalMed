variable "name" {
  type = string
}

variable "domain_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "public_subnet_ids" {
  type = list(string)
}

variable "alb_security_group_id" {
  type = string
}

variable "app_port" {
  type = number
}

variable "health_check_path" {
  type    = string
  default = "/health"
}

variable "spa_bucket_name" {
  type = string
}

variable "waf_rate_limit_per_5min" {
  description = "Limite de requisicoes por IP a cada 5 min antes de bloqueio na borda (reforca RN-04)."
  type        = number
  default     = 2000
}

variable "cloudfront_waf_web_acl_arn" {
  description = "ARN do WAFv2 Web ACL escopo CLOUDFRONT (precisa ser criado em us-east-1 — provider alias no environment)."
  type        = string
}

variable "cloudfront_certificate_arn" {
  description = "ARN do certificado ACM em us-east-1 (exigencia do CloudFront para dominio customizado)."
  type        = string
}
