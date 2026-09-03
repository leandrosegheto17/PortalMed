# Migrations — BE-02 (`TASK.md`)

Schema base PostgreSQL multi-tenant, versionado, sem nenhuma lógica de
negócio (isso é escopo de tarefas posteriores — BE-10+). Guard de aplicação
de `tenant_id` e Row-Level Security (RLS) **não** estão aqui — são BE-03/
BE-04, de propósito.

> BE-03 acrescentou 2 migrations depois das 15 abaixo (`create-app-database-role`
> e `enable-row-level-security`) — ver `backend/docs/tenant-guard-and-rls.md`
> para o detalhe (role de runtime dedicada + política RLS por tabela). A
> ferramenta escolhida aqui em BE-02 (`node-pg-migrate`) continua sendo a
> única fonte de verdade do schema — BE-03 escolheu Kysely só como camada de
> **acesso** a dado (guard de aplicação), não como mecanismo de migration.

## Ferramenta escolhida: `node-pg-migrate`

Decisão do Backend, dentro da autoridade desta tarefa (`TASK.md` autoriza
escolher "TypeORM, Prisma ou Kysely + node-pg-migrate"), documentada aqui:

- BE-02 é **só schema/migration**, sem entidades/repositórios de acesso a
  dado (isso é BE-03 em diante). Acoplar a primeira migration a um ORM
  específico (TypeORM/Prisma) fixaria uma decisão de camada de acesso a
  dado — que ainda não precisa ser tomada — só para criar tabelas.
  `node-pg-migrate` é uma ferramenta de migration standalone (SQL puro via
  `MigrationBuilder`), independente de qual ORM/query builder BE-03 vier a
  escolher para o guard de aplicação.
- Dá controle explícito sobre recursos Postgres-específicos exigidos pelos
  ADRs desta tarefa (extensão `pgcrypto`, `CHECK` constraints, índice único
  parcial para `dicom_remote_ae_title`/`dicom_sop_instance_uid`) sem
  depender do quão bem um gerador de migration de ORM cobre esses recursos.
- Migrations são arquivos `.ts` (suportados nativamente via `jiti`, o loader
  interno do `node-pg-migrate` — nenhuma transpilação/config extra
  necessária), com `up`/`down` explícitos ou auto-revertidos pela própria
  ferramenta quando `down` não é definido (usado neste diretório: só a
  migration de extensão define `down` explicitamente; as de tabela contam
  com a reversão automática do `node-pg-migrate`, validada pelo teste de
  reversibilidade em `test/migrations/schema.e2e-spec.ts`).

## Como rodar

```bash
cp .env.example .env   # ajuste DATABASE_URL
npm run migrate:up      # aplica todas as migrations pendentes
npm run migrate:down    # desfaz a última migration aplicada
npm run migrate:create -- nome-da-migration   # cria novo arquivo .ts versionado
```

## Tabelas criadas (`SDD.md` §5)

Uma migration por tabela (mais uma inicial para a extensão `pgcrypto`),
numeradas em ordem de dependência (FK):

| # | Migration | Tabela | Nota |
|---|---|---|---|
| 1 | `..._enable-pgcrypto-extension` | — | Extensão habilitada (ADR-006/GUARDRAILS.md item 17); também fornece `gen_random_uuid()`, usado como default de toda PK `uuid` |
| 2 | `..._create-tenants-table` | `tenants` | Única tabela sem `tenant_id` (GUARDRAILS.md regra A.1) |
| 3 | `..._create-users-table` | `users` | `cpf_criptografado` (bytea, pgcrypto) + `cpf_hash` (lookup determinístico) |
| 4 | `..._create-accounts-table` | `accounts` | 1:1 com `users` |
| 5 | `..._create-mfa-factors-table` | `mfa_factors` | ADR-008 |
| 6 | `..._create-terms-versions-table` | `terms_versions` | |
| 7 | `..._create-consent-records-table` | `consent_records` | Append-only (sem `updated_at`), RN-02/GUARDRAILS.md item 25/28 |
| 8 | `..._create-exams-table` | `exams` | |
| 9 | `..._create-exam-results-table` | `exam_results` | |
| 10 | `..._create-exam-files-table` | `exam_files` | ADR-012: 3 UIDs DICOM nullable + índice único parcial em `dicom_sop_instance_uid` |
| 11 | `..._create-share-links-table` | `share_links` | RF-09 |
| 12 | `..._create-audit-events-table` | `audit_events` | Append-only (sem `updated_at`), ADR-009; `hash_evento_anterior` nullable (formato exato pendente de SPK-05/BE-29) |
| 13 | `..._create-branding-configs-table` | `branding_configs` | ADR-011: os 5 campos de validação de contraste, 1:1 com `tenants` |
| 14 | `..._create-integration-endpoint-configs-table` | `integration_endpoint_configs` | ADR-012: `dicom_remote_ae_title` com índice único **global** parcial (ver nota abaixo) |
| 15 | `..._create-exception-queue-items-table` | `exception_queue_items` | RF-14, reaproveitada por BE-38 |

**Não incluída**: `SESSION` (`SDD.md` §5). A própria entidade anota sua PK
como "chave Redis" e ADR-007/`TASK.md` §1.2 definem que sessão vive em Redis
(estrutura de chave — BE-05), não como tabela PostgreSQL. Ver comentário em
`src/database/domain-tables.ts`.

