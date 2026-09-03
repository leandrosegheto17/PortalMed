variable "name" {
  description = "Prefixo de nome para os recursos de rede (ex.: portalmed-staging)."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block da VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "azs" {
  description = "Availability Zones usadas (mínimo 2, para HA)."
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDRs das subnets públicas (ALB/CloudFront origin apenas)."
  type        = list(string)
}

variable "app_subnet_cidrs" {
  description = "CIDRs das subnets privadas de aplicação (ECS: Core, BFF)."
  type        = list(string)
}

variable "data_subnet_cidrs" {
  description = "CIDRs das subnets isoladas de dado (RDS, ElastiCache) — sem rota de saída à internet."
  type        = list(string)
}

variable "integration_subnet_cidrs" {
  description = "CIDRs das subnets privadas do Integration Gateway e Imaging Gateway (§7.5 SDD.md — nunca expostos à internet pública)."
  type        = list(string)
}

variable "enable_hospital_channel" {
  description = "Habilita o canal dedicado (VPN/CIDR allowlist) do hospital piloto para o Integration/Imaging Gateway. Desabilitado por padrão até o protocolo real do piloto ser confirmado (PRD-TECNICO.md, Premissa P1)."
  type        = bool
  default     = false
}

variable "hospital_vpn_cidr" {
  description = "CIDR de origem do canal dedicado do hospital (HL7/FHIR/MLLP), quando enable_hospital_channel=true."
  type        = string
  default     = null
}

variable "dicom_source_cidr" {
  description = "CIDR de origem do PACS do hospital para C-STORE DICOM, quando enable_hospital_channel=true."
  type        = string
  default     = null
}

variable "app_port" {
  description = "Porta interna exposta pela aplicação core (NestJS)."
  type        = number
  default     = 3000
}
