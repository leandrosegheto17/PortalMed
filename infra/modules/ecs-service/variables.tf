variable "name" {
  type = string
}

variable "aws_region" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "cluster_arn" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "allowed_ingress_security_group_ids" {
  description = "Security groups autorizados a alcancar este servico (ex.: SG do ALB para o core; SG do core para os gateways de borda)."
  type        = list(string)
}

variable "image" {
  description = "URI da imagem de container (ECR), com tag de versao/SHA — nunca `:latest` em producao."
  type        = string
}

variable "container_port" {
  type = number
}

variable "cpu" {
  type = number
}

variable "memory" {
  type = number
}

variable "desired_count" {
  type = number
}

variable "environment" {
  description = "Variaveis de ambiente NAO sensiveis."
  type        = map(string)
  default     = {}
}

variable "secrets" {
  description = "Variaveis sensiveis - resolvidas em runtime a partir do Secrets Manager, nunca em texto plano."
  type = list(object({
    name       = string
    value_from = string
  }))
  default = []
}

variable "secret_arns" {
  description = "ARNs que a execution role pode ler (escopo minimo, um por secret usado)."
  type        = list(string)
  default     = []
}

variable "task_policy_json" {
  description = "Policy IAM adicional da task role (ex.: acesso de escrita ao bucket de Object Storage), escopo minimo definido por quem instancia o modulo."
  type        = string
  default     = null
}

variable "target_group_arn" {
  description = "Target group do ALB, se este servico for publico (so o core)."
  type        = string
  default     = null
}

variable "service_discovery_registry_arn" {
  description = "Registro AWS Cloud Map, para servicos internos (Integration/Imaging Gateway) descobertos pelo core sem exposicao publica."
  type        = string
  default     = null
}

variable "container_health_check_command" {
  type    = list(string)
  default = null
}

variable "log_retention_days" {
  type    = number
  default = 30
}

variable "deployment_minimum_healthy_percent" {
  type    = number
  default = 100
}

variable "deployment_maximum_percent" {
  type    = number
  default = 200
}