## Decisões de detalhe tomadas nesta tarefa (dentro da autoridade do Backend)

- **`tenant_id` em toda tabela, mesmo onde `SDD.md` §5 não lista o atributo
  explicitamente** (ex.: `accounts`, `mfa_factors`, `consent_records`,
  `exam_results`, `exam_files`, `share_links`, `audit_events`): o próprio
  `SDD.md` §5 diz que o diagrama "não é modelagem física detalhada — cabe ao
  Backend Developer depois", e o critério de aceite de BE-02/GUARDRAILS.md
  regra A.1 exige a coluna sem exceção (permite ao guard de aplicação e à
  RLS de BE-03 filtrar direto, sem depender de join até a tabela que já
  carregava `tenant_id` no diagrama).
- **`dicom_remote_ae_title` — unicidade GLOBAL, não composta com
  `tenant_id`.** A redação literal do critério de aceite de BE-02 em
  `TASK.md` ("constraint UNIQUE por tenant") poderia sugerir uma unicidade
  composta `(tenant_id, dicom_remote_ae_title)` — isso não impediria a falha
  que o próprio ADR-012 nomeia ("se dois hospitais usarem o mesmo AE Title
  de origem, a resolução de tenant falha silenciosamente atribuindo ao
  tenant errado"). Implementado como índice único parcial só sobre o valor
  da coluna (ignorando `NULL`), coberto por teste dedicado.
- **CPF armazenado em duas colunas** (`cpf_criptografado` bytea via
  `pgp_sym_encrypt`, `cpf_hash` sha-256 hex para lookup/unicidade) —
  `pgp_sym_encrypt` não é pesquisável por igualdade (IV aleatório por
  chamada), então uma coluna de hash determinístico é necessária para a
  constraint `UNIQUE(tenant_id, cpf_hash)` e para buscas futuras (BE-18,
  match de CPF) sem expor o valor puro.
- **`identificador_paciente_nao_localizado` (`exception_queue_items`)
  permanece a única coluna de identificação** — o caso de exceção de BE-38
  (`RemoteAET` desconhecido) usa `payload_normalizado` (jsonb) para carregar
  esse metadado, sem exigir uma coluna nova nesta tarefa.
- **`created_at`/`updated_at`** adicionados em toda tabela (exceto
  `consent_records`/`audit_events`, que são append-only e por isso não têm
  `updated_at`) — convenção padrão de auditabilidade/depuração, não exigida
  literalmente por nenhum ADR, mas de custo desprezível e consistente com o
  restante do produto.
- **Nenhuma coluna além de CPF recebeu `pgcrypto`** nesta tarefa (`TASK.md`
  §1.7 delega essa classificação ao Backend/DevSecOps durante BE-02) — nome
  e data de nascimento seguem em texto plano, protegidos só pela
  criptografia de disco do provedor; revisão futura pode reclassificar.

## Como os testes validam o schema (`test/migrations/schema.e2e-spec.ts`)

- **PostgreSQL real e efêmero via `testcontainers`** (`postgres:16-alpine`),
  não mock — roda as 15 migrations de ponta a ponta contra o motor real, a
  única forma confiável de validar `CHECK`/`UNIQUE`/índice parcial/extensão.
  Docker estava disponível no ambiente usado para esta tarefa (`docker ps`
  responde) — nenhum fallback de sintaxe (ex.: SQLite) foi necessário. Se um
  ambiente futuro não tiver Docker disponível, esses testes falham ao
  iniciar o container (erro explícito, não um "passa silenciosamente") —
  nesse cenário, a alternativa documentada seria rodar as migrations contra
  SQLite só para validar sintaxe geral do `MigrationBuilder`, nunca como
  substituto de validação real de `CHECK`/`UNIQUE`/RLS/extensão específicos
  do PostgreSQL.
- Cobre: existência de todas as 14 tabelas + extensão `pgcrypto`; ausência
  de `tenant_id` em `tenants`; presença de `tenant_id NOT NULL` + FK para
  `tenants(id)` em toda tabela de domínio (iterando
  `src/database/domain-tables.ts`, a mesma lista que BE-03/BE-04 podem
  reaproveitar); os 5 campos de ADR-011 em `branding_configs` (incluindo o
  default `pendente`); os 3 UIDs DICOM nullable de ADR-012 em `exam_files`;
  a constraint de unicidade global de `dicom_remote_ae_title` (teste
  positivo — dois tenants diferentes com o mesmo AE Title falha — e teste
  negativo — múltiplos tenants com AE Title `NULL` não conflitam); pgcrypto
  aplicado de fato a CPF (`pgp_sym_encrypt`/`pgp_sym_decrypt`/`digest`
  funcionando com dado real, não só a existência da coluna); e
  reversibilidade completa (`down` desfaz as 15 migrations sem deixar
  nenhuma tabela de domínio para trás).
- Roda como `*.e2e-spec.ts`, já incluído em `npm run test:e2e` (usado pelo
  CI de `backend-ci.yml`, job `lint-and-test`) — nenhuma mudança de pipeline
  foi necessária: `testcontainers` gerencia seu próprio container via o
  Docker do host, disponível por padrão nos runners `ubuntu-latest` do
  GitHub Actions.
