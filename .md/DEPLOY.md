# DEPLOY.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: DevOps
**Data**: 2026-09-02
**Status**: **Em andamento — fase de preparação (IaC + CI/CD).** Nenhum deploy
real foi executado ainda. `terraform apply` não foi rodado contra nenhuma conta
AWS. Esta entrada registra o que foi provisionado **como código** e como o
pipeline foi desenhado, conforme `infrastructure-as-code-provisioning` e
`cicd-pipeline-configuration`, que rodam em paralelo à implementação, assim que
o `SDD.md` foi aprovado no Gate 2 — sem esperar nenhum build terminar.
**Input**: `SDD.md` (final, §3 stack, §6 riscos/escalabilidade, §7.5 superfície
de exposição) + `.md/adr/006-...md` + `.md/adr/010-...md` + `GUARDRAILS.md`
(39 regras, Seções A, E, I aplicáveis diretamente a esta entrega) + `TASK.md`
(Seção 3.1, BE-01 a BE-09 — infraestrutura de base do Backend)

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

Nenhum destes itens foi executado ainda — são condição de entrada para
`deployment-execution`, registrados aqui para rastreabilidade:

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

---

## 8. Execuções de Deploy

| Versão | Ambiente | Horário | Resultado |
|---|---|---|---|
| — | — | — | Nenhum deploy executado até o momento. Esta tabela é preenchida por `deployment-execution`, depois da dupla aprovação de QA e DevSecOps sobre o mesmo build. |

## 9. Incidentes Pós-Deploy

Nenhum — nenhum deploy foi executado ainda.

## 10. Sinalização ao Software Architect

Nenhuma limitação de infraestrutura real foi identificada até o momento —
esperado, já que nenhum recurso foi de fato provisionado em conta AWS nesta
etapa (apenas definição declarativa). Este item será revisitado
ativamente quando `deployment-execution` provisionar a infraestrutura real
pela primeira vez (ex.: custo real de Multi-AZ/failover pode divergir da
estimativa implícita do `SDD.md` §6.2, que já assume ausência de
escalabilidade horizontal multi-hospital no MVP).

## 11. Fechamento do Ciclo (Gate 4)

**Ainda não aplicável.** O Gate 4 (`PIPELINE-CONVENTIONS.md`) é o registro
de fechamento do ciclo de governança aberto no Gate 1 do CTO, reportado
**depois** que um deploy real acontece e a janela de observação pós-deploy
(padrão 24h) se encerra sem incidente crítico. Como nenhum deploy ocorreu
nesta entrega, esta seção permanece em aberto e será preenchida por
`deploy-report-drafting` na conclusão de `deployment-execution`.

---

## Checklist de Critérios de Pronto desta entrega (IaC + CI/CD, não deploy)

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
- [ ] Rollback testado (não só definido) — pendente, pré-requisito antes do
      primeiro deploy real (Seção 5/7)
- [ ] Observabilidade ativa com tráfego real — fundação pronta, afinação
      pendente de `deployment-execution` (Seção 6/7)
- [ ] Nenhuma limitação de infraestrutura real ainda avaliável — nenhum
      recurso provisionado de fato nesta etapa (Seção 10)

**Veredito do DevOps para esta entrega**: infraestrutura como código e
pipeline de CI/CD preparados e versionados, cobrindo integralmente a Seção 3
do `SDD.md` e a superfície de exposição da Seção 7.5, incorporando as regras
de infraestrutura/segurança do `GUARDRAILS.md` aplicáveis a esta fase
(Seções A, E, I). Nenhum deploy foi executado — aguardando dupla aprovação
de QA (`QA-REPORT.md`) e DevSecOps (`SECURITY-REVIEW.md`) sobre o mesmo
build antes de `deployment-execution` ser acionado, e o primeiro
`terraform apply`/deploy real de produção permanece condicionado à
validação explícita do usuário, conforme instrução desta rodada de
execução.

---

## Log de Alterações

| Data | Origem | Mudança | Motivo |
|---|---|---|---|
| 2026-09-02 | devops | Criação de `infra/` (Terraform: bootstrap, 8 módulos, 2 ambientes) e `.github/workflows/` (5 pipelines) + este `DEPLOY.md` inicial | Início da fase de execução — `infrastructure-as-code-provisioning` e `cicd-pipeline-configuration` rodam em paralelo à implementação, a partir do `SDD.md` aprovado no Gate 2, sem esperar nenhum build terminar |
