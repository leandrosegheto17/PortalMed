variable "aws_region" {
  type    = string
  default = "sa-east-1"
}

variable "azs" {
  type    = list(string)
  default = ["sa-east-1a", "sa-east-1b"]
}

variable "domain_name" {
  description = "Dominio publico de producao."
  type        = string
}

variable "spa_bucket_name" {
  type = string
}

variable "object_storage_bucket_name" {
  type = string
}

variable "container_image_core" {
  type = string
}

variable "container_image_integration_gateway" {
  type = string
}

variable "container_image_imaging_gateway" {
  type = string
}

variable "enable_hospital_channel" {
  type    = bool
  default = false
}

variable "hospital_vpn_cidr" {
  type    = string
  default = null
}

variable "dicom_source_cidr" {
  type    = string
  default = null
}

variable "alert_email" {
  description = "Lista de distribuicao da equipe on-call - obrigatorio em producao."
  type        = string
}
