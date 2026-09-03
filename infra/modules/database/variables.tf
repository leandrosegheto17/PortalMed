variable "name" {
  type = string
}

variable "data_subnet_ids" {
  type = list(string)
}

variable "data_security_group_id" {
  type = string
}

variable "kms_key_arn" {
  description = "ARN da chave KMS usada para storage_encrypted."
  type        = string
}

variable "engine_version" {
  type    = string
  default = "16.4"
}

variable "parameter_group_family" {
  type    = string
  default = "postgres16"
}

variable "instance_class" {
  type = string
}

variable "allocated_storage_gb" {
  type    = number
  default = 50
}

variable "max_allocated_storage_gb" {
  description = "Teto de auto-scaling de storage do RDS."
  type        = number
  default     = 200
}

variable "db_name" {
  type    = string
  default = "portalmed"
}

variable "master_username" {
  type    = string
  default = "portalmed_admin"
}

variable "multi_az" {
  description = "Mitigacao do risco Alta severidade do SDD.md §6.1 (banco sem redundancia). true em producao."
  type        = bool
}

variable "backup_retention_days" {
  type = number
}

variable "deletion_protection" {
  type = bool
}

variable "apply_immediately" {
  type    = bool
  default = false
}
