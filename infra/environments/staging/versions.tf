terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Projeto   = "portal-resultados-exames"
      Ambiente  = "staging"
      GerenciadoPor = "terraform"
    }
  }
}

# CloudFront exige certificado ACM em us-east-1, independente da regiao de
# operacao (sa-east-1) — provider alias dedicado so para isso.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Projeto  = "portal-resultados-exames"
      Ambiente = "staging"
      Uso       = "cloudfront-acm-waf"
    }
  }
}
