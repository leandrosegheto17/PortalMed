variable "name" {
  type = string
}

variable "kms_key_arn" {
  type = string
}

variable "database_endpoint" {
  type = string
}

variable "database_username" {
  type = string
}

variable "database_password" {
  type      = string
  sensitive = true
}

variable "database_name" {
  type = string
}

variable "redis_primary_endpoint" {
  type = string
}

variable "redis_auth_token" {
  type      = string
  sensitive = true
}
