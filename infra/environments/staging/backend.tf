# Backend remoto - recursos criados por infra/bootstrap (executado uma unica
# vez, manualmente). Preencher os valores reais apos o bootstrap (documentado
# em .md/DEPLOY.md); os literais abaixo refletem os defaults do bootstrap.

terraform {
  backend "s3" {
    bucket         = "portalmed-terraform-state"
    key             = "staging/terraform.tfstate"
    region          = "sa-east-1"
    dynamodb_table = "portalmed-terraform-locks"
    encrypt         = true
  }
}
