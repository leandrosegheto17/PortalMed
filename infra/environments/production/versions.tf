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
      Ambiente  = "production"
      GerenciadoPor = "terraform"
    }
  }
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Projeto  = "portal-resultados-exames"
      Ambiente = "production"
      Uso       = "cloudfront-acm-waf"
    }
  }
}
