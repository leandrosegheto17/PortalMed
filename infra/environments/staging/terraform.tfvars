# Valores NAO sensiveis apenas - nenhum secret neste arquivo
# (infrastructure-as-code-provisioning, criterio de aceite).
# Dominio real/nome de bucket a confirmar com o time antes do primeiro apply
# real (esta etapa e so preparacao declarativa).

domain_name                          = "staging.portalresultados.example.com.br"
spa_bucket_name                       = "portalmed-staging-spa"
object_storage_bucket_name           = "portalmed-staging-exames"
container_image_core                  = "REPLACE_ME.dkr.ecr.sa-east-1.amazonaws.com/portalmed-core:staging-latest"
# Integration/Imaging Gateway sao produtos de mercado open-source (ADR-002/
# ADR-003, "comprado, nao construido") - imagem oficial do fabricante, nao
# buildada pelo nosso pipeline. Tag fixa (nunca `:latest`) a confirmar com o
# Backend (BE-06/BE-07) antes do primeiro apply real.
container_image_integration_gateway = "nextgenhealthcare/connect:4.5.2"
container_image_imaging_gateway     = "jodogne/orthanc-plugins:24.9.1"
enable_hospital_channel               = false
alert_email                            = null
