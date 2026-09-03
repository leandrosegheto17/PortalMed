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
  type = string
}

variable "engine_version" {
  type    = string
  default = "7.1"
}

variable "parameter_group_family" {
  type    = string
  default = "redis7"
}

variable "node_type" {
  type = string
}

variable "num_cache_clusters" {
  description = "1 = sem replica (staging); >=2 = replica + failover automatico (producao, mitiga risco Alta do SDD.md §6.1)."
  type        = number
}

variable "automatic_failover_enabled" {
  type = bool
}

variable "snapshot_retention_days" {
  type    = number
  default = 7
}

variable "apply_immediately" {
  type    = bool
  default = false
}
