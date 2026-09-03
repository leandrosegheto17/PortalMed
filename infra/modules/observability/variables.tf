variable "name" {
  type = string
}

variable "alert_email" {
  type    = string
  default = null
}

variable "rds_instance_id" {
  type = string
}

variable "rds_free_storage_threshold_bytes" {
  type    = number
  default = 5368709120 # 5 GB
}

variable "redis_replication_group_id" {
  type = string
}

variable "alb_arn_suffix" {
  type = string
}

variable "alb_5xx_threshold" {
  type    = number
  default = 20
}

variable "ecs_cluster_name" {
  type = string
}

variable "ecs_core_service_name" {
  type = string
}
