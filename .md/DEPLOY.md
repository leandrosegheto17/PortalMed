# DEPLOY.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: DevOps
**Data**: 2026-09-02 (criação) — **atualizado em 2026-09-03** (tentativa real
de `deployment-execution` em staging, Lote 1) — **atualizado em 2026-09-04**
(tentativa real de `deployment-execution` em staging, Lote 3) —
**atualizado em 2026-09-05** (correção de `SEC-DEBT-003` + tentativa real de
`deployment-execution` em staging, Lote 2)
**Status**: **`SEC-DEBT-002` e `SEC-DEBT-003` resolvidos em código. Deploy
real em staging bloqueado por limitação de ambiente de execução (sem acesso
a conta AWS real) — não é pausa obrigatória, não é achado de segurança, não
é reprovação de QA/DevSecOps.** A mesma limitação de ambiente foi
reverificada de forma genuína em 2026-09-04 (Lote 3) e novamente em
2026-09-05 (Lote 2), e permanece idêntica em todas as três tentativas. Ver
Seção 8 para o registro completo. Esta entrada continua
registrando o que foi provisionado **como código** e como o pipeline foi
desenhado, conforme `infrastructure-as-code-provisioning` e
`cicd-pipeline-configuration`, que rodam em paralelo à implementação, assim
que o `SDD.md` foi aprovado no Gate 2 — sem esperar nenhum build terminar.
**Input**: `SDD.md` (final, §3 stack, §6 riscos/escalabilidade, §7.5 superfície
de exposição) + `.md/adr/006-...md` + `.md/adr/010-...md` + `GUARDRAILS.md`
(39 regras, Seções A, E, I aplicáveis diretamente a esta entrega) + `TASK.md`
(Seção 3.1, BE-01 a BE-09 — infraestrutura de base do Backend) + (a partir de
2026-09-03) `QA-REPORT.md` §4.8 (Aprovado com ressalvas, Lote 1),
`SECURITY-REVIEW.md` "Lote 1" (Aprovado com débito registrado) e
`LOTE-LOG.md` (Aprovado com ressalvas, Tech Lead) — dupla aprovação +
integridade de decomposição que libera `deployment-execution` para o Lote 1.
A partir de 2026-09-04: `QA-REPORT.md` Seção 5.6 (Aprovado, Lote 3),
`SECURITY-REVIEW.md` "Lote 3" (Aprovado, após correção de `SEC-BUG-001`) e
`LOTE-LOG.md` "Lote 3" (Aprovado, Tech Lead) — dupla aprovação + integridade
de decomposição que libera `deployment-execution` para o Lote 3 (BE-03,
BE-04). A partir de 2026-09-05: `QA-REPORT.md` Seção 6.7 (Aprovado com
ressalvas, Lote 2), `SECURITY-REVIEW.md` "Lote 2" (Aprovado com débito
registrado, após correção e revalidação independente de `SEC-BUG-002`) e
`LOTE-LOG.md` "Lote 2" (Aprovado com ressalvas, Tech Lead) — dupla aprovação
+ integridade de decomposição que libera `deployment-execution` para o
Lote 2 (BE-06, BE-07, BE-09).

---

## 1. Escopo desta entrega

