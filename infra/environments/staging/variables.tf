variable "aws_region" {
  type    = string
  default = "sa-east-1"
}

variable "azs" {
  type    = list(string)
  default = ["sa-east-1a", "sa-east-1b"]
}

variable "domain_name" {
  description = "Dominio publico do ambiente de staging."
  type        = string
}

variable "spa_bucket_name" {
  type = string
}

variable "object_storage_bucket_name" {
  description = "Bucket de laudo/imagem (Object Storage, SDD.md §3)."
  type        = string
}

variable "container_image_core" {
  description = "URI da imagem ECR da aplicacao core (tag = SHA do commit, publicada pelo backend-ci.yml)."
  type        = string
}

variable "container_image_integration_gateway" {
  description = "Imagem do Integration Gateway (Mirth/NextGen Connect, self-hosted)."
  type        = string
}

variable "container_image_imaging_gateway" {
  description = "Imagem do Imaging Gateway (Orthanc)."
  type        = string
}

variable "enable_hospital_channel" {
  description = "Habilita canal dedicado do hospital piloto (VPN/CIDR) - false ate P1 (PRD-TECNICO.md) ser confirmada."
  type        = bool
  default     = false
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
  description = "E-mail (lista de distribuicao da equipe) para alertas SNS de plataforma."
  type        = string
  default     = null
}
