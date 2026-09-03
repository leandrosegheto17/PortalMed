terraform {
  backend "s3" {
    bucket         = "portalmed-terraform-state"
    key             = "production/terraform.tfstate"
    region          = "sa-east-1"
    dynamodb_table = "portalmed-terraform-locks"
    encrypt         = true
  }
}