Conforme o guardrail de DevOps ("nunca executa deploy sem dupla aprovação de
QA + DevSecOps") e a convenção do projeto ("deploy real só acontece depois de
QA e DevSecOps aprovarem o mesmo build; deploy em produção sempre pausa para
validação explícita do usuário"), **esta entrega não inclui execução de
deploy**. Cobre exclusivamente:

1. Infraestrutura como código (Terraform) para os componentes já decididos no
   `SDD.md` §3.
2. Pipeline de CI/CD (build, lint, teste, scan de segurança, deploy faseado),
   coordenado com o CI básico que o Backend configura em BE-01.
3. O desenho da estratégia de rollback e da fundação de observabilidade —
   ambos como código, prontos para serem exercitados e afinados quando
   `deployment-execution`/`observability-setup` rodarem, depois da dupla
   aprovação.

`deployment-execution`, `observability-setup` (afinação completa),
`non-functional-requirement-validation` contra infraestrutura real, e o
fechamento do ciclo com o CTO (Gate 4) **ainda não ocorreram** — ver Seção 8.

---

## 2. Decisão de provedor cloud (autoridade de rotina do DevOps)

`ADR-010` (Software Architect) exige apenas "região de nuvem localizada no
Brasil", citando AWS `sa-east-1`, Azure Brazil South e GCP
`southamerica-east1` como equivalentes — não comprometeu um provedor
específico. Como não há decisão anterior na cadeia, esta é uma escolha de
detalhe de implementação dentro da autoridade de rotina do DevOps (não uma
decisão de arquitetura que exija novo ADR do Software Architect).

**Escolhido: AWS, região `sa-east-1` (São Paulo).**

Racional:
- Paridade de serviço madura para os quatro componentes gerenciados exigidos
  pelo `SDD.md` §3 (PostgreSQL → RDS, Redis → ElastiCache, Object Storage →
  S3, rede privada → VPC/Security Groups/Service Discovery) na região
  brasileira, sem exigir workaround.
- `sa-east-1` está disponível desde o lançamento do serviço AWS no Brasil —
  menor risco de indisponibilidade pontual de tipo de instância/serviço
  gerenciado do que regiões mais novas (risco que o próprio ADR-010 já
  sinalizou como "a validar pelo DevOps").
- Suporte nativo a RLS via `pg_catalog`/extensões no RDS PostgreSQL gerenciado
  (sem restrição adicional imposta pelo provedor sobre o mecanismo que
  ADR-004/ADR-006 exigem).
- Terraform provider `hashicorp/aws` é o mais maduro entre os três candidatos
  (menor risco de lacuna de recurso não suportado no momento do
  provisionamento real).

Se o custo real ou a paridade de serviço da AWS `sa-east-1` divergir do
esperado durante a operação real (ex.: tipo de instância indisponível,
custo de replicação Multi-AZ acima do orçamento do piloto), isso será
sinalizado ao Software Architect como limitação de infraestrutura não
prevista no `SDD.md` — não decidido unilateralmente pelo DevOps (guardrail).
Nenhuma sinalização desse tipo foi necessária até o momento, porque nenhum
recurso foi provisionado de fato ainda.

---

## 3. Infraestrutura como Código (`infra/`)

Terraform, estrutura `modules/` (blocos reutilizáveis, sem parâmetro de
ambiente) + `environments/{staging,production}` (mesma base de módulos,
parâmetros diferentes) + `bootstrap/` (backend remoto de state, execução
manual única) — conforme `cicd-iac-foundations` e critério de aceite de
`infrastructure-as-code-provisioning`.

| Componente SDD.md §3 | Módulo Terraform | Caminho |
|---|---|---|
| PostgreSQL (RLS, ADR-006) | `database` | `infra/modules/database/` |
| Redis (sessão/cache/fila, ADR-007) | `cache` | `infra/modules/cache/` |
| Object Storage (laudo/imagem, SSE-KMS, região Brasil) | `object-storage` | `infra/modules/object-storage/` |
| Rede privada (Integration/Imaging Gateway não expostos) | `network` | `infra/modules/network/` |
| Aplicação core, Integration Gateway, Imaging Gateway (ECS Fargate) | `ecs-service` (reutilizado 3x) | `infra/modules/ecs-service/` |
| Web App (SPA) + API/BFF (borda pública, WAF, TLS) | `edge` | `infra/modules/edge/` |
| Secrets (credenciais, API key de serviço BE-09) | `secrets` | `infra/modules/secrets/` |
| Fundação de observabilidade (SNS, alarmes base) | `observability` | `infra/modules/observability/` |

### 3.1 Como cada guardrail de infraestrutura foi respeitado (código, não promessa)

- **Nenhum componente de dado exposto publicamente** (`GUARDRAILS.md` #16,
  SDD.md §7.5): `modules/database`, `modules/cache` têm `publicly_accessible
  = false` / subnets `data` sem rota para Internet Gateway
  (`infra/modules/network/main.tf`, `aws_route_table "data"`).
- **Integration Gateway e Imaging Gateway nunca expostos à internet**
  (`GUARDRAILS.md` #14): rodam em subnets `integration` privadas, sem
  `target_group`/ALB associado; comunicação com o Core via AWS Cloud Map
  (Service Discovery interno) + security group que só libera origem da
  aplicação core. Canal dedicado do hospital (MLLP/DICOM) é `ingress`
  condicional (`var.enable_hospital_channel`, default `false`) até o
  protocolo real do piloto ser confirmado (PRD-TECNICO.md, Premissa P1) —
  ver `infra/modules/network/main.tf`, security group `integration`.
- **Object Storage criptografado SSE-KMS, região Brasil**
  (`GUARDRAILS.md` #22/#24): `infra/modules/object-storage/main.tf`,
  `aws_s3_bucket_server_side_encryption_configuration` com `sse_algorithm =
  "aws:kms"` + bucket policy que nega `PutObject` sem esse algoritmo e nega
  qualquer requisição fora de TLS (`aws:SecureTransport = false`).
  `bucket_key_enabled = true` reduz custo de chamada KMS sem enfraquecer a
  garantia.
- **TLS 1.2 como piso obrigatório** (`GUARDRAILS.md` #21): ALB usa
  `ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"` (piso 1.2, preferência
  1.3); CloudFront usa `minimum_protocol_version = "TLSv1.2_2021"`.
- **Nenhum secret em texto plano na definição de infraestrutura**
  (critério de aceite de `infrastructure-as-code-provisioning`): credenciais
  de banco, auth token do Redis e a API key de serviço dedicada
  (Integration/Imaging Gateway → Core, SDD.md §7.1/`TASK.md` BE-09) são
  geradas com `random_password` e armazenadas exclusivamente no AWS Secrets
  Manager (`infra/modules/secrets/`), referenciadas por ARN nas task
  definitions do ECS — nunca como variável de ambiente literal. Nenhum
  `terraform.tfvars` deste repositório contém valor sensível (conferir
  `infra/environments/*/terraform.tfvars`).
- **Isolamento multi-tenant (ADR-004/ADR-006)**: RLS e `pgcrypto` são
  responsabilidade de migration da aplicação (BE-02/BE-03), fora do escopo
  do Terraform — o módulo `database` só garante o "berço" seguro (rede
  privada, criptografia em repouso, backup). Registrado explicitamente em
  `infra/README.md` para não gerar falsa impressão de que RLS já está
  coberto pela infraestrutura.

### 3.1.1 Correção de `SEC-DEBT-002` (wiring de secrets, 2026-09-03)

`SECURITY-REVIEW.md` "Lote 1" registrou `SEC-DEBT-002`: a task definition do
ECS injetava os segredos de banco/Redis como um único blob JSON
(`DATABASE_CREDENTIALS`, `REDIS_AUTH`), mas o código do Backend
(`backend/src/redis/redis-config.ts` — `REDIS_HOST`/`REDIS_PORT`/
`REDIS_PASSWORD`/`REDIS_TLS`; `backend/src/database/database.module.ts` —
`APP_DATABASE_URL` como connection string única) sempre esperou variáveis de
ambiente planas. Prazo registrado: "antes do primeiro deploy real em
staging" — exatamente esta entrega. Corrigido **em código**, sem reintroduzir
nenhum segredo em texto plano:

- **Redis**: `infra/environments/{staging,production}/main.tf` passou a
  referenciar cada chave do secret JSON (`redis_auth`, inalterado em
  `infra/modules/secrets/main.tf`) individualmente, via a sintaxe nativa do
  ECS de seleção de chave dentro do secret (`"<secret-arn>:<json-key>::"`) —
  `REDIS_HOST` ← chave `primary_endpoint`, `REDIS_PASSWORD` ← chave
  `auth_token`. Nenhum entrypoint de parse, nenhum script adicional.
  `REDIS_TLS = "true"` passou a ser setado como variável de ambiente comum
  (não é segredo) em ambos os ambientes, para bater com
  `transit_encryption_enabled = true` do `infra/modules/cache/main.tf` — sem
  essa correção a aplicação tentaria conectar sem TLS a um Redis que só
  aceita TLS, e falharia silenciosamente para `tls: false` (mesmo anti-padrão
  que a revisão pós-implementação de BE-08 já havia corrigido para
  `OBJECT_STORAGE_FORCE_PATH_STYLE`).
- **Database**: uma connection string não pode ser remontada por seleção de
  chave JSON isolada (não existe concatenação no `valueFrom` do ECS), então
  `infra/modules/secrets/main.tf` passou a gerar uma senha dedicada para a
  role de runtime `portalmed_app` (`random_password.app_db_role`, sem
  caracteres especiais, para nunca exigir URL-encoding manual) e a montar o
  próprio valor de `APP_DATABASE_URL` como um novo secret
  (`aws_secretsmanager_secret.app_database_url`) — role de menor privilégio
  (`backend/migrations/1788336900000_create-app-database-role.ts`), nunca a
  role master. Um segundo secret (`migration_database_url`) foi criado com a
  connection string da role master, para uso exclusivo de um futuro job de
  migration (equivalente ao `DATABASE_URL` de `backend/.env.example`) — nunca
  injetado na task definition da aplicação em runtime. O secret original
  `database_credentials` (JSON com host/usuário/senha separados) foi mantido
  sem alteração para acesso operacional/break-glass via console, mas **saiu**
  da lista `secrets`/`secret_arns` da task definition do serviço `core` (não
  é mais lido pela aplicação).
- Nenhum `.tf`/`.tfvars` deste repositório ganhou valor sensível literal —
  toda senha nova continua gerada por `random_password` e vive só no Secrets
  Manager, exatamente como o restante do módulo já fazia.

**Gap relacionado, descoberto durante esta correção, registrado para
transparência (não é o escopo de `SEC-DEBT-002`, não bloqueia esta entrega)**:
não existe ainda, em nenhum workflow (`backend-ci.yml`) ou task ECS dedicada,
um passo que execute `node-pg-migrate` (criação de schema + a migration
`create-app-database-role`) contra o banco real de um ambiente. O secret
`migration_database_url` e a senha de `portalmed_app`
(`app_db_role_password_arn`) já estão preparados para alimentar esse passo
quando ele for desenhado, mas a orquestração em si (quando/como rodar
migration antes do primeiro tráfego real) ainda não existe. Como nenhum
`terraform apply` real ocorreu nesta entrega (Seção 8), este gap não é
observável no ambiente real ainda — fica registrado aqui para não represar
essa lacuna quando uma conta AWS real existir.

### 3.1.2 Correção de `SEC-DEBT-003` (privilégio IAM excessivo em `imaging_gateway_service`, 2026-09-05)

`SECURITY-REVIEW.md` "Lote 2" registrou `SEC-DEBT-003`: o módulo
`imaging_gateway_service` em `infra/environments/{staging,production}/main.tf`
concedia `s3:PutObject` no bucket de Object Storage ao container do Orthanc,
com o comentário "Orthanc precisa gravar o JPEG/PNG convertido no Object
Storage" — comentário que a própria auditoria de DevSecOps confirmou como
factualmente incorreto contra a implementação real de BE-07: quem grava no
Object Storage é o `ImagingConversionProcessor`, rodando dentro de
`core_service` (que já detém `s3:GetObject`+`s3:PutObject` sobre o mesmo
bucket, linha ~222-227 de cada ambiente); o Orthanc nunca chama a API do S3
diretamente (confirmado por leitura completa de `on-stable-study.lua` e de
todo `backend/src/imaging-gateway/`, nenhuma chamada AWS SDK/S3 fora do
processo do core). Prazo registrado: "antes do primeiro deploy real em
staging com tráfego de DICOM do hospital piloto" — dono DevOps.

**Avaliação de risco de regressão antes de corrigir**: o achado é puramente
de excesso de privilégio (Orthanc nunca usa a permissão concedida), não de
privilégio faltante — remover `s3:PutObject` de `imaging_gateway_service`
não pode quebrar nenhum fluxo real, porque nenhum código do serviço a
exercita. `task_policy_json` é uma variável opcional do módulo
`ecs-service` (`default = null`,
`infra/modules/ecs-service/variables.tf`), e o recurso
`aws_iam_role_policy.task_custom` só é criado quando ela é não-nula
(`count = var.task_policy_json != null ? 1 : 0`,
`infra/modules/ecs-service/main.tf`) — omitir o argumento inteiramente
significa, de forma limpa, "nenhuma IAM policy adicional anexada à task
role", sem placeholder vazio nem efeito colateral em outro recurso. Correção
de baixo risco, aplicada imediatamente em vez de apenas documentada como
pendência:

- `infra/environments/staging/main.tf` e
  `infra/environments/production/main.tf`: bloco `task_policy_json` do
  módulo `imaging_gateway_service` removido por completo em ambos os
  ambientes; comentário corrigido para registrar explicitamente por que
  nenhuma permissão de Object Storage é necessária ali, e onde a permissão
  real (equivalente, no `core_service`) já vive.
- Nenhum outro parâmetro do serviço (`environment`, `secrets`,
  `service_discovery_registry_arn`, rede) foi alterado — mudança isolada ao
  escopo exato do achado.
- Como nenhum `terraform apply` real ocorreu ainda neste ambiente de
  execução (Seção 8), esta correção não pôde ser confirmada contra um
  `terraform plan`/`apply` real (ex.: destroy do `aws_iam_role_policy`
  específico deste serviço, se algum `apply` anterior já o tivesse criado).
  Isso é consistente com todo o restante deste `DEPLOY.md`: infraestrutura
  como código corrigida e pronta, aplicação real pendente da mesma limitação
  de ambiente da Seção 7/8.

### 3.2 Paridade staging/produção

Ambos os ambientes instanciam exatamente os mesmos módulos
(`infra/environments/{staging,production}/main.tf`); a única diferença é
parâmetro:

| Parâmetro | Staging | Produção | Racional |
|---|---|---|---|
| RDS `multi_az` | `false` | `true` | SDD.md §6.1 classifica "banco sem redundância" como risco **Alta** severidade — Multi-AZ é a mitigação em produção. |
| RDS `instance_class` | `db.t4g.medium` | `db.r6g.large` | Volume do piloto (1 hospital, SDD.md §6.2 — sem escala multi-hospital no MVP) não justifica instância maior em staging. |
| ElastiCache `num_cache_clusters`/`automatic_failover_enabled` | `1`/`false` | `2`/`true` | SDD.md §6.1 classifica "Redis indisponível impede toda sessão" como risco **Alta** severidade — failover automático é a mitigação em produção. |
| ECS `desired_count` (core) | `1` | `2` | HA de aplicação em produção; staging não precisa (RNF-09: disponibilidade best-effort no piloto). |
| `deletion_protection` (RDS) | `false` | `true` | Evita destruição acidental de dado de saúde em produção. |
| Integration/Imaging Gateway `desired_count` | `1` | `1` (ambos) | SDD.md §6.1 aceita esse componente como ponto único de falha no MVP, mitigado por health check + restart automático (`deployment_circuit_breaker` no ECS) — dívida técnica já reconhecida no SDD.md, não uma lacuna desta entrega. |

---

## 4. Pipeline de CI/CD (`.github/workflows/`)

| Workflow | Gatilho | Estágios |
|---|---|---|
| `backend-ci.yml` | PR/push em `backend/**` | lint (`oxlint` + fronteira de módulo) → teste unitário/integração → e2e → build TypeScript → **teste de vazamento cruzado entre tenants (bloqueante, `GUARDRAILS.md` regra A.4/BE-04)** → build/push de imagem (ECR, só em `main`) → deploy automático em staging |
| `frontend-ci.yml` | PR/push em `frontend/**` | lint → teste unitário (inclui asserts de acessibilidade por tela, `GUARDRAILS.md` #32) → build → deploy automático em staging (S3 + invalidação CloudFront) |
| `infra-ci.yml` | PR em `infra/**` (plan) / `workflow_dispatch` (apply) | `terraform fmt`/`validate` → `tflint` → `checkov` (scan de segurança de IaC) → `terraform plan` comentado no PR → `apply` só manual, com `environment` do GitHub exigindo aprovação |
| `deploy-production.yml` | `workflow_dispatch` manual, com input `build_version` + confirmação explícita de rollback testado | `gate_check` (verifica textualmente `QA-REPORT.md` e `SECURITY-REVIEW.md` aprovados) → `deploy` (roda só sob `environment: production`, que exige aprovador humano configurado no GitHub) → smoke test → lembrete de fechamento do ciclo |
| `rollback-production.yml` | `workflow_dispatch` manual | reverte o serviço ECS core para a task definition estável anterior (ARN informado) + smoke test pós-rollback |
| `security-scan.yml` (DevSecOps, já existente) | Todo push/PR, repositório inteiro | `gitleaks` (segredo) → `semgrep` (SAST) → `npm audit`/OSV Scanner (dependência, backend e frontend) — cobre o estágio "scan de segurança (dependências/segredos)" do framework de `cicd-pipeline-configuration` de forma centralizada, não duplicado dentro de `backend-ci.yml`/`frontend-ci.yml` |

### 4.1 Coordenação com BE-01 (CI básico do Backend) e com o DevSecOps

`TASK.md` BE-01 já prevê "pipeline de CI roda lint+test em todo PR" como
critério de aceite da tarefa de setup do monolito. Durante esta entrega,
`backend/` e `frontend/` passaram a existir no repositório em paralelo
(scaffold NestJS/React de BE-01/FE-01). Houve uma colisão real de arquivo:
o Backend já havia publicado seu próprio `.github/workflows/backend-ci.yml`
(job `lint-and-test`, Node 24.x, `lint:oxlint` + `lint:boundaries`, `test`,
`test:e2e`, `build`) no mesmo caminho onde este agente havia escrito uma
versão mais completa antes de checar o estado real do repositório.
Reconciliação aplicada (não um overwrite cego em nenhuma direção): a versão
do Backend foi lida e **preservada como está** (decisões de detalhe dele —
versão de Node, separação de lint — não descartadas), e estendida com os
estágios que faltavam para `cicd-pipeline-configuration`: job
`tenant-isolation-test` (bloqueante, regra A.4 do `GUARDRAILS.md`), job
`build-and-push` (empacotamento de imagem, ECR) e job `deploy-staging`
(deploy automático). `frontend-ci.yml` não teve colisão — apenas ajustado
para os scripts reais confirmados em `frontend/package.json` (`test:coverage`
em vez do `test -- --coverage` presumido inicialmente).

Uma exceção esperada permanece: `test:tenant-isolation` (regra A.4 do
`GUARDRAILS.md`) ainda **não existe** em `backend/package.json` — é o
critério de aceite de `BE-04`, ainda "A Fazer" no `TASK.md`. Isso é
intencional: o job já está no pipeline desde agora, para que nenhum PR de
acesso a dado consiga ser mergeado antes de `BE-04` existir, em vez do gate
ser adicionado só depois, retroativamente.

`.github/workflows/security-scan.yml` já existia (produzido pelo DevSecOps,
`static-security-analysis`, com o mesmo padrão de no-op gracioso até
`package-lock.json` existir) — sem conflito de nome de arquivo com os
workflows desta entrega; os dois pipelines são complementares (o do
DevSecOps cobre SAST/secret-scan/dependência de forma contínua desde o
início do repositório; `backend-ci.yml`/`frontend-ci.yml` cobrem build/
lint/teste/deploy). `.github/workflows/` é propriedade de
`cicd-pipeline-configuration` (DevOps) a partir desta entrega para os
workflows de build/deploy; qualquer divergência futura de nome de script é
registrada em `BLOCKERS.md`, nunca resolvida unilateralmente.

`backend/Dockerfile` (multi-stage, usuário não-root, healthcheck) foi
adicionado nesta entrega — empacotamento de imagem é estágio de
`cicd-pipeline-configuration`, e nenhuma tarefa do `TASK.md` cobria esse
artefato. Alinhado ao `package.json` atual (`start:prod` → `node dist/main`,
porta 3000) — a validar contra o runtime real conforme BE-02+ evoluir. O
frontend não precisa de Dockerfile: é build estático servido via S3 +
CloudFront (`modules/edge`), não um container.

### 4.2 Gestão de secrets no pipeline

- Nenhuma chave AWS estática em secret do GitHub — autenticação via **OIDC**
  (`aws-actions/configure-aws-credentials` assume role, `permissions:
  id-token: write`), role com escopo mínimo por finalidade (deploy vs.
  `terraform plan` vs. `terraform apply`).
- Segredo de aplicação (credencial de banco, auth token Redis, API key de
  serviço) nunca passa pelo YAML do workflow — vive só no AWS Secrets
  Manager, injetado diretamente na task definition do ECS.
- `gitleaks` roda em todo PR de `backend/`/`frontend/` como estágio
  bloqueante (scan de segredo vazado no próprio código).

### 4.3 Gate de produção — dupla aprovação, nunca automático

`deploy-production.yml` só é acionável manualmente (`workflow_dispatch`), e
o job `gate_check` falha o pipeline (não segue "mesmo assim") se:
- `.md/QA-REPORT.md` não existir ou não contiver veredito
  "Aprovado"/"Aprovado com ressalvas";
- `.md/SECURITY-REVIEW.md` não existir ou não contiver veredito
  "Aprovado"/"Aprovado com débito registrado";
- o input `confirm_rollback_tested` não for marcado `true`.

Além disso, o job `deploy` roda sob `environment: production` do GitHub, que
exige aprovador humano configurado nas proteções do repositório (ver Seção
7) — segunda camada de gate, humana, sobre a checagem automatizada. Débito
de segurança de severidade baixa com prazo registrado pelo DevSecOps **não**
pausa esse fluxo adicionalmente — já é uma decisão tomada no
`SECURITY-REVIEW.md`, mesma lógica da aprovação condicional do QA.

---

## 5. Estratégia de Rollback

Mecanismo definido como código, não só documentado:

1. **Automático (primeira linha de defesa)**: `deployment_circuit_breaker`
   habilitado em todo `aws_ecs_service` (`infra/modules/ecs-service/main.tf`)
   — se a nova task definition falhar o health check, o ECS reverte sozinho
   para a versão estável anterior, sem intervenção manual.
2. **Manual (segunda linha)**: `rollback-production.yml` reverte o serviço
   para uma task definition ARN específica; `deploy-production.yml` já
   captura e guarda (`upload-artifact`) a task definition anterior antes de
   cada deploy, exatamente para alimentar esse fluxo sem precisar caçar o
   ARN estável manualmente sob pressão de incidente.
3. **SPA**: rollback é `aws s3 sync` do build anterior + nova invalidação de
   CloudFront (artifact de build do `frontend-ci.yml` retido por 7 dias).

**Pendência explícita antes de qualquer deploy real em produção**: este
mecanismo ainda **não foi exercitado** (nenhum `terraform apply` real
ocorreu). O guardrail de DevOps é claro — rollback "na teoria" não conta.
Um drill de rollback contra o ambiente de staging (deploy intencionalmente
quebrado → rollback via `rollback-production.yml` → confirmação de
recuperação) é pré-requisito obrigatório antes de qualquer
`deploy-production.yml` real, e será registrado nesta mesma seção quando
`deployment-execution` rodar.

---

## 6. Observabilidade (fundação provisionada, afinação pendente)

`infra/modules/observability/` provisiona a fundação: tópico SNS de alerta,
log groups do ECS (`awslogs`, retenção configurável), e alarmes CloudWatch
base cobrindo os dois riscos de severidade "Alta" do `SDD.md` §6.1 (CPU do
RDS, indisponibilidade/CPU do Redis) mais ALB 5xx e CPU do serviço core.

Isso é **fundação de infraestrutura**, não a entrega completa de
`observability-setup` — dashboards por exame (correlacionando com
`EXAM_FILE`/UIDs DICOM do ADR-012 para o monitoramento por exame que RF-07
promete), afinação de threshold com dado real de produção e integração com
canal de plantão da equipe de suporte (RN-13) são trabalho de
`observability-setup`, que roda como parte de `deployment-execution`, depois
da dupla aprovação — não antes, porque não há tráfego real para calibrar
contra.

---

## 7. Pré-requisitos operacionais antes do primeiro `terraform apply` real

Reverificados ativamente em 2026-09-03 (tentativa real de
`deployment-execution` do Lote 1) e novamente em 2026-09-04 (tentativa real
de `deployment-execution` do Lote 3, mesmo resultado) — resultado da
verificação genuína de acesso a conta AWS real neste ambiente de execução:
**nenhuma credencial AWS configurada** (`aws sts get-caller-identity` →
binário `aws` inexistente neste ambiente; nenhuma variável `AWS_*` no
processo; nenhum `~/.aws/`). Binário `terraform` também não está disponível
neste ambiente. Nenhum destes itens pôde ser executado por essa razão —
permanecem como condição de entrada real para a próxima execução de
`deployment-execution` que tiver acesso a uma conta AWS de fato:

- [ ] `infra/bootstrap/` aplicado uma única vez (bucket S3 + DynamoDB de
      state) em conta AWS real.
- [ ] Roles IAM de OIDC (`AWS_DEPLOY_ROLE_ARN`,
      `AWS_TERRAFORM_PLAN_ROLE_ARN`, `AWS_TERRAFORM_APPLY_ROLE_ARN`) criadas
      e registradas como secrets do repositório GitHub.
- [ ] Ambientes `staging` e `production` configurados em Settings →
      Environments do GitHub; `production` com **required reviewers**
      (aprovação humana obrigatória) — esta é a configuração que materializa
      o "deploy em produção sempre pausa para validação explícita do
      usuário".
- [ ] Domínio real definido e `terraform.tfvars` de cada ambiente atualizado
      (valores atuais são placeholder `example.com.br`/`REPLACE_ME`).
- [ ] Drill de rollback executado em staging (Seção 5) antes do primeiro
      deploy real de produção.
- [ ] `enable_hospital_channel` permanece `false` até o protocolo real do
      hospital piloto (HL7 MLLP/FHIR/DICOM) ser confirmado — PRD-TECNICO.md,
      Premissa P1, ainda em aberto.

**Item resolvido nesta entrega, fora desta lista** (não dependia de conta AWS
real): `SEC-DEBT-002` — ver Seção 3.1.1.

---

## 8. Execuções de Deploy

| Versão | Ambiente | Horário | Resultado |
|---|---|---|---|
| Lote 1 (BE-01, BE-02, BE-05, BE-08, FE-01 a FE-04) | staging | 2026-09-03 | **Bloqueado por limitação de ambiente de execução — não é deploy concluído, não é incidente, não é achado de segurança/reprovação de QA.** Ver detalhamento abaixo. |
| Lote 3 (BE-03, BE-04 — Guard de aplicação + RLS + suíte de vazamento cruzado) | staging | 2026-09-04 | **Bloqueado pela mesma limitação de ambiente de execução do Lote 1 — reverificada de forma genuína, não presumida. Não é deploy concluído, não é incidente, não é achado de segurança/reprovação de QA.** Ver "Detalhamento da tentativa de 2026-09-04 (Lote 3)" abaixo. |
| Lote 2 (BE-06, BE-07, BE-09 — Motor HL7/FHIR, Imaging Gateway) | staging | 2026-09-05 | **Bloqueado pela mesma limitação de ambiente de execução do Lote 1/Lote 3 — reverificada de forma genuína, não presumida. Não é deploy concluído, não é incidente, não é achado de segurança/reprovação de QA.** Ver "Detalhamento da tentativa de 2026-09-05 (Lote 2)" abaixo. |

**Detalhamento da tentativa de 2026-09-03**:

1. Dupla aprovação confirmada antes de iniciar: `QA-REPORT.md` §4.8
   (Aprovado com ressalvas) + `SECURITY-REVIEW.md` "Lote 1" (Aprovado com
   débito registrado) + `LOTE-LOG.md` (Tech Lead, Aprovado com ressalvas,
   integridade de decomposição confirmada) — as três condições de entrada de
   `deployment-execution` para este lote estavam satisfeitas.
2. `SEC-DEBT-002` (prazo: "antes do primeiro deploy real em staging", ou
   seja, exatamente esta execução) foi resolvido em código antes de
   qualquer tentativa de `apply` — ver Seção 3.1.1. Nenhum segredo em texto
   plano foi introduzido no repositório para viabilizar essa correção.
3. Verificação genuína de acesso a uma conta AWS real neste ambiente de
   execução, **antes de presumir que não havia**: `aws sts
   get-caller-identity` — binário `aws` não encontrado; nenhuma variável de
   ambiente `AWS_*`; nenhum diretório `~/.aws/`; binário `terraform` também
   ausente. Não há credencial de nenhuma cloud provisionada para este
   agente. Não há, portanto, ambiente de staging real acessível para onde
   fazer o deploy.
4. Consequência: `infra/bootstrap/` nunca foi aplicado, nenhuma role IAM de
   OIDC existe, nenhum `terraform apply` foi executado, nenhum recurso AWS
   foi criado, nenhum drill de rollback foi exercitado contra infraestrutura
   real (a Seção 5 permanece "mecanismo definido como código, não
   exercitado"), nenhuma observabilidade está ativa com tráfego real, e
   nenhum smoke test rodou contra uma URL real.
5. **Nenhum output de `terraform apply`/`aws ecs`/smoke test foi inventado ou
   simulado neste registro.** Esta linha da tabela documenta honestamente
   uma limitação de ambiente de execução (falta de acesso a conta cloud
   real), não um "deploy concluído". Por guardrail de DevOps, isso também
   não é tratado como pausa obrigatória aguardando confirmação do CTO — não
   é um achado de segurança nem uma reprovação de QA; é simplesmente a
   ausência, neste ambiente, do recurso de infraestrutura necessário para
   executar a ação.

**Quando uma conta AWS real existir**, a sequência a seguir (não executada
ainda) é: `infra/bootstrap/` → roles OIDC + GitHub Environments (Seção 7) →
`terraform apply` em `infra/environments/staging/` → drill de rollback real
(deploy intencionalmente quebrado → `rollback-production.yml` adaptado/
equivalente para staging → confirmação de recuperação, Seção 5) → smoke test
(`GET /api/health`) → só então preencher esta tabela com uma linha de
sucesso e avançar `observability-setup`/`non-functional-requirement-
validation` contra infraestrutura real.

**Detalhamento da tentativa de 2026-09-04 (Lote 3)**:

1. Dupla aprovação confirmada antes de iniciar: `QA-REPORT.md` Seção 5.6
   (Aprovado, sem ressalvas, 2026-09-03) + `SECURITY-REVIEW.md` "Lote 3"
   (Aprovado, após correção e revalidação independente de `SEC-BUG-001`,
   2026-09-04) + `LOTE-LOG.md` "Lote 3" (Tech Lead, Aprovado, integridade de
   decomposição confirmada) — as três condições de entrada de
   `deployment-execution` para este lote estavam satisfeitas, sem nenhum
   achado Alta/Crítica em aberto e sem débito de segurança pendente que
   exigisse pausa.
2. Nenhum item novo de correção de código era pré-requisito para esta
   tentativa (diferente do Lote 1/`SEC-DEBT-002`) — `SEC-BUG-001` já havia
   sido corrigido e fechado pelo próprio DevSecOps antes deste dispatch
   (`LOTE-LOG.md` "Lote 3", Veredito de DevSecOps).
3. Verificação genuína de acesso a uma conta AWS real neste ambiente de
   execução, **repetida nesta data, não herdada por presunção da tentativa
   anterior**: `aws --version`/`aws sts get-caller-identity` — binário `aws`
   não encontrado (`command not found`); nenhuma variável de ambiente
   `AWS_*` (`AWS_ACCESS_KEY_ID`, `AWS_PROFILE` vazias); nenhum diretório
   `~/.aws/`; `terraform --version` — binário `terraform` também ausente;
   busca adicional por instalação nativa do Windows (`where.exe aws`,
   `where.exe terraform`, caminho padrão do AWS CLI v2) também não
   encontrou nenhum dos dois binários. O ambiente de execução deste agente
   é exatamente o mesmo (mesma máquina/sessão de shell) do Lote 1 — o
   resultado idêntico é esperado, e foi confirmado, não presumido.
4. Consequência, idêntica à do Lote 1: `infra/bootstrap/` continua nunca
   aplicado, nenhuma role IAM de OIDC existe, nenhum `terraform apply` foi
   executado, nenhum recurso AWS foi criado (nem os já provisionados pelo
   código do Lote 1, nem novos), nenhum drill de rollback foi exercitado
   contra infraestrutura real (Seção 5 permanece "mecanismo definido como
   código, não exercitado"), nenhuma observabilidade está ativa com tráfego
   real, e nenhum smoke test rodou contra uma URL real. Os itens da Seção 7
   (checklist de pré-requisitos operacionais) permanecem todos não
   marcados, sem nenhuma alteração de estado desde 2026-09-03.
5. **Nenhum output de `terraform apply`/`aws ecs`/smoke test foi inventado ou
   simulado neste registro.** Esta linha da tabela documenta honestamente
   uma limitação de ambiente de execução (falta de acesso a conta cloud
   real) — a mesma do Lote 1, não um novo achado de arquitetura ou de
   infraestrutura provisionada. Por guardrail de DevOps, isso não é tratado
   como pausa obrigatória aguardando confirmação do CTO — não é um achado
   de segurança nem uma reprovação de QA; é a ausência, neste ambiente, do
   recurso de infraestrutura necessário para executar a ação. Nenhuma
   sinalização ao Software Architect é aplicável por este motivo (Seção 10)
   — não há infraestrutura real provisionada para revelar divergência de
   custo/escala frente ao `SDD.md`.
6. **Deploy em produção**: fora de escopo desta tentativa e não cogitado —
   mesmo que o deploy de staging tivesse sido possível, produção sempre
   exige pausa obrigatória para validação explícita do usuário, que este
   dispatch não solicitou.

**Detalhamento da tentativa de 2026-09-05 (Lote 2)**:

1. Dupla aprovação confirmada antes de iniciar: `QA-REPORT.md` Seção 6.7
   (Aprovado com ressalvas, 2026-09-04 — débito `QA-DEBT-017`, dono
   Backend, prazo "antes do primeiro deploy em staging com tráfego real de
   imagem") + `SECURITY-REVIEW.md` "Lote 2" (Aprovado com débito
   registrado, 2026-09-05, após uma iteração de bloqueio: achado Alta
   `SEC-BUG-002` corrigido pelo Backend e revalidado de forma independente
   pelo próprio DevSecOps, Bloqueio 005 fechado como Resolvido) +
   `LOTE-LOG.md` "Lote 2" (Tech Lead, Aprovado com ressalvas, integridade
   de decomposição confirmada) — as três condições de entrada de
   `deployment-execution` para este lote estavam satisfeitas.
2. **Leitura do débito com prazo condicional a tráfego real, mesma lógica
   já aplicada a `QA-DEBT-016` no Lote 1**: `QA-DEBT-017` (fila
   `imaging-conversion` sem retry/backoff) tem prazo "antes do primeiro
   deploy em staging **com tráfego real de imagem**", não "antes deste
   deploy em si". Um deploy de staging sem tráfego real ainda não atinge
   essa condição — não é bloqueio deste passo, dono é Backend, nenhuma ação
   deste agente é devida aqui além de registrar que o prazo permanece
   monitorado.
3. **`SEC-DEBT-003` (privilégio IAM excessivo `s3:PutObject` em
   `imaging_gateway_service`, dono DevOps — ação deste agente)**: avaliado
   como corrigível agora sem risco de regressão (Seção 3.1.2 — a permissão
   nunca é exercitada pelo código real do Orthanc, e a variável do módulo
   que a concede é opcional, com efeito limpo quando omitida). Corrigido
   **em código** antes de prosseguir: `infra/environments/staging/main.tf`
   e `infra/environments/production/main.tf` tiveram o bloco
   `task_policy_json` de `imaging_gateway_service` removido, com comentário
   atualizado explicando a decisão. Como nenhum `apply` real ocorreu ainda
   (item 4 abaixo), não há recurso IAM real em conta AWS para destruir —
   a correção elimina a concessão futura, não uma concessão já ativa.
   Prazo do débito ("antes do primeiro deploy real com tráfego de DICOM do
   hospital piloto") permanece, de qualquer forma, não atingido: não há
   deploy real de staging acontecendo nesta tentativa (item 4), logo não há
   tráfego DICOM real possível — a correção aplicada agora é proativa, não
   uma resposta a um prazo já vencido.
4. Verificação genuína de acesso a uma conta AWS real neste ambiente de
   execução, **repetida nesta data, não herdada por presunção das
   tentativas anteriores**: `which terraform`/`where.exe terraform` — não
   encontrado em nenhum diretório do `PATH`; `aws --version` — comando não
   encontrado; nenhuma variável de ambiente `AWS_*` no processo (`env | grep
   -i aws` vazio); nenhum diretório `~/.aws/`. O ambiente de execução deste
   agente é exatamente o mesmo (mesma máquina/sessão de shell) das duas
   tentativas anteriores — o resultado idêntico é esperado, e foi
   confirmado, não presumido.
5. Consequência, idêntica à do Lote 1/Lote 3: `infra/bootstrap/` continua
   nunca aplicado, nenhuma role IAM de OIDC existe, nenhum `terraform
   apply` foi executado, nenhum recurso AWS foi criado (nem os já
   provisionados pelo código dos lotes anteriores, nem novos, nem a remoção
   do IAM policy da Seção 3.1.2 pôde ser confirmada contra um `plan`/`apply`
   real), nenhum drill de rollback foi exercitado contra infraestrutura
   real (Seção 5 permanece "mecanismo definido como código, não
   exercitado"), nenhuma observabilidade está ativa com tráfego real, e
   nenhum smoke test rodou contra uma URL real. Os itens da Seção 7
   permanecem todos não marcados, sem nenhuma alteração de estado desde
   2026-09-03.
6. **Nenhum output de `terraform apply`/`aws ecs`/smoke test foi inventado ou
   simulado neste registro.** Esta linha da tabela documenta honestamente a
   mesma limitação de ambiente de execução dos Lotes 1 e 3 — não um novo
   achado de arquitetura ou de infraestrutura provisionada. Por guardrail de
   DevOps, isso não é tratado como pausa obrigatória aguardando confirmação
   do CTO — não é um achado de segurança nem uma reprovação de QA; é a
   ausência, neste ambiente, do recurso de infraestrutura necessário para
   executar a ação. Nenhuma sinalização ao Software Architect é aplicável
   por este motivo (Seção 10) — não há infraestrutura real provisionada
   para revelar divergência de custo/escala frente ao `SDD.md`.
7. **Deploy em produção**: fora de escopo desta tentativa e não cogitado —
   mesmo que o deploy de staging tivesse sido possível, produção sempre
   exige pausa obrigatória para validação explícita do usuário, que este
   dispatch não solicitou.

## 9. Incidentes Pós-Deploy

Nenhum — nenhum deploy real ocorreu, nem para o Lote 1 (2026-09-03), nem
para o Lote 3 (2026-09-04), nem para o Lote 2 (2026-09-05) (Seção 8), logo
não há janela de observação pós-deploy (24h) em curso para nenhum dos três
lotes. Esta seção permanece vazia até o primeiro `apply` real acontecer.

## 10. Sinalização ao Software Architect

Nenhuma limitação de **infraestrutura provisionada** foi identificada, porque
nenhum recurso foi de fato criado em conta AWS (Seção 8, Lotes 1, 3 e 2) —
não há dado real (custo, paridade de serviço, desempenho) para contrastar com
o `SDD.md` §6. A limitação identificada em todas as tentativas é de
**ambiente de execução deste agente** (sem acesso a conta cloud/credencial
AWS), não de arquitetura ou de infraestrutura provisionada — portanto não é
escalada ao Software Architect como limitação de infraestrutura (guardrail de
DevOps: só limitação real de infraestrutura provisionada diverge para lá).
Este item permanece para ser revisitado ativamente quando
`deployment-execution` provisionar a infraestrutura real pela primeira vez
(ex.: custo real de Multi-AZ/failover pode divergir da estimativa implícita
do `SDD.md` §6.2).

## 11. Fechamento do Ciclo (Gate 4)

**Ainda não aplicável para nenhum dos três lotes.** O Gate 4
(`PIPELINE-CONVENTIONS.md`) é o registro de fechamento do ciclo de governança
aberto no Gate 1 do CTO, reportado **depois** que um deploy real acontece e a
janela de observação pós-deploy (padrão 24h) se encerra sem incidente
crítico. As tentativas de 2026-09-03 (Lote 1), 2026-09-04 (Lote 3) e
2026-09-05 (Lote 2) (Seção 8) não constituem esse deploy real — todas foram
bloqueadas pela mesma limitação de ambiente de execução antes de qualquer
`apply`. Reportado ao CTO nesta entrega, como fechamento parcial/
intermediário do ciclo aberto no Gate 1: o Lote 1, o Lote 3 e o Lote 2 têm
dupla aprovação técnica completa (Lote 3 sem débito residual; Lote 1 e
Lote 2 com débitos residuais registrados, com dono e prazo, nenhum
bloqueante), mas o deploy real em staging (e, com mais razão, em produção)
permanece pendente de um ambiente de execução com acesso a conta AWS real,
para os três lotes igualmente. Esta seção será reaberta e preenchida por
`deploy-report-drafting` assim que `deployment-execution` rodar com sucesso
contra infraestrutura real.

---

## Checklist de Critérios de Pronto — IaC/CI-CD (2026-09-02) + `deployment-execution` do Lote 1 (2026-09-03) + Lote 3 (2026-09-04) + Lote 2 (2026-09-05)

- [x] Todo componente da `SDD.md` §3 tem definição de IaC correspondente
      (Seção 3 acima)
- [x] Staging e produção derivam da mesma base de IaC (`infra/modules/`),
      só parâmetro difere (Seção 3.2)
- [x] Infraestrutura dimensionada conforme a escalabilidade esperada do
      `SDD.md` §6 (Multi-AZ/failover só em produção, mitigando os dois
      riscos "Alta" severidade)
- [x] Nenhum secret em texto plano na definição de infraestrutura (Seção 3.1)
- [x] Todos os estágios do pipeline (build, lint, teste, scan de segurança,
      deploy) configurados (Seção 4)
- [x] Nenhum segredo exposto em log do pipeline (OIDC + Secrets Manager,
      Seção 4.2)
- [x] Gate de produção exige dupla aprovação (QA + DevSecOps), nunca deploy
      automático sem checagem (Seção 4.3)
- [x] Falha em qualquer estágio produz log diagnosticável (jobs nomeados,
      mensagens de erro explícitas nos gates)
- [x] `SEC-DEBT-002` resolvido em código antes do primeiro deploy real em
      staging, dentro do prazo registrado em `SECURITY-REVIEW.md`/
      `LOTE-LOG.md` (Seção 3.1.1)
- [x] `SEC-DEBT-003` resolvido em código de forma proativa (prazo real ainda
      não atingido — sem tráfego DICOM real possível neste ambiente), sem
      risco de regressão identificado (Seção 3.1.2)
- [ ] **Build em produção** — não aplicável ainda, para nenhum dos três
      lotes: esta entrega cobriu `staging` (Seção 8), produção segue fora de
      escopo desta chamada
- [ ] Rollback testado (não só definido) — pendente para todos os lotes,
      bloqueado pela mesma limitação de ambiente de execução da Seção 8 (não
      há infraestrutura real contra a qual exercitar o drill)
- [ ] Observabilidade ativa com tráfego real — fundação pronta em código
      (Seção 6), não ativa (nenhum recurso provisionado, Seção 8, nem para
      Lote 1, nem Lote 3, nem Lote 2)
- [x] Nenhuma limitação de **infraestrutura provisionada** identificada
      (nada foi provisionado) — a limitação real de todas as tentativas é de
      **ambiente de execução** (sem conta AWS acessível), registrada com
      honestidade na Seção 8, não maquiada como sucesso
- [ ] Janela pós-deploy de 24h sem incidente crítico — não aplicável, não
      houve deploy real de nenhum dos três lotes
- [x] Resultado reportado ao CTO (Gate 4, fechamento parcial — Seção 11)

**Veredito do DevOps para o Lote 3 (2026-09-04)**: dupla aprovação (QA
Aprovado sem ressalvas + DevSecOps Aprovado, sem débito residual após
correção de `SEC-BUG-001`) e integridade de decomposição (Tech Lead
Aprovado) confirmadas antes de iniciar. A tentativa real de
`deployment-execution` do Lote 3 em staging foi genuinamente reverificada
(não presumida, não herdada por atalho da tentativa anterior) e está
**bloqueada pela mesma limitação de ambiente de execução do Lote 1** —
nenhuma credencial/conta AWS nem binário `terraform` disponível para este
agente (Seção 7/8). Isso não é tratado como pausa obrigatória nem como
deploy concluído: é registrado com honestidade como pendência de ambiente,
idêntica à já registrada para o Lote 1, sem nenhum novo achado de
arquitetura/infraestrutura. Deploy em produção não foi cogitado nesta
tentativa — permanece fora de escopo, sujeito à pausa obrigatória de
validação explícita do usuário quando chegar sua vez. O critério de pronto
"deploy concluído com sucesso" (`deployment-execution`, Definition of Done)
**não foi atingido nesta entrega para o Lote 3** — nem foi simulado como
atingido.

**Veredito do DevOps para o Lote 2 (2026-09-05)**: dupla aprovação (QA
Aprovado com ressalvas — `QA-DEBT-017`, dono Backend, prazo condicional a
tráfego real de imagem, não bloqueante deste deploy — + DevSecOps Aprovado
com débito registrado, sem achado Alta/Crítica em aberto após correção e
revalidação independente de `SEC-BUG-002`) e integridade de decomposição
(Tech Lead Aprovado com ressalvas) confirmadas antes de iniciar.
`SEC-DEBT-003` (dono DevOps, ação deste agente) foi avaliado como corrigível
sem risco de regressão e corrigido em código (Seção 3.1.2) antes de
prosseguir, de forma proativa — o prazo real do débito ("antes do primeiro
deploy real com tráfego de DICOM") ainda não havia sido atingido, porque não
há deploy real de staging acontecendo nesta tentativa. A tentativa real de
`deployment-execution` do Lote 2 em staging foi genuinamente reverificada
(não presumida, não herdada por atalho das tentativas anteriores) e está
**bloqueada pela mesma limitação de ambiente de execução do Lote 1/Lote 3**
— nenhuma credencial/conta AWS nem binário `terraform` disponível para este
agente (Seção 7/8). Isso não é tratado como pausa obrigatória nem como
deploy concluído: é registrado com honestidade como pendência de ambiente,
idêntica à já registrada para os lotes anteriores, sem nenhum novo achado de
arquitetura/infraestrutura provisionada. Deploy em produção não foi cogitado
nesta tentativa — permanece fora de escopo, sujeito à pausa obrigatória de
validação explícita do usuário quando chegar sua vez. O critério de pronto
"deploy concluído com sucesso" (`deployment-execution`, Definition of Done)
**não foi atingido nesta entrega para o Lote 2** — nem foi simulado como
atingido.

**Veredito do DevOps para o Lote 1 (2026-09-03, mantido)**: `SEC-DEBT-002`
resolvido em código (Seção 3.1.1), dentro do prazo de "antes do primeiro
deploy real em staging". A tentativa real de `deployment-execution` do
Lote 1 em staging foi genuinamente verificada (não presumida) e está
**bloqueada por limitação de ambiente de execução** — nenhuma
credencial/conta AWS disponível para este agente (Seção 7/8). Isso não é
tratado como pausa obrigatória nem como deploy concluído: é registrado com
honestidade como pendência de ambiente, mantendo toda a infraestrutura como
código e o pipeline prontos para a primeira execução real assim que uma
conta AWS existir. O critério de pronto "deploy concluído com sucesso"
(`deployment-execution`, Definition of Done) **não foi atingido nesta
entrega** — nem foi simulado como atingido.

---

## Log de Alterações

| Data | Origem | Mudança | Motivo |
|---|---|---|---|
| 2026-09-02 | devops | Criação de `infra/` (Terraform: bootstrap, 8 módulos, 2 ambientes) e `.github/workflows/` (5 pipelines) + este `DEPLOY.md` inicial | Início da fase de execução — `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` rodam em paralelo à implementação, a partir do `SDD.md` aprovado no Gate 2, sem esperar nenhum build terminar |
| 2026-09-03 | devops | Correção de `SEC-DEBT-002`: `infra/modules/secrets/main.tf` passou a gerar `app_database_url`/`app_db_role_password`/`migration_database_url`; `infra/environments/{staging,production}/main.tf` passou a injetar `APP_DATABASE_URL`/`REDIS_HOST`/`REDIS_PASSWORD`/`REDIS_TLS` (nomes exatos que o código do Backend lê), em vez do blob JSON único anterior (`DATABASE_CREDENTIALS`/`REDIS_AUTH`) | Prazo do débito registrado em `SECURITY-REVIEW.md`/`LOTE-LOG.md`: "antes do primeiro deploy real em staging" — Lote 1 acabou de receber dupla aprovação (QA + DevSecOps) e integridade confirmada pelo Tech Lead |
| 2026-09-03 | devops | Tentativa real de `deployment-execution` (Lote 1, staging): verificação genuína de acesso a conta AWS (nenhuma credencial/binário `aws`/`terraform` disponível neste ambiente de execução) — deploy real **bloqueado por limitação de ambiente**, registrado honestamente na Seção 8, sem simular sucesso | Dupla aprovação (QA + DevSecOps) + integridade (Tech Lead) liberaram o Lote 1 para deploy; a limitação encontrada é de ambiente de execução do agente, não de infraestrutura/arquitetura — não escalada ao Software Architect (Seção 10), não é achado de segurança nem pausa obrigatória adicional |
| 2026-09-04 | devops | Tentativa real de `deployment-execution` (Lote 3 — BE-03/BE-04, staging): reverificação genuína (não herdada por presunção) de acesso a conta AWS neste mesmo ambiente de execução — `aws`/`terraform` continuam ausentes, nenhuma variável `AWS_*`, nenhum `~/.aws/` — deploy real **bloqueado pela mesma limitação de ambiente do Lote 1**, registrado honestamente na Seção 8 (nova subseção "Detalhamento da tentativa de 2026-09-04 (Lote 3)"), sem simular sucesso | Dupla aprovação (QA Aprovado + DevSecOps Aprovado, sem débito residual após fechamento de `SEC-BUG-001`) + integridade de decomposição (Tech Lead Aprovado) liberaram o Lote 3 para deploy; a limitação é de ambiente de execução do agente, idêntica à do Lote 1, não um novo achado de infraestrutura/arquitetura — não escalada ao Software Architect (Seção 10), não é achado de segurança nem pausa obrigatória adicional; deploy em produção não cogitado |
| 2026-09-05 | devops | Correção de `SEC-DEBT-003`: `infra/environments/{staging,production}/main.tf` tiveram o bloco `task_policy_json` (`s3:PutObject`) removido do módulo `imaging_gateway_service`, com comentário atualizado explicando que o Orthanc nunca acessa o Object Storage diretamente (Seção 3.1.2). Tentativa real de `deployment-execution` (Lote 2 — BE-06/BE-07/BE-09, staging): reverificação genuína de acesso a conta AWS neste mesmo ambiente de execução — `aws`/`terraform` continuam ausentes, nenhuma variável `AWS_*`, nenhum `~/.aws/` — deploy real **bloqueado pela mesma limitação de ambiente do Lote 1/Lote 3**, registrado honestamente na Seção 8 (nova subseção "Detalhamento da tentativa de 2026-09-05 (Lote 2)"), sem simular sucesso | Dupla aprovação (QA Aprovado com ressalvas — `QA-DEBT-017`, prazo condicional a tráfego real, não bloqueante — + DevSecOps Aprovado com débito registrado, sem achado Alta/Crítica em aberto após revalidação de `SEC-BUG-002`) + integridade de decomposição (Tech Lead Aprovado com ressalvas) liberaram o Lote 2 para deploy; `SEC-DEBT-003` era dono DevOps e foi corrigido proativamente por ser de baixo risco (excesso de privilégio nunca exercitado, variável opcional do módulo); a limitação de deploy real é de ambiente de execução do agente, idêntica aos lotes anteriores, não um novo achado de infraestrutura/arquitetura — não escalada ao Software Architect (Seção 10), não é achado de segurança nem pausa obrigatória adicional; deploy em produção não cogitado |
