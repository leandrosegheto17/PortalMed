# infra/ — Infraestrutura como Código (Portal de Resultados de Exames)

Terraform, provedor **AWS**, região **`sa-east-1`** (São Paulo). Decisão de
provedor tomada pelo DevOps dentro da sua autoridade de rotina (ADR-010 do
Software Architect exige apenas "região de nuvem no Brasil", cita AWS
`sa-east-1`/Azure Brazil South/GCP `southamerica-east1` como equivalentes —
não é uma decisão de arquitetura que precise de novo ADR; ver `.md/DEPLOY.md`
para o racional completo). Se o custo real ou a paridade de serviço da AWS
divergir do esperado, isso é sinalizado ao Software Architect, não decidido
unilateralmente aqui (ver guardrail de DevOps).

## Por que Terraform

Ferramenta de IaC declarativa mais madura para múltiplos providers, larga
adoção de mercado, state remoto gerenciável (S3 + DynamoDB lock), compatível
com `cicd-iac-foundations` (estrutura `modules/` + `environments/`).

## Estrutura

```
infra/
├── bootstrap/            # Provisiona UMA VEZ o backend remoto do Terraform
│                          # (bucket S3 de state + tabela DynamoDB de lock).
│                          # Chicken-and-egg: roda com state local, antes de
│                          # tudo o mais.
├── modules/               # Blocos reutilizáveis, sem parâmetro de ambiente
│                          # hardcoded — environments/ é quem parametriza.
│   ├── network/            # VPC, subnets públicas/privadas/dados, SGs, NAT
│   ├── database/           # RDS PostgreSQL (Multi-AZ, criptografado)
│   ├── cache/               # ElastiCache Redis (replication group)
│   ├── object-storage/     # S3 + KMS (laudo/imagem), SSE-KMS, região Brasil
│   ├── secrets/             # AWS Secrets Manager (credenciais, API keys)
│   ├── ecs-service/         # Serviço ECS Fargate genérico (core, Integration
│   │                        # Gateway, Imaging Gateway reutilizam este módulo)
│   ├── edge/                 # ALB + WAF + CloudFront + ACM (borda pública)
│   └── observability/        # Log groups, SNS de alerta, alarmes base
├── environments/
│   ├── staging/            # 1 réplica onde aplicável, sem Multi-AZ, sizing
│   │                        # menor — deploy automático (ver CI/CD)
│   └── production/         # Multi-AZ/replicação onde SDD.md §6.1 exige,
│                            # deploy só com aprovação manual (Gate humano)
└── README.md                (este arquivo)
```

## Regra de paridade staging/produção (`infrastructure-as-code-provisioning`)

Staging e produção **derivam dos mesmos módulos** em `modules/` — nunca duas
definições divergentes. A única coisa que muda entre `environments/staging` e
`environments/production` são valores de variável (`terraform.tfvars`):
tamanho de instância, contagem de réplicas, `deletion_protection`,
`multi_az`/`automatic_failover_enabled`. Isso é deliberado — reduz o risco de
"funciona em staging, quebra em produção" por infraestrutura diferente.

## Mapeamento SDD.md §3 → módulo Terraform

| Componente (SDD.md §3) | Módulo | Observação |
|---|---|---|
| PostgreSQL (RLS, ADR-006) | `modules/database` | RDS PostgreSQL, `storage_encrypted=true`, subnet isolada sem rota pública. RLS/`pgcrypto` são configurados via migration da aplicação (BE-02/BE-03), não pelo Terraform. |
| Redis (sessão/cache/fila, ADR-007) | `modules/cache` | ElastiCache Redis replication group, `at_rest_encryption_enabled`+`transit_encryption_enabled=true`, failover automático em produção (mitiga risco "Alta" do SDD.md §6.1). |
| Object Storage (laudo/imagem) | `modules/object-storage` | S3 + KMS (SSE-KMS), bucket sem acesso público, política nega requisição não-TLS, versionamento habilitado. |
| Integration Gateway (Mirth/NextGen Connect, ADR-002) | `modules/ecs-service` (instância própria) | Roda em subnet privada de integração, **sem** listener público — só Service Connect interno + canal dedicado ao hospital (MLLP/FHIR), conforme SDD.md §7.5/GUARDRAILS.md #14. |
| Imaging Gateway (Orthanc, ADR-003) | `modules/ecs-service` (instância própria) | Subnet privada de imagem, endpoint DICOM C-STORE restrito por security group ao CIDR do PACS do hospital (variável), sem exposição DICOMweb pública (SDD.md §7.5/GUARDRAILS.md #14-15). |
| Aplicação Core (monolito NestJS) | `modules/ecs-service` + `modules/edge` | Único componente atrás do ALB/CloudFront público (SPA + API/BFF no mesmo domínio, SDD.md §1.3/§7.5). |
| Web App (SPA React) | `modules/edge` (S3 + CloudFront) | Build estático servido via CloudFront, WAF na borda, cabeçalhos de segurança (CSP/HSTS) via response headers policy. |
| Rede privada (Integration/Imaging Gateway não expostos) | `modules/network` | Subnets `data`/`integration`/`imaging` sem rota para Internet Gateway; security groups fecham tudo por padrão, abrem só a porta/origem necessária. |

## O que **não** é IaC nesta etapa (fora do escopo desta rodada)

- Migrations de schema (`tenant_id`, RLS, `pgcrypto`) — BE-02/BE-03, aplicação.
- Configuração fina de canal HL7/FHIR/DICOM por hospital
  (`INTEGRATION_ENDPOINT_CONFIG`) — depende do protocolo real do piloto (P1),
  ainda "a confirmar"; o Terraform já prepara o `var.hospital_vpn_cidr`/
  `var.dicom_source_cidr` como entrada, desabilitado por padrão
  (`enable_hospital_channel = false`) até P1 ser resolvida.
- Dashboards/alertas finos de observabilidade — fundação (log groups, alarmes
  base, tópico SNS) está em `modules/observability`; afinação completa é
  `observability-setup`, que roda mais adiante, após a dupla aprovação.
- `terraform apply` real em conta AWS — esta etapa é só definição declarativa
  (`.md/DEPLOY.md` documenta isso explicitamente). Nenhum recurso foi
  provisionado de fato.

## Gestão de secrets

Nenhum segredo em texto plano em nenhum arquivo `.tf`/`.tfvars` deste
diretório. Credenciais de banco, token de autenticação do Redis, API keys de
serviço (Integration/Imaging Gateway → Core, ADR conforme SDD.md §7.1) e
segredo de criptografia do TOTP são gerados (`random_password`) e armazenados
exclusivamente no AWS Secrets Manager (`modules/secrets`), referenciados por
ARN nas task definitions do ECS (`modules/ecs-service`) — nunca como variável
de ambiente literal.
