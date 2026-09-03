# Valores NAO sensiveis apenas - nenhum secret neste arquivo.
# Dominio real/nome de bucket/e-mail de alerta a confirmar com o time antes
# do primeiro apply real. Producao so aplica via workflow_dispatch manual com
# aprovacao do ambiente `production` no GitHub (ver
# .github/workflows/deploy-production.yml) - nunca automatico no merge.

domain_name                          = "portalresultados.example.com.br"
spa_bucket_name                       = "portalmed-production-spa"
object_storage_bucket_name           = "portalmed-production-exames"
container_image_core                  = "REPLACE_ME.dkr.ecr.sa-east-1.amazonaws.com/portalmed-core:REPLACE_ME_TAG"
# Mesma imagem oficial (tag fixa) usada em staging apos validacao - nunca
# `:latest` em producao (ADR-002/ADR-003, produto de mercado comprado).
container_image_integration_gateway = "nextgenhealthcare/connect:4.5.2"
container_image_imaging_gateway     = "jodogne/orthanc-plugins:24.9.1"
enable_hospital_channel               = false
alert_email                            = "REPLACE_ME_oncall@hospital-piloto-portal.example.com.br"
