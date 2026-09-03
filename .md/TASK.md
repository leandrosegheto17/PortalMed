# TASK.md — Portal de Resultados de Exames (Aplicação White Label para Hospitais)

**Dono**: Tech Lead
**Data**: 2026-09-02
**Status**: **Rascunho pronto para o Gate 3 do CTO** (`capacity-and-timeline-validation`)
— não é considerado final até aprovação (Aprovado / Aprovado com ressalvas) do CTO.
Reprovação pontual reabre só a(s) tarefa(s)/risco(s) apontado(s), não o documento
inteiro.
**Input**: `SDD.md` (final, aprovado com ressalvas no Gate 2 + ADR-011 e ADR-012
pós-gate, 2026-09-02) + 12 ADRs em `.md/adr/` + `UX-SPEC.md` (liberado, TL-01 a
TL-35, 2026-09-02) + `PRD-TECNICO.md` (23 RFs, 14 RNs, 16 RNFs) + `PRD.md`
(Premissa P3) + `CTO-REVIEW.md` (Gate 2, condições explícitas para este documento)
+ `BLOCKERS.md` (Bloqueio 002, aberto por este próprio agente durante a
decomposição inicial, resolvido pelo Software Architect via ADR-012 antes desta
submissão ao Gate 3 — ver Seção 6)

> Este é o primeiro `TASK.md` do projeto. **Escopo desta release: Backend e
> Frontend apenas** — não há Mobile no horizonte desta release (confirmado em
> `PRD.md` §4.1, "Fora do horizonte atual"; app nativo é Won't). QA e DevSecOps/
> DevOps consomem este documento como contexto, mas não recebem tarefas de
> implementação atribuídas aqui.
>
> **Nota de revisão (2026-09-02, mesma data)**: BE-07 e BE-22 foram reestimadas
> e a tarefa BE-38 foi adicionada nesta revisão, em decorrência da resolução do
> Bloqueio 002 pelo Software Architect (ADR-012) — ver Seção 6 para o
> encerramento formal e a Seção 3.1/3.4 para as tarefas afetadas.

---

## Resumo Executivo (insumo direto para o Gate 3)

| Métrica | Backend | Frontend | Total |
|---|---|---|---|
| Tarefas decompostas | 38 (BE-01 a BE-38) | 22 (FE-01 a FE-22) | 60 |
| Spikes técnicos identificados | 6 ativos + 1 resolvido antecipadamente (backend) | 1 (frontend) | 7 (SPK-01 a SPK-07 — SPK-07 resolvido via ADR-012 antes de precisar ser executado como spike interno) |
| Esforço estimado (sem buffer) | ~152 dia-pessoa (dp) | ~88 dp | ~240 dp |
| Esforço estimado (+15% buffer de revisão/integração) | ~175 dp | ~101 dp | ~276 dp |
| Capacidade hipotética (P3, `PRD.md` §1.4) | 2 devs × 80-100 dp = 160-200 dp | 1-2 devs × 80-100 dp = 80-200 dp | 240-400 dp |

**1 dia-pessoa (dp) = 1 desenvolvedor por 1 dia útil (~8h). 16 semanas = 80 dias
úteis/pessoa; 20 semanas = 100 dias úteis/pessoa — sem descontar feriados/férias
(hipótese já otimista).**

**Veredito preliminar de capacidade (detalhado na Seção 5)**: o volume decomposto
**não cabe com folga** na extremidade otimista da Premissa P3 (16 semanas, 1
frontend, 1 QA sem reforço) — cabe de forma mais realista em 18-20 semanas com 2
backend + 2 frontend. Este Tech Lead não força o número para caber artificialmente
— ver Seção 5 para o detalhamento quantitativo e a recomendação explícita ao Gate 3.

---

## 1. Diretrizes de Implementação

### 1.1 Comportamento geral (camada base, `coding-guidelines`)

- **Pensar antes de codificar**: toda tarefa com estimativa > 3 dp exige uma nota
  curta de abordagem (2-3 frases: modelo de dados afetado, contrato de API,
  módulo NestJS envolvido) no PR de abertura, revisada pelo par ou pelo Tech Lead
  antes de código substancial ser escrito — reduz retrabalho em tarefas de maior
  incerteza (ver Seção 2, spikes).
- **Simplicidade**: implementar exatamente o que o critério de aceite exige; não
  generalizar para os itens Should/Could/Won't do `PRD-TECNICO.md` (RF-S01-S03,
  RF-C01-C04) antes de serem priorizados — construir "para o caso de escalar" é
  o mesmo erro que ADR-004 já evitou de forma consciente e documentada; não
  reintroduzi-lo em código.
- **Não esconder incerteza**: todo parâmetro numérico ainda "a confirmar" no
  `PRD-TECNICO.md` (Seção 1.7 abaixo lista os defaults adotados) é implementado
  como configuração (env/config), nunca hardcoded — e o PR correspondente declara
  explicitamente que o valor é provisório.

### 1.2 Stack e bibliotecas obrigatórias/proibidas (ADR-002, 003, 005, 006, 007, 008)

| Decisão | Regra prática |
|---|---|
| ADR-005 | Backend: Node.js LTS + TypeScript + NestJS **obrigatório**. Módulos NestJS mapeados **1:1** aos bounded contexts do `SDD.md` §2.1 (Identity & Access, Cadastro & Consentimento, Catálogo de Exames, Entrega de Laudo/Imagem, Compartilhamento, Auditoria, Config de Tenant/Branding, Gestão de Usuários, Ajuda/Suporte, Notificação, Fila de Exceção). Frontend: React + TypeScript **obrigatório**. |
| ADR-007 | Sessão via cookie `HttpOnly`/`Secure` + estado em Redis. **PROIBIDO** implementar autenticação de usuário final via JWT stateless (mesmo como "melhoria" — a decisão já pesou o trade-off e rejeitou essa opção por incompatibilidade com revogação imediata, RF-02/RF-04/RF-13). |
| ADR-008 | MFA via biblioteca padrão RFC 6238 (ex.: `otplib`/`speakeasy`) para TOTP + OTP por e-mail como fallback, via módulo de Notificação interno. **PROIBIDO** introduzir dependência de provedor de SMS nesta release (RF-S01 é Release 2). Nenhuma tela/endpoint pode oferecer "pular MFA" (RN-03, sem exceção por perfil). |
| ADR-002 | **PROIBIDO** construir parser HL7 v2.x/FHIR R4 próprio dentro do monolito core. Toda integração passa pelo motor de mercado (NextGen Connect/Mirth Connect, self-hosted, open-source) com Anti-Corruption Layer normalizando para JSON canônico antes de entrar no domínio. A aplicação core nunca lida com HL7/FHIR bruto. |
| ADR-003 | **PROIBIDO** construir parser/renderizador DICOM próprio. Usar Orthanc como gateway; o core só lida com a URL/referência da imagem já convertida (JPEG/PNG), nunca com o arquivo DICOM bruto diretamente. |
| ADR-006 | PostgreSQL obrigatório. `pgcrypto` obrigatório para CPF e demais identificadores de paciente definidos como sensíveis (Tech Lead/DevSecOps na implementação). **PROIBIDO** armazenar BLOB de laudo/imagem diretamente no banco relacional (sempre Object Storage). |
| — | Object Storage compatível S3, criptografado SSE-KMS, região Brasil (ADR-010). Acesso a arquivo **sempre** via URL assinada de curta duração — **PROIBIDO** URL pública permanente. |

### 1.3 Multi-tenancy (ADR-004) — regra de maior severidade deste projeto

- Toda entidade de domínio (todas exceto `TENANT`, `SDD.md` §5) carrega `tenant_id`
  não nulo desde a primeira migration.
- Toda query de leitura/escrita passa por um **guard de aplicação obrigatório**
  que injeta o `tenant_id` do contexto autenticado — **PROIBIDO** escrever query
  manual que não passe por esse guard, sem exceção, sem "só desta vez".
- Row-Level Security (RLS) habilitado em toda tabela de domínio como **segunda**
  camada de defesa — nunca a única camada (RLS mal configurado gera falso senso
  de segurança, risco já nomeado em ADR-006).
- **Imaging Gateway (ADR-012)**: como o Orthanc é agnóstico de tenant por
  natureza (produto de mercado, sem customização/plugin), o `tenant_id` de todo
  evento vindo do Imaging Gateway é resolvido pela Aplicação Core casando o
  `RemoteAET` (metadado nativo do DICOM C-STORE recebido) contra
  `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title` — **nunca** atribuído de
  forma implícita/hardcoded ("único tenant ativo"). `RemoteAET` não localizado
  em nenhum `dicom_remote_ae_title` cadastrado vai para a fila de exceção/
  alerta (BE-25), nunca para atribuição best-effort a um tenant qualquer. Ver
  BE-38 (Seção 3.4).
- **Condição não negociável do Gate 2 do CTO**: nenhum PR que toque a camada de
  acesso a dado (qualquer query, repositório, guard) é aprovado/mergeado sem o
  teste automatizado de vazamento cruzado entre tenants (BE-04, Seção 3) passando
  no CI — formalizado também como regra de maior severidade em `GUARDRAILS.md`.

### 1.4 Auditoria (ADR-009)

- Toda ação sensível (visualização de laudo/imagem, download, geração/acesso/
  revogação de link de compartilhamento, ação administrativa sobre conta) publica
  um evento em `AUDIT_EVENT`.
- A role de banco usada pela aplicação **nunca** recebe `GRANT UPDATE`/`GRANT
  DELETE` na tabela `AUDIT_EVENT` — apenas `INSERT`/`SELECT`.
- Cada evento armazena o hash do evento anterior (hash chain) — formato exato
  definido em SPK-05 (Seção 2) antes de BE-29 ser implementado com confiança.

### 1.5 Segurança transversal

- **TLS 1.2 é piso obrigatório sem exceção** em toda borda externa (diretriz
  explícita do CTO no Gate 2, corrigindo a redação "recomendado" do `SDD.md`
  §7.3) — TLS 1.3 preferencial onde suportado pelo protocolo do hospital piloto.
- RBAC sempre aplicado no backend via guards NestJS — **PROIBIDO** confiar em
  validação apenas no frontend (RNF-03). Ownership (paciente só acessa dado da
  própria conta) aplicado em toda query, independente do papel.
- **Nenhuma configuração de `BRANDING_CONFIG` é marcada pronta para go-live** com
  `status_validacao_contraste != 'aprovado'` (ADR-011) — gate de aplicação, não
  processo informal (ver BE-32 a BE-34, Seção 3).
- Consentimento de dado de saúde (RN-02) é campo/registro **separado** do aceite
  geral dos Termos de Uso — **PROIBIDO** implementar como checkbox único
  combinado.
- **PROIBIDO** qualquer funcionalidade de anexar laudo/imagem diretamente a
  e-mail enviado pelo sistema (RN-05/Won't) — único canal de compartilhamento
  suportado é o link temporário com expiração e escopo restrito (RF-09/RN-06/07).

### 1.6 Acessibilidade (RNF-06, `UX-SPEC.md` §5)

- WCAG 2.1 AA é **critério de aceite por tela**, não revisão posterior — nenhuma
  tarefa de Frontend é considerada pronta sem passar pelas regras transversais da
  Seção 5.1 do `UX-SPEC.md` (contraste, navegação por teclado, estado nunca só
  por cor, rótulos programáticos, `aria-live`, alvo de toque, zoom 200%).
- Nenhuma tela hardcoda um valor de parâmetro "a confirmar" (timeout, prazo,
  tentativas) no texto fixo de UI — sempre consumido de configuração (já
  determinado assim pelo próprio `UX-SPEC.md` §7.1).

### 1.7 Decisões de detalhe tomadas pelo Tech Lead (dentro da autoridade, documentadas)

Valores numéricos que o `PRD-TECNICO.md` deixou "a confirmar" com sugestão do BA
são adotados como **default configurável** (nunca hardcoded), para desbloquear a
implementação sem esperar confirmação jurídica/comercial final:

| Parâmetro | Default adotado | Origem da sugestão |
|---|---|---|
| RN-04 — tentativas de login antes de bloqueio | 5 | `PRD-TECNICO.md`, sugestão do BA |
| RF-04 — timeout de sessão por inatividade | 15 minutos | `PRD-TECNICO.md`, sugestão do BA |
| RF-03 — janela de código MFA (TOTP) | 30 segundos (padrão RFC 6238 da biblioteca) | ADR-008 |
| RF-03 — janela de código MFA (OTP e-mail) | 5 minutos | `PRD-TECNICO.md`, sugestão do BA |
| RN-06 — prazo de expiração do link de compartilhamento | 72 horas | `PRD-TECNICO.md`, RN-06 (interpretação do BA) |
| RN-13 — horário de suporte ao piloto | dias úteis, 8h-18h (Brasília), texto estático em TL-35, sem SLA formal | `PRD-TECNICO.md`, sugestão do BA |
| TL-35 — canal de contato de suporte | E-mail + formulário de contato simples (sem novo sistema de ticketing) | Decisão de detalhe do Tech Lead — `SDD.md` §7 delegava essa decisão a Software Architect/Tech Lead, não especificava |
| Autenticação serviço-a-serviço (Integration/Imaging Gateway → Core) | API key dedicada por serviço + validação de origem de rede (canal interno não exposto, §7.5) — mTLS avaliado como melhoria futura se DevSecOps priorizar | `SDD.md` §7.1 delegava "detalhe a definir na fase de implementação" |
| Colunas com `pgcrypto` além de CPF | CPF (obrigatório) + qualquer outro identificador que o Backend/DevSecOps classificar como sensível durante a implementação de BE-02 | ADR-006 |

Estes não são lacunas estruturais — são detalhes de implementação dentro da
autoridade deste agente, documentados aqui conforme os Critérios de Pronto.

---

## 2. Spikes Técnicos Identificados

Nenhuma das tarefas abaixo é estimada "no escuro" — os spikes rodam antes (ou nos
primeiros dias) das tarefas de implementação correspondentes, com timebox curto,
para que a estimativa final tenha confiança real. Onde a tarefa de implementação já
aparece com estimativa na Seção 3, essa estimativa é **provisória, sujeita a
revisão pós-spike** — marcado explicitamente na tabela de tarefas.

| ID | Spike | Motivo (incerteza técnica) | Dono | Timebox | Bloqueia/Informa |
|---|---|---|---|---|---|
| SPK-01 | Protocolo real de integração do hospital piloto (Premissa P1) | Hospital piloto ainda não identificado; BE-06/BE-24 usam premissa de trabalho (HL7 v2.x/FHIR R4, `PRD-TECNICO.md` §7.1) até P1 ser resolvida | Backend + Tech Lead | Contínuo (não é timebox fixo — reavaliar a cada atualização de P1) | Informa BE-06, BE-24; não bloqueia início do desenvolvimento com ambiente simulado/fixtures |
| SPK-02 | Configuração de canal HL7 v2.x MLLP/FHIR R4 na engine de mercado (Mirth Connect/NextGen Connect) | Squad sem especialização declarada em interoperabilidade em saúde (`CTO-REVIEW.md`, Gate 1) | Backend | 3 dias | Bloqueia estimativa final de BE-06, BE-24 |
| SPK-03 | Pipeline Orthanc — deploy, plugin de conversão DICOM→JPEG/PNG assíncrona, endpoint DICOMweb (WADO-RS) | Mesmo gap de especialização (Gate 1), agora para imagem médica | Backend | 3 dias | Bloqueia estimativa final de BE-07, BE-22 |
| SPK-04 | Modelagem de política RLS no PostgreSQL combinada com o guard de aplicação de tenant | Risco nomeado em ADR-006: "RLS mal configurado gera falso senso de segurança" — precisa de desenho validado antes de escalar para todas as tabelas | Backend + Tech Lead | 2 dias | Bloqueia estimativa final de BE-03, BE-04 |
| SPK-05 | Formato e verificação de hash chain para `AUDIT_EVENT` (algoritmo, payload versionado para não quebrar a cadeia em migração futura de schema) | ADR-009 já nomeia esse risco ("alterar retroativamente o schema... operação sensível") | Backend | 1-2 dias | Bloqueia estimativa final de BE-29 |
| SPK-06 | Componente de visualização de PDF/HTML acessível por teclado/leitor de tela (TL-22) | `UX-SPEC.md` §5.2 já marca isso como "critério de aceite a validar na implementação, não decisão fechável só na especificação" | Frontend | 2 dias | Bloqueia estimativa final de FE-13 |
| SPK-07 | ~~Mecanismo de atribuição de `tenant_id` para eventos vindos do Imaging Gateway (Orthanc)~~ — **Resolvido, 2026-09-02** | Escalado como Lacuna B (Seção 6 original) via `BLOCKERS.md` Bloqueio 002; o Software Architect resolveu formalmente via **ADR-012** (RemoteAET nativo do Orthanc casado contra novo campo `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, resolução feita pela Aplicação Core) antes de este spike precisar ser executado como investigação interna do Backend | Software Architect (resolveu) | — (encerrado por decisão arquitetural, não por timebox de investigação) | Informou a reestimativa de BE-07/BE-22 e a criação de BE-38 (Seção 3.4) |

---

## 3. Lista de Tarefas

> **Legenda de Status** (atualizada pelos times de execução conforme progresso,
> convenção `PIPELINE-CONVENTIONS.md` §1): `A Fazer` / `Em Andamento` / `Bloqueado`
> / `Concluído`. Todas as tarefas nascem `A Fazer`. Toda tarefa marcada
> `[pós-spike]` tem estimativa provisória até o spike correspondente (Seção 2)
> concluir.

### 3.1 Backend — Infraestrutura de Base

> Responde diretamente à ressalva 4 do Gate 2 do CTO: "tratar o setup/operação
> inicial de PostgreSQL, Redis, Orthanc e o motor de integração HL7/FHIR como
> itens de esforço explícitos e dimensionados no `TASK.md`, não implícitos."
> **Subtotal: 43 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-01 | Setup do monolito core (NestJS, estrutura modular por bounded context ADR-001, lint de fronteira de módulo, CI básico) | Backend | Projeto NestJS inicializado com 1 módulo por bounded context do `SDD.md` §2.1 (mesmo vazio); regra de lint impede import direto entre módulos fora da interface pública; pipeline de CI roda lint+test em todo PR | 4 dp | Concluído — implementado em `backend/` (NestJS 12, Node.js 24 LTS, TypeScript/ESM). 11 módulos criados 1:1 com os bounded contexts de `SDD.md` §2.1, cada um com barrel `index.ts` como única interface pública, importados em `AppModule` (`backend/src/app.module.ts`). Fronteira de módulo (GUARDRAILS.md item 34) enforced por regra ESLint própria (`backend/src/tooling/eslint-rules/module-boundary-rule.js`, `npm run lint:boundaries`), complementar ao `oxlint` padrão do Nest CLI (`npm run lint:oxlint`). CI básico em `.github/workflows/backend-ci.yml` (job `lint-and-test`: oxlint + lint de fronteira + testes unit/integração/e2e + build, em todo PR que toque `backend/**`) — arquivo desde então estendido pelo DevOps com estágios adicionais (BE-04, build/deploy). 25 testes unitários/integração (vitest) + 1 e2e passando, cobrindo: (a) a regra de lint (RuleTester, casos válidos/inválidos incl. regressão de mensagem), (b) `AppModule` registrando exatamente os 11 módulos e compilando sem erro de wiring, cada módulo compilando isoladamente. Build (`nest build`) e lint limpos — revisão do orquestrador reexecutou `test`, `test:e2e`, `lint:boundaries`, `lint:oxlint` e `build` de forma independente, todos limpos. |
| BE-02 | PostgreSQL gerenciado + schema base multi-tenant (migrations, `tenant_id` em toda entidade de domínio) | Backend | Todas as tabelas do `SDD.md` §5 criadas via migration versionada, incluindo os campos de ADR-011 (`BRANDING_CONFIG`) e **ADR-012** (`EXAM_FILE.dicom_study_instance_uid`/`dicom_series_instance_uid`/`dicom_sop_instance_uid`, nullable; `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, com constraint `UNIQUE` por tenant conforme ADR-012); toda tabela exceto `TENANT` tem coluna `tenant_id` não nula; `pgcrypto` habilitado para CPF | 5 dp | Concluído — revisão do orquestrador reexecutou `test`/`test:e2e`/`lint`/`build` de forma independente (25 unit + 46 e2e via testcontainers/Postgres real, limpo). 15 migrations versionadas (`.ts`) em `backend/migrations/`, ferramenta `node-pg-migrate` (decisão documentada em `backend/docs/migrations.md`: standalone, não acopla BE-02 a um ORM que BE-03 ainda vai escolher para o guard de aplicação). 14 tabelas de `SDD.md` §5 criadas (`tenants` + 13 de domínio, todas com `tenant_id uuid NOT NULL` + FK para `tenants(id)`, GUARDRAILS.md regra A.1 — inclusive em tabelas onde o diagrama do `SDD.md` não listava o atributo explicitamente, ex. `accounts`/`mfa_factors`/`exam_files`; decisão documentada no mesmo arquivo). `SESSION` (`SDD.md` §5) não virou tabela — a própria entidade anota PK como "chave Redis" e ADR-007/TASK.md §1.2 já definem sessão em Redis (BE-05), não Postgres; leitura literal do modelo, documentada. `pgcrypto` habilitado (1ª migration) para CPF (`users.cpf_criptografado` bytea + `users.cpf_hash` sha-256 para lookup/unicidade, já que `pgp_sym_encrypt` não é pesquisável por igualdade) e também reaproveitado para `gen_random_uuid()` em toda PK. ADR-011: 5 campos de `branding_configs` implementados, `status_validacao_contraste` com default `pendente` e `CHECK` de enum. ADR-012: 3 UIDs DICOM nullable em `exam_files` (+ índice único parcial em `dicom_sop_instance_uid`) e `integration_endpoint_configs.dicom_remote_ae_title` com índice único **global** parcial (não composto com `tenant_id` — decisão documentada: unicidade composta não preveniria a colisão entre tenants que o próprio ADR-012 nomeia como risco). Testado com PostgreSQL real efêmero via `testcontainers` (`postgres:16-alpine`, Docker disponível no ambiente de execução) em `backend/test/migrations/schema.e2e-spec.ts`: 46 testes cobrindo existência de todas as tabelas/extensão, `tenant_id` NOT NULL + FK em toda tabela de domínio, os campos de ADR-011/ADR-012, a constraint de unicidade global de AE Title (positivo e negativo), `pgcrypto` funcionando com dado real (não só a coluna existindo) e reversibilidade completa (`down` desfaz as 15 migrations). CLI (`npm run migrate:up`/`migrate:down`) também validado manualmente contra container à parte. `npm run lint`, `npm run test` (25), `npm run test:e2e` (46, incluindo os 1 pré-existente de BE-01) e `npm run build` limpos. Escopo deliberadamente não incluído (tarefas seguintes): guard de aplicação de `tenant_id`, RLS (BE-03), e restrição de privilégio de banco em `audit_events` (BE-29) — nenhuma lógica de negócio nesta tarefa. Não marcada `Concluída` por este agente — aguarda revisão do orquestrador. |
| BE-03 | Guard de aplicação obrigatório de `tenant_id` + políticas RLS por tabela | Backend | Nenhuma query de repositório executa sem `tenant_id` do contexto (guard testado); RLS habilitado e testado em toda tabela de domínio | 5 dp `[pós-spike SPK-04]` | Concluído — correção de `QA-BUG-002` revisada e confirmada pelo orquestrador em 2026-09-03: suíte completa reexecutada de forma independente (50 unit + 75 e2e, lint/build limpos), e o próprio deep-import residual (`import { KYSELY_CONNECTION } from '../../database/kysely-connection.js'` fora de `src/database/`) testado manualmente pelo orquestrador — pego pela nova regra de lint (`boundary/no-kysely-connection-token-outside-database`), arquivo de teste removido em seguida, working tree confirmado limpo. Histórico completo abaixo. **Revertido de `Concluído` para `Em andamento` por QA em 2026-09-03, pela segunda vez** (`QA-REPORT.md` Seção 1.6.1, bug `QA-BUG-002`, severidade Alta). QA revalidou empiricamente `QA-BUG-001` (spec e2e próprio, independente do teste de regressão do Backend) e confirmou-o **corrigido/fechado** — o cast original agora resolve `db`/`runOnTable` para `undefined` (campos privados nativos), verificado contra Postgres real; RLS também relida e reatacada manualmente, confirmada correta e não afetada pela correção. Mas a mesma revalidação, por instrução explícita de tratar qualquer novo vetor de bypass como severidade Alta, encontrou um **segundo vetor**: o token de injeção de dependência `KYSELY_CONNECTION` (exportado por `DatabaseModule` e reexportado pelo barrel público `src/database/index.ts` para uso legítimo por repositórios de domínio) pode ser injetado diretamente por **qualquer** provider NestJS comum — sem estender `TenantScopedRepository`, sem importar `kysely`/`pg` (não aciona a regra de lint existente) e sem `TenantContext.run()` ativo — e executar uma query real contra o banco, verificado empiricamente contra Postgres via testcontainers e `@nestjs/testing`. RLS conteve o impacto real (0 linhas, falha fechada), mas o guard de aplicação foi genuinamente contornado por este caminho, do mesmo jeito estrutural que `QA-BUG-001`. Retorna ao Backend para correção — não ao Tech Lead (mesma tarefa, não é padrão recorrente entre tarefas distintas). Ver `QA-REPORT.md` Seção 1.6.1/`QA-BUG-002` para a reprodução completa e a correção recomendada (não reexportar `KYSELY_CONNECTION` pelo barrel público; usar função fábrica interna a `src/database/` para registrar repositórios de domínio como provider). **Nota de correção do `QA-BUG-002` (Backend, 2026-09-03)**: aplicada a correção recomendada pelo QA, mais a defesa complementar que o próprio QA sugeriu avaliar. (1) `KYSELY_CONNECTION` deixou de ser reexportado pelo barrel público `backend/src/database/index.ts` — só `kysely-connection.ts` (declara), `database.module.ts` (fornece via `useFactory`) e o arquivo novo `provide-tenant-scoped-repository.ts` (injeta via `useFactory`) referenciam o token, todos dentro de `src/database/`. (2) Nova função fábrica `provideTenantScopedRepository(RepositoryClass)` (`backend/src/database/provide-tenant-scoped-repository.ts`), exportada pelo barrel — único jeito sancionado de um módulo de domínio (BE-10+) registrar seu repositório concreto como provider: `providers: [provideTenantScopedRepository(ExamsRepository)]`, sem o repositório concreto precisar de nenhum decorator `@Inject` nem importar `KYSELY_CONNECTION` — o construtor do repositório concreto passa a receber a conexão como parâmetro comum (`connection: unknown`), sem decorator. `TenantScopedRepository` (`tenant-scoped.repository.ts`) teve o `@Inject(KYSELY_CONNECTION)` removido do próprio construtor pelo mesmo motivo (já não é necessário, quem resolve o token agora é a fábrica). (3) Avaliada e implementada a defesa complementar que o QA sugeriu avaliar: remover a reexportação do barrel fecha o vetor literal que o QA reproduziu, mas não impede sozinho um import relativo "por fora" apontando direto para `kysely-connection.ts` (nada no sistema de módulos bloqueia isso estruturalmente) — nova regra de lint `boundary/no-kysely-connection-token-outside-database` (`backend/src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.js`, mesmo estilo de `no-raw-kysely-outside-database`) proíbe qualquer referência ao identificador `KYSELY_CONNECTION` (import direto, renomeado, re-export, desestruturação de import dinâmico) fora de `src/database/`, registrada em `eslint.config.mjs` com severidade `error`. Teste de regressão adversarial replicando **literalmente** o vetor do QA (`NotARepositoryService`, o mesmo nome de classe do relato — provider comum, sem estender `TenantScopedRepository`, sem `TenantContext.run()` ativo) em dois lugares: (a) `backend/test/database/tenant-guard-and-rls.e2e-spec.ts`, descrição `[QA-BUG-002]` — contra Postgres real via testcontainers, confirma que o barrel não exporta mais o token (import dinâmico + `hasOwnProperty`/`undefined`), que a réplica literal do `NotARepositoryService` (obtendo o token, agora `undefined`, do barrel e tentando `@Inject`) falha na própria montagem do módulo de teste do NestJS (erro de injeção — `Test.createTestingModule(...).compile()` rejeita), sem tocar o banco (contagem de linhas antes/depois idêntica), e que o padrão sancionado (`provideTenantScopedRepository`) continua funcionando integralmente ponta a ponta (resolve o repositório real via DI, `MissingTenantContextError` sem contexto, round-trip correto com contexto); (b) `backend/src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.spec.ts` (`RuleTester`), cobrindo o mesmo vetor via barrel e também via import "por fora" apontando direto para `kysely-connection.ts`, mais renomeação de import e re-export. Nenhum repositório concreto de domínio existe ainda além da classe base (`TenantScopedRepository`) — não havia nenhum consumidor do padrão antigo para migrar; os únicos usos de `KYSELY_CONNECTION` no repositório inteiro (fora de `src/database/`) eram os dois exemplos de teste/lint atualizados nesta correção. Suíte completa reexecutada após a correção: `npm run build` (limpo), `npm run test` (50, +9 sobre os 41 anteriores — a nova suíte `RuleTester` da regra de lint nova), `npm run test:e2e` (75, +3 sobre os 72 anteriores — os três testes novos descritos acima, contra Postgres real via testcontainers), `npm run lint:oxlint` e `npm run lint:boundaries`, todos limpos. `backend/docs/tenant-guard-and-rls.md` atualizado com uma seção dedicada ao novo padrão de registro e à defesa complementar. Status mantido **Em Andamento** — não marcado `Concluído` por este agente; aguarda nova revisão do QA/orquestrador para reabrir/fechar `QA-BUG-002`. **Nota histórica — status anterior a esta revalidação (orquestrador, 2026-09-03)**: Concluído — correção de `QA-BUG-001` revisada e confirmada pelo orquestrador em 2026-09-03: suíte completa reexecutada de forma independente (41 unit + 72 e2e, lint/build limpos) e o próprio vetor de bypass testado isoladamente em Node (`class Sub extends Base { tryBypass() { return this.db } }` sobre campo `#db` nativo) — retorna `undefined`, confirmando que o cast do QA não alcança mais a conexão real. Histórico completo abaixo. Revertido de `Concluído` para `Em andamento` por QA em 2026-09-03 (`QA-REPORT.md` Seção 1.6, bug `QA-BUG-001`, severidade Alta). RLS confirmada correta e robusta, inclusive por ataque manual independente do QA (falha fechada, `WITH CHECK` bloqueando `INSERT`/`UPDATE` cross-tenant, role `portalmed_app` sem `bypassrls`/`superuser`). **Mas o guard de aplicação (`TenantScopedRepository`) não é estrutural contra todos os vetores de bypass razoáveis**: o campo `private readonly db` usa a palavra-chave `private` do TypeScript (apagada em tempo de compilação), não o campo privado nativo do JavaScript (`#db`); uma subclasse consegue acessar a conexão real via `(this as unknown as { db: unknown }).db as any`, sem importar `kysely`/`pg` — logo sem violar a regra de lint `no-raw-kysely-outside-database` — e executar uma query sem `TenantContext.run()` ativo e sem `MissingTenantContextError`, verificado empiricamente pelo QA contra Postgres real. RLS impediu vazamento de dado real neste teste específico (defesa em profundidade funcionando), mas o guard em si foi genuinamente contornado. Correção recomendada pelo QA: trocar `private readonly db` por `#db` (campo privado nativo, ES2022+, compatível com `target: ES2023` já usado no `tsconfig.json`) + teste de regressão adversarial cobrindo este vetor. Ver `QA-REPORT.md` Seção 1.6/`QA-BUG-001` para a reprodução completa. Retorna ao Backend para correção — não ao Tech Lead (achado de execução pontual desta tarefa, não padrão recorrente de decomposição). **Nota de correção do `QA-BUG-001` (Backend, 2026-09-03)**: aplicada exatamente a correção recomendada pelo QA, mais uma extensão dentro do mesmo raciocínio. `db` (`private readonly db: Kysely<Database>`) virou `#db` (campo privado nativo do JavaScript) em `backend/src/database/tenant-scoped.repository.ts`. Reavaliando a classe inteira por outro membro com o mesmo defeito (`private` do TypeScript em vez de `#` nativo), `runOnTable` — o único método que abre a transação e aplica o filtro explícito `.where('tenant_id', ...)` — também era `private` de TypeScript; virou `#runOnTable` pelo mesmo motivo (um cast poderia chamar `runOnTable` "por fora" passando um `work` que omite o filtro de aplicação — a RLS ainda seguraria, mas a camada de aplicação seria contornada do mesmo jeito que `QA-BUG-001` descreveu para `db`). Nenhum outro campo/método da classe usava `private` do TypeScript (`table` é `protected`, deliberado — não expõe a conexão, só o nome da tabela já validado contra `DOMAIN_TABLES`). Teste de regressão adversarial adicionado em `backend/test/database/tenant-guard-and-rls.e2e-spec.ts` (`'[QA-BUG-001] o mesmo cast que o QA usou para contornar o guard agora falha em runtime, sem tocar o banco'`): réplica **literal** do vetor do QA (`(this as unknown as { db: unknown }).db as any`, sem `TenantContext.run()` ativo, contra Postgres real via testcontainers) mais o equivalente contra `runOnTable` — antes da correção esse cast alcançava a conexão real e executava a query; agora `db`/`runOnTable` não existem mais como propriedades comuns do objeto, então o cast resolve para `undefined` e a chamada seguinte lança `TypeError` em runtime, verificado com `expect(...).toThrow(TypeError)`, e a contagem de linhas na tabela antes/depois confirma que nenhuma escrita ocorre. `backend/docs/tenant-guard-and-rls.md` atualizado para descrever `#db`/`#runOnTable` (não mais `private`) e referenciar o teste de regressão. Suíte completa reexecutada após a correção: `npm run test` (41, sem alteração de contagem — a correção não adicionou teste unitário novo, só o e2e), `npm run test:e2e` (72, +1 sobre os 71 anteriores — o novo teste de regressão), `npm run lint:oxlint`, `npm run lint:boundaries` e `npm run build`, todos limpos. Status mantido **Em andamento** — não marcado `Concluído` por este agente; aguarda nova revisão do QA/orquestrador para reabrir/fechar `QA-BUG-001`. Histórico da implementação original (Backend, 2026-09-02) preservado abaixo para contexto: revisão do orquestrador havia reexecutado `test`/`test:e2e`/`lint`/`build` de forma independente (41 unit + 71 e2e via testcontainers/Postgres real, limpo), com leitura direta de `tenant-scoped.repository.ts` e da migration de RLS confirmando falha fechada e defesa em profundidade genuína. Camada de acesso a dado escolhida (Kysely, query builder tipado sobre `pg`, não ORM — decisão documentada em `backend/docs/tenant-guard-and-rls.md`, não conflita com `node-pg-migrate` de BE-02). Guard de aplicação implementado em `backend/src/database/tenant-scoped.repository.ts` (`TenantScopedRepository`, estrutural: conexão Kysely é campo `private`, construtor recebe a conexão como `unknown` não `Kysely<Database>`, e a regra de lint nova `no-raw-kysely-outside-database` — `backend/src/tooling/eslint-rules/` — proíbe qualquer arquivo fora de `src/database/` de importar `kysely`/`pg` diretamente) + `backend/src/database/tenant-context.ts` (`TenantContext`, `AsyncLocalStorage`; `MissingTenantContextError` lançado antes de qualquer transação abrir se não houver `tenant_id` no contexto). RLS implementada em 2 novas migrations (`backend/migrations/..._create-app-database-role.ts` — role de runtime dedicada `portalmed_app`, sem a qual RLS não teria efeito real, já que o Postgres isenta dono de tabela/superusuário mesmo com `FORCE`; `..._enable-row-level-security.ts` — `ENABLE`+`FORCE ROW LEVEL SECURITY` e política `tenant_isolation_policy` em toda tabela de `DOMAIN_TABLES`, `USING`/`WITH CHECK` com `current_setting('app.tenant_id', true)`, falha fechada se a variável de sessão não estiver populada). Testado com PostgreSQL real via `testcontainers` (`backend/test/database/tenant-guard-and-rls.e2e-spec.ts`, 25 testes): RLS estrutural nas 13 tabelas de domínio, RLS como camada independente do guard (`pg.Client` cru como `portalmed_app`, sem tocar Kysely — falha fechada sem `app.tenant_id`, isolamento correto por tenant em 2 tabelas de formato diferente, `INSERT`/`UPDATE` cross-tenant rejeitados pelo `WITH CHECK`), e guard de aplicação estrutural (`MissingTenantContextError` antes de tocar o banco, round-trip básico entre 2 tenants incl. `findById` de id de outro tenant retornando `undefined` — ID guessing básico; a suíte adversarial exaustiva é BE-04, não duplicada aqui) + reversibilidade das 2 migrations novas. `npm run lint`, `npm run test` (41, incl. 7 novos de `TenantContext` + 4 da nova regra de lint), `npm run test:e2e` (71, incl. os 46 pré-existentes de BE-02 — 1 constante `TOTAL_MIGRATIONS` corrigida de hardcoded para dinâmica, já que BE-02 tinha o número de migrations fixo em 15 e BE-03 adicionou 2) e `npm run build` limpos. Escopo deliberadamente não incluído (BE-04, próxima tarefa): suíte formal/exaustiva de vazamento cruzado entre tenants (ID guessing sistemático em toda entidade) — condição do Gate 2 do CTO. |
| BE-04 | Teste automatizado de vazamento cruzado entre tenants — **condição do Gate 2 do CTO** | Backend | Suíte de teste no CI cria 2+ tenants com dados equivalentes e comprova, para toda entidade de domínio, que uma sessão do tenant A nunca retorna dado do tenant B, mesmo via manipulação direta de identificador (ID guessing); suíte roda em todo PR que toque camada de acesso a dado (bloqueante, não opcional) | 5 dp `[pós-spike SPK-04]` | Concluído — revisão do orquestrador reexecutou `test`/`test:e2e`/`lint`/`build` de forma independente (50 unit + 233 e2e via testcontainers/Postgres real, limpo), com inspeção direta da suíte confirmando as 3 camadas testadas separadamente (guard+RLS, guard sozinho via superusuário, RLS sozinha via cliente cru) e a regressão permanente de `QA-DEBT-012`. Implementada em `backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts` (PostgreSQL real e efêmero via `testcontainers`, mesmo padrão de BE-02/BE-03). 3 tenants (2+, critério de aceite) com dados equivalentes semeados nas 13 tabelas de `DOMAIN_TABLES` (`seedTenantFixture`, respeitando a cadeia real de FKs do schema de BE-02) — nenhuma tabela nova fica de fora por divergência de lista, já que itera a mesma fonte única de verdade reaproveitada por BE-02/BE-03. Para cada uma das 13 tabelas, sob o `TenantContext` do tenant A e usando o id de uma linha do tenant B (ID guessing), a suíte comprova sistematicamente que `findAll`/`findById`/`updateById`/`deleteById` (via `TenantScopedRepository`) nunca retornam/afetam o dado do tenant B — em três camadas testadas de forma **independente** (SPK-04/ADR-006, "RLS mal configurado gera falso senso de segurança" — nunca só o caminho feliz combinado): (1) guard + RLS juntas, caminho real da aplicação (`TenantScopedRepository` sobre a conexão da role de runtime `portalmed_app`); (2) guard sozinho, mesma classe de repositório mas sobre uma conexão do **superusuário** do container — que sempre ignora RLS mesmo com `FORCE ROW LEVEL SECURITY` (a exceção de superusuário nunca é afastada por `FORCE`), então qualquer isolamento observado aqui só pode vir do filtro `.where('tenant_id', ...)` explícito do guard; (3) RLS sozinha, `pg.Client` cru conectado como `portalmed_app`, sem nenhum uso de Kysely/guard/filtro explícito (`SELECT`/`UPDATE`/`DELETE` visando diretamente o id do tenant B, sem filtro de `tenant_id` na própria query). 158 testes no total (13 tabelas × 4 operações × 3 camadas + 2 testes de `QA-DEBT-012`), todos passando. Inclui também o teste de regressão permanente recomendado pelo QA (`QA-REPORT.md` Seção 1.6.2, `QA-DEBT-012`) para o vetor residual de deep-import de `KYSELY_CONNECTION` — caracterizado pelo QA como fechado só por uma barreira de CI/lint, não estrutural de compilador/runtime: dois arquivos reais são escritos temporariamente em `src/modules/catalogo-exames/` (removidos ao final, com limpeza defensiva também no início) — deep-import direto e import renomeado — e o `ESLint` real (API Node, mesma config de `npm run lint:boundaries`, não só o `RuleTester` unitário já existente) é executado contra eles, confirmando que a regra `boundary/no-kysely-connection-token-outside-database` continua reportando os dois; um segundo teste injeta o `Symbol` real obtido pelo deep-import num provider comum do NestJS (o módulo monta com sucesso por este caminho — diferente de `QA-BUG-002`, hoje fechado em tempo de compilação via barrel) e confirma que, mesmo que o lint fosse ignorado, uma query sem `TenantContext.run()` ativo não retorna nenhuma linha — a RLS permanece como contenção final. Novo script dedicado `npm run test:tenant-isolation` (roda só este arquivo, não a suíte e2e inteira) — o job `tenant-isolation-test` de `.github/workflows/backend-ci.yml` (adicionado previamente pelo DevOps, bloqueante em todo PR de `backend/**`, `GUARDRAILS.md` regra A.4) apontava para este script mas usava `services: postgres` + `DATABASE_URL`, um padrão diferente do já estabelecido por BE-02/BE-03 (testcontainers, autocontido, sem depender de serviço/env do job) — ajustado por este agente (desvio pequeno, detalhe de implementação dentro da própria tarefa) para remover o `services:`/`DATABASE_URL` órfãos (a suíte nunca os consumiria) e só rodar `npm run test:tenant-isolation` sobre o mesmo runner `ubuntu-latest` que já roda testcontainers com sucesso no job `lint-and-test`. Suíte completa reexecutada após a implementação: `npm run test` (50, sem alteração — nenhum teste unitário novo nesta tarefa), `npm run test:e2e` (233, +158 sobre os 75 anteriores — o arquivo novo inteiro, já que o glob `**/*.e2e-spec.ts` também o inclui), `npm run test:tenant-isolation` (158, isolado), `npm run lint` (`lint:oxlint` + `lint:boundaries`) e `npm run build`, todos limpos; `git status` confirmado sem resíduo dos arquivos de fixture temporários de `QA-DEBT-012`. `backend/docs/tenant-guard-and-rls.md` atualizado com uma seção dedicada a BE-04. |
| BE-05 | Setup Redis gerenciado (sessão + filas BullMQ) | Backend | Instância Redis acessível pela aplicação; estrutura de chave de sessão definida; fila BullMQ operacional para jobs assíncronos (conversão de imagem, ingestão) | 3 dp | A Fazer |
| BE-06 | Setup Integration Engine (Mirth Connect/NextGen Connect) — deploy self-hosted, canal HL7/FHIR base, ACL skeleton | Backend | Engine deployada em rede privada (§7.5); ao menos 1 canal de teste HL7 v2.x/FHIR R4 configurado; ACL normaliza mensagem de teste para JSON canônico e publica para endpoint interno do core | 8 dp `[pós-spike SPK-01/SPK-02]` | A Fazer |
| BE-07 | Setup Imaging Gateway (Orthanc) — deploy, endpoint DICOM C-STORE, plugin de conversão JPEG/PNG, integração com Object Storage, notificação ao Core com `RemoteAET` + UIDs DICOM (ADR-012) | Backend | Orthanc recebe DICOM de teste via C-STORE, converte para JPEG/PNG de forma assíncrona, armazena original no Orthanc e convertido no Object Storage; notificação ao core inclui `RemoteAET` nativo (sem plugin/customização do produto, conforme ADR-012) + `StudyInstanceUID`/`SeriesInstanceUID`/`SOPInstanceUID` + referência ao arquivo convertido | 7 dp `[pós-spike SPK-03; SPK-07 já resolvido via ADR-012, reduz incerteza que antes inflava esta estimativa]` | A Fazer |
| BE-08 | Setup Object Storage (bucket criptografado SSE-KMS, região Brasil, geração de URL assinada de curta duração) | Backend | Bucket provisionado em região Brasil (ADR-010); toda leitura de arquivo de laudo/imagem passa por URL assinada com expiração curta, nunca URL pública permanente | 3 dp | A Fazer |
| BE-09 | Credencial de serviço (API key dedicada) para comunicação Integration Gateway/Imaging Gateway → Core | Backend | Endpoint interno `/internal/ingest` e endpoint de notificação de conversão só aceitam requisição autenticada por API key de serviço, nunca credencial de usuário final; canal não exposto à internet pública (§7.5) | 3 dp | A Fazer |

### 3.2 Backend — Identity & Access (RF-01, RF-02, RF-03, RF-04, RN-03, RN-04, RNF-03)

**Subtotal: 28 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-10 | RF-01 — login usuário/senha | Backend | Credenciais corretas avançam para MFA; credenciais incorretas retornam mensagem genérica (sem indicar qual campo está errado, mitigação de enumeração) | 3 dp | A Fazer |
| BE-11 | RN-04 — bloqueio por tentativas malsucedidas consecutivas | Backend | Após N tentativas (default 5, configurável) a conta é bloqueada temporariamente; contador reseta em login bem-sucedido | 2 dp | A Fazer |
| BE-12 | RF-03 — MFA, setup (TOTP + OTP e-mail) | Backend | Primeiro acesso sem MFA configurado oferece TOTP (QR + segredo alfanumérico) e OTP e-mail com paridade; segredo TOTP armazenado criptografado (`MFA_FACTOR.segredo_criptografado`) | 6 dp | A Fazer |
| BE-13 | RF-03 — MFA, verificação de código (logins subsequentes) + integração com RN-04 | Backend | Código correto dentro do prazo concede acesso e cria sessão (BE-14); código incorreto/expirado rejeita, permite reenvio, conta para o mesmo limite de bloqueio de RN-04 | 3 dp | A Fazer |
| BE-14 | RF-04 — sessão Redis (criação, TTL deslizante, expiração por inatividade, logout) | Backend | Sessão criada em Redis após MFA (ADR-007); inatividade por 15 min (default) expira automaticamente; logout invalida token imediatamente, mesmo antes do prazo | 4 dp | A Fazer |
| BE-15 | RF-02 — recuperação de senha por e-mail | Backend | E-mail existente recebe link com expiração; e-mail inexistente recebe a mesma mensagem genérica (antienumeração); nova senha definida invalida todas as sessões ativas anteriores | 3 dp | A Fazer |
| BE-16 | RBAC — guards por papel (paciente, administrador operacional, TI hospital, suporte piloto) | Backend | Toda rota protegida verifica papel via guard NestJS no backend, nunca só no frontend; ownership de paciente aplicado em toda query de dado próprio | 5 dp | A Fazer |
| BE-17 | RF-03 — recuperação assistida via suporte (perda de acesso ao segundo fator) | Backend | Endpoint/registro interno para a equipe de suporte (RF-16) executar verificação manual de identidade e resetar o MFA de uma conta — sem self-service (dívida técnica aceita, `SDD.md` §6.2) | 2 dp | A Fazer |

### 3.3 Backend — Cadastro & Consentimento (RF-15, RF-12, RN-01, RN-02)

**Subtotal: 9 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-18 | RF-15 — cadastro com validação de maioridade (RN-01) + match de CPF via Integration Gateway | Backend | Idade < 18 bloqueia cadastro (RN-01, sem exceção); CPF não localizado no sistema do hospital (via BE-06) bloqueia com orientação; sucesso avança para consentimento | 5 dp | A Fazer |
| BE-19 | RF-12 — termos de uso + consentimento LGPD específico (`TERMS_VERSION`, `CONSENT_RECORD`) | Backend | Consentimento de dado de saúde é registro/campo separado do aceite geral de Termos (RN-02, nunca combinado); consentimento registrado com versão do texto, data/hora e titular, imutável | 4 dp | A Fazer |

### 3.4 Backend — Catálogo de Exames, Entrega de Laudo/Imagem, Fila de Exceção (RF-05 a RF-08, RF-14)

**Subtotal: 29 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-20 | RF-05 — listagem/filtro de exames (data/tipo/categoria) | Backend | Lista ordenada por data (mais recente primeiro); filtro por categoria funcional; estado vazio explícito quando não há exames ou quando filtro não retorna resultado | 4 dp | A Fazer |
| BE-21 | RF-06 — exibição de laudo PDF/HTML | Backend | Laudo já recebido é exibido; laudo pendente retorna status "em processamento"; falha de renderização registra incidente (RNF-10) sem expor detalhe técnico | 4 dp | A Fazer |
| BE-22 | RF-07 — exibição de imagem convertida (consumo do Imaging Gateway) | Backend | Imagem convertida é exibida (lendo `EXAM_FILE` já com `tenant_id` e UIDs DICOM persistidos por BE-38); conversão pendente retorna status "em processamento"; falha de conversão registra incidente e notifica suporte (RF-16) sem bloquear o restante da lista | 4 dp `[pós-spike SPK-03]` | A Fazer |
| BE-23 | RF-08 — download com regra de segurança | Backend | Download permitido gera arquivo via URL assinada e registra evento de auditoria; download não permitido pela regra do hospital retorna motivo resumido, sem expor o arquivo | 3 dp | A Fazer |
| BE-24 | RF-14 — ingestão normalizada (`/internal/ingest`) + resiliência | Backend | Resultado recebido é associado ao paciente por CPF; se indisponibilidade da fonte, exames já sincronizados continuam disponíveis; resultado não associável vai para fila de exceção (BE-25), nunca é descartado | 6 dp `[pós-spike SPK-01/SPK-02]` | A Fazer |
| BE-25 | Fila de exceção (`EXCEPTION_QUEUE_ITEM`) + sinalização a admin/suporte | Backend | Registro não associável a paciente conhecido é persistido, não descartado; administrador (RF-13) e suporte (RF-16) são sinalizados da indisponibilidade/pendência; reutilizada por BE-38 para `RemoteAET` desconhecido | 4 dp | A Fazer |
| BE-38 | **[Nova, ADR-012]** Resolução de `tenant_id` via AE Title (`RemoteAET`) + persistência de rastreabilidade DICOM em `EXAM_FILE` | Backend | Notificação do Imaging Gateway (BE-07) é processada: `tenant_id` resolvido casando `RemoteAET` recebido contra `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`; os 3 UIDs DICOM são persistidos em `EXAM_FILE`; `RemoteAET` não cadastrado em nenhum tenant é roteado para a fila de exceção/alerta (BE-25), **nunca** atribuído a um tenant por best-effort; teste automatizado cobre AET conhecido → tenant correto e AET desconhecido → fila de exceção | 4 dp | A Fazer |

### 3.5 Backend — Compartilhamento (RF-09, RN-05, RN-06, RN-07)

**Subtotal: 11 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-26 | RF-09 — geração de link (token único, expiração RN-06 default 72h, escopo RN-07) | Backend | Link gerado só dá acesso ao(s) exame(s) explicitamente selecionado(s), nunca à conta completa; evento "link gerado" registrado em auditoria com data/hora | 5 dp | A Fazer |
| BE-27 | RF-09 — revogação de link + listagem "meus links compartilhados" | Backend | Revogação invalida o link imediatamente, mesmo dentro do prazo original; listagem mostra status ativo/expirado/revogado | 3 dp | A Fazer |
| BE-28 | Endpoint público de acesso via link (destinatário, sem RBAC de usuário autenticado) | Backend | Link válido exibe apenas o exame vinculado; link expirado/revogado retorna mensagem genérica sem distinguir motivo (mitigação de vazamento de comportamento do titular); todo acesso registra evento de auditoria | 3 dp | A Fazer |

### 3.6 Backend — Auditoria (RF-10, RN-08, RNF-04)

**Subtotal: 14 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-29 | `AUDIT_EVENT` append-only + hash chain + privilégio de banco restrito (ADR-009) | Backend | Role de aplicação sem `GRANT UPDATE/DELETE` na tabela; cada evento armazena hash do evento anterior; nenhuma rota/admin consegue editar/excluir evento existente | 6 dp `[pós-spike SPK-05]` | A Fazer |
| BE-30 | Publicação de eventos de auditoria em todos os módulos que geram evento (visualização, download, link, ação administrativa) | Backend | Todo evento de RF-06 a RF-09/RF-13 gera registro em `AUDIT_EVENT` com identificador do exame, tipo de evento, data/hora e ator | 4 dp | A Fazer |
| BE-31 | Endpoint "meu histórico" (paciente) e painel de auditoria do hospital (admin) | Backend | Paciente vê apenas os próprios eventos; administrador vê os eventos do próprio hospital, nunca de outro tenant (RNF-11) | 4 dp | A Fazer |

### 3.7 Backend — Config de Tenant/Branding, ADR-011 (RF-11, RN-10)

> Responde diretamente à condição de ADR-011: nenhuma configuração de
> `BRANDING_CONFIG` pode ser considerada pronta para go-live sem o gate de
> validação de contraste WCAG 2.1 AA aprovado.

**Subtotal: 8 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-32 | `BRANDING_CONFIG` — entidade + campos de ADR-011 (`status_validacao_contraste`, `metodo_validacao`, `validado_por`, `validado_em`, `observacoes_validacao`) | Backend | Entidade criada com os 5 campos de ADR-011; `status_validacao_contraste` inicia como `pendente` para toda configuração nova | 3 dp | A Fazer |
| BE-33 | Utilitário CLI de checagem automatizada de contraste (paleta vs. tokens fixos, `UX-SPEC.md` §3.3, Camada 2) | Backend | Script/CLI interno calcula contraste WCAG 2.1 de `paleta_cores` contra os tokens fixos do sistema; reprovação automática impede avanço do fluxo de aprovação; execução registra resultado em `metodo_validacao='automatizado'` | 3 dp | A Fazer |
| BE-34 | Endpoint/registro interno do checklist manual de logo + gate de ativação (bloqueia go-live) | Backend | Registro de revisão visual manual do `logo_url` por membro da equipe interna, obrigatório mesmo quando a checagem automática de paleta passa (ADR-011); regra de negócio impede que qualquer configuração seja marcada "pronta para go-live" com `status_validacao_contraste != 'aprovado'` | 2 dp | A Fazer |

### 3.8 Backend — Gestão de Usuários (RF-13, RN-04, RNF-11)

**Subtotal: 5 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-35 | RF-13 — consulta/desbloqueio/desativação de conta (escopo do próprio tenant) | Backend | Administrador consulta/desbloqueia/desativa apenas contas do próprio hospital (RNF-11, tentativa de acessar outro tenant é negada); desativação encerra sessões ativas imediatamente; toda ação registra evento de auditoria com identificação do administrador | 5 dp | A Fazer |

### 3.9 Backend — Notificação e Ajuda/Suporte (RF-02, RF-03, RF-09, RF-16)

**Subtotal: 5 dp.**

| ID | Tarefa | Dono | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|
| BE-36 | Adapter de e-mail transacional (provedor abstraído por interface interna, sem lock-in de domínio) | Backend | Interface de notificação usada por RF-02 (recuperação de senha) e RF-03 (OTP e-mail) não referencia o provedor concreto diretamente no domínio; payload de e-mail carrega apenas código/link, nunca dado de saúde (diretriz do CTO Gate 2 para o DevSecOps validar depois) | 3 dp | A Fazer |
| BE-37 | Conteúdo de central de ajuda + canal de contato de suporte (config simples, RN-13) | Backend | Endpoint/config serve o conteúdo de manual de uso e o canal de contato + horário declarado (RN-13, sem SLA formal) | 2 dp | A Fazer |

**Subtotal Backend (soma das seções 3.1 a 3.9, incluindo BE-38): 152 dp.**

---

### 3.10 Frontend — Fundação (Design System, Componentes, Responsividade)

**Subtotal: 19 dp.**

| ID | Tarefa | Dono | Telas/Componentes (`UX-SPEC.md`) | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-01 | Design system — tokens Camada 1 (marca dinâmica) e Camada 2 (sistema fixo, WCAG AA) | Frontend | §3.3 | Tokens de marca consumidos de `BRANDING_CONFIG` via API, nunca hardcoded; regra de contraste dinâmico sobre `--color-brand-primary` implementada (texto claro/escuro calculado automaticamente, ≥ 4.5:1) | 5 dp | Concluído — implementado em `frontend/src/design-system/` (Camada 2 fixa em `tokens/`, Camada 1 dinâmica + regra de contraste em `contrast/` e `branding/`), 49 testes automatizados passando, build/lint limpos (revisão do orquestrador confirmou). Critério de aceite atendido estruturalmente: tokens de marca são sempre lidos via `fetchBrandingConfig()` (nunca hardcoded no código), com ponto único de troca documentado em `branding/brandingApi.ts`. Consumo roda hoje contra fixture local (`branding/brandingConfig.mock.ts`) porque BE-32 (Fase 3) ainda não existe — decisão do orquestrador de não bloquear esta tarefa fundacional de Fase 0 nisso, consistente com §4.4 ("sem dependência cruzada"). Troca pelo endpoint real é ajuste pontual em `brandingApi.ts` quando BE-32 publicar o contrato, não reabertura desta tarefa. |
| FE-02 | Componentes estruturais globais (Header institucional, Navegação paciente/admin, Footer, Modal de confirmação, Banner de mensagem) | Frontend | §3.1 | Header renderiza logo/nome/paleta dinamicamente por tenant; banner de mensagem não desloca layout ao aparecer | 5 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (87/87, limpo). 5 componentes implementados em `frontend/src/design-system/components/` (`Header`, `Navigation`, `Footer`, `ConfirmationModal`, `MessageBanner`), construídos sobre a infraestrutura de FE-01 (`BrandTokensProvider`/`useBrandingTokensStatus`), sem recriar tokens/contraste/branding. 40 novos testes automatizados (RTL + user-event), 87 testes totais no frontend passando, cobertura 100% nos 4 componentes sem achado pendente (`ConfirmationModal` 96.96%, únicas linhas não cobertas são branches defensivas). Build (`tsc -b && vite build`) e lint (`oxlint`) limpos. Não depende de mock de API (FE-02 é puramente estrutural/apresentacional, sem chamada de rede própria). Critério de aceite verificado: (a) Header — logo e paleta 100% dinâmicos via `BrandTokensProvider` (mesmo mock de FE-01, aguardando BE-32); nome do hospital é prop explícita `hospitalName` (decisão de detalhe documentada no próprio componente — `UX-SPEC.md` §3.1 aponta `BRANDING_CONFIG` como fonte do nome, mas `SDD.md` §5 mantém `nome_institucional` em `TENANT`, não em `BRANDING_CONFIG`; como o tipo `BrandingConfig` de FE-01 já reflete corretamente o `SDD.md`, estender o módulo de branding para isso seria recriá-lo fora do escopo desta tarefa — a fonte real de `hospitalName` é decisão de integração de uma tarefa futura). (b) `MessageBanner` — região de layout sempre montada com `min-height` reservado via estilo inline, mensagem não desloca o restante da página ao aparecer/desaparecer (testado). Demais critérios transversais de acessibilidade (`UX-SPEC.md` §5.1/GUARDRAILS.md H.32) tratados na implementação: navegação por teclado completa (incl. trap de foco + devolução de foco no `ConfirmationModal`, análogo ao exigido para FE-10), estado nunca só por cor (ícone + rótulo textual em `MessageBanner`, ícone no botão destrutivo do modal), rótulos programáticos (`aria-labelledby`/`aria-describedby` no modal, `aria-label` no toggle de menu), `aria-live` (`role="status"`/`"alert"` configurável em `MessageBanner`), alvo de toque mínimo 44px em todos os controles interativos. Responsivo (`UX-SPEC.md` §6.1/§6.2): `Navigation` colapsa em menu hambúrguer abaixo de 600px (decisão de detalhe do Frontend Developer, permitida explicitamente pela spec); `ConfirmationModal` ocupa a tela inteira em mobile. Ajuste de infraestrutura de teste feito nesta tarefa: `src/test/setup.ts` passou a registrar `afterEach(cleanup)` do RTL (fora antes, mascarado nos testes de FE-01 por não colidirem em queries repetidas) — os 87 testes (incluindo os 49 pré-existentes de FE-01) foram reexecutados após a mudança e continuam passando. |
| FE-03 | Componentes de formulário (máscara CPF, seletor de data acessível, indicador de força de senha, campo de código MFA, checkboxes de aceite padrão vs. destacado) | Frontend | §3.2 | Todos navegáveis por teclado; checkbox de consentimento de dado de saúde visual e programaticamente distinto do aceite geral (RN-02); campo de código MFA aceita colar código completo, não só digitação célula a célula | 6 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (152/152, limpo). 6 componentes implementados em `frontend/src/design-system/components/` (`CpfField`, `DateOfBirthField`, `PasswordField`, `MfaCodeField`, `TermsAcceptanceCheckbox`, `HealthDataConsentCheckbox`), construídos sobre a infraestrutura de FE-01/FE-02 (tokens/contraste), sem recriá-la. 65 novos testes automatizados (RTL + user-event), 152 testes totais no frontend passando; `npm run lint` (oxlint) e `npm run build` (`tsc -b && vite build`) limpos; cobertura das 6 pastas novas entre 96,77% e 100% de statements (gaps residuais são branches defensivas de props opcionais raramente usadas, ex.: `id` customizado). Não depende de mock/API própria — são componentes de formulário puros (sem chamada de rede). Critério de aceite verificado: (a) **Navegação por teclado** — todos os 6 componentes testados explicitamente com `Tab`/setas/`Espaço`/`Backspace` via `user-event`, nenhum depende de mouse. (b) **RN-02** — `HealthDataConsentCheckbox` e `TermsAcceptanceCheckbox` são dois componentes distintos (não uma variante configurável por prop de um único componente), garantindo que a distinção nunca dependa de uso correto de uma prop por quem compõe a tela; distinção visual (moldura, fundo tingido, ícone, selo textual "Consentimento específico para dado de saúde", nunca só cor) e programática (`role="group"` com nome acessível próprio + `aria-label` do próprio checkbox combinando grupo e texto — testado que o "accessible name" dos dois checkboxes nunca colide, inclusive com teste de integração dos dois lado a lado). (c) **MFA paste** — `MfaCodeField` testado colando o código completo tanto na primeira quanto em uma caixa do meio (índice 3 de 6), preenchendo tudo a partir da primeira caixa e disparando `onComplete`; também cobre paste com caracteres não numéricos, paste parcial, digitação célula a célula com auto-avanço (reforço opcional, não obrigatório) e `Backspace`/setas nativos. Acessibilidade transversal (`UX-SPEC.md` §5.1): rótulo programático em todos os campos (`<label htmlFor>`/`aria-label`/`fieldset+legend`), erro nunca só por cor (ícone+texto na checklist de senha, `role="alert"` nas mensagens), alvo de toque mínimo 44px, indicador de foco visível (`:focus-visible`). Decisões de detalhe documentadas nos próprios componentes: `DateOfBirthField` usa três `<select>` (Dia/Mês/Ano) em vez de `<input type="date">` (calendário nativo inconsistente entre navegadores/leitores de tela) — dias do mês recalculados dinamicamente (fevereiro não bissexto = 28), preservando dia/ano já escolhidos ao trocar só o mês; `PasswordField` usa uma política de senha configurável com default documentado (mínimo 8 caracteres + maiúscula/minúscula/número) porque `PRD-TECNICO.md` não fixa valores numéricos para "política mínima" — mesmo princípio já usado pelo Tech Lead em `TASK.md` §1.7 para outros parâmetros "a confirmar", não uma decisão de regra de negócio fechada por este agente. |
| FE-04 | Framework responsivo (breakpoints mobile/tablet/desktop, colapso lista→card em mobile) | Frontend | §6 | Formulários sempre coluna única em qualquer breakpoint; listas/tabelas densas colapsam para cards em mobile, nunca scroll horizontal forçado | 3 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (181/181, limpo). Implementado em `frontend/src/design-system/responsive/` (tokens/hooks) e `frontend/src/design-system/components/{FormLayout,ResponsiveDataList}/` (padrões de composição), construído sobre a infraestrutura de FE-01/FE-02/FE-03 (tokens de espaçamento/cor/tipografia, sem recriá-los). 181 testes totais no frontend passando (26 novos: `breakpoints.test.ts`, `useMediaQuery.test.tsx`, `useBreakpoint.test.tsx`, `ResponsiveDataList.test.tsx`, `FormLayout.test.tsx`), `npm run lint` (oxlint) e `npm run build` (`tsc -b && vite build`) limpos; cobertura 100% (statements/branches/funcs/lines) nos 5 arquivos novos de lógica (`breakpoints.ts`, `useMediaQuery.ts`, `useBreakpoint.ts`, `ResponsiveDataList.tsx`, `FormLayout.tsx`), confirmada via `npm run test:coverage`. Não depende de mock/API — é infraestrutura de UI pura, sem chamada de rede. Entregue: (1) `breakpoints.ts` — fonte única de verdade dos 3 breakpoints de `UX-SPEC.md` §6.1 (mobile <=599px, tablet 600-1023px, desktop >=1024px) e das strings de media query derivadas (`MEDIA_QUERIES`), documentando explicitamente que CSS Modules que precisarem expressar a mesma faixa devem replicar o valor em pixel (sem `@custom-media`/PostCSS neste projeto — decisão de escopo, desproporcional a 3 dp), mesmo padrão já usado (e já consistente, `599px`) por `Navigation.module.css`/`ConfirmationModal.module.css` de FE-02, não alterados nesta tarefa. (2) `useMediaQuery`/`useBreakpoint` — hooks reutilizáveis baseados em `window.matchMedia` (com fallback para a API legada `addListener`/`removeListener`, Safari < 14), únicos consumidores previstos de lógica de breakpoint orientada a JS no design system. (3) `ResponsiveDataList` — padrão reutilizável de colapso lista→card: `<table>` semântica (`<th scope="col">`) em tablet/desktop, lista de cards (`<ul>`/`<li>` com `<dl>` de pares rótulo/valor, coluna opcional `isCardTitle` como destaque do card) em mobile — nunca as duas estruturas simultâneas no DOM (decisão de arquitetura documentada no componente: colapso decidido em JS via `useBreakpoint`, não em CSS puro como Navigation/FE-02, para evitar duplicidade de conteúdo anunciada a leitor de tela e para tornar a lógica de colapso testável sem depender do motor de CSS do jsdom avaliar `@media` — mesma limitação de ambiente já documentada em `Navigation.test.tsx`/FE-02, aqui contornada por completo em vez de só documentada, já que a estrutura em si é testável por mock de `matchMedia`). Nenhuma tela concreta consome este componente ainda — telas com listas/tabelas reais (TL-21, TL-24, TL-27, TL-31, TL-33) o consomem a partir de FE-12 em diante, conforme já definido pela ordem do próprio `TASK.md`. (4) `FormLayout` — wrapper estrutural de formulário que força coluna única em qualquer breakpoint (`UX-SPEC.md` §6.2 — não é "mobile first que expande", é sempre única, inclusive em desktop), a ser usado pelas telas de formulário (FE-06 em diante: TL-02, TL-05, TL-06, TL-08, TL-13, TL-17, TL-19, TL-25) em vez de cada uma decidir layout ad hoc; testado inclusive por leitura do CSS bruto (`?raw`, mesma técnica de `fixedTokenValues.sync.test.ts`/FE-01) confirmando a ausência de qualquer `@media` que introduza multi-coluna. Testes seguem a limitação de ambiente já documentada em FE-02 (motor de CSS do jsdom não avalia `@media` de forma confiável a partir de `window.innerWidth`): a lógica de breakpoint é validada via mock de `matchMedia` (`frontend/src/test/matchMedia.ts`, novo utilitário de teste compartilhado, fora da árvore de cobertura por já estar em `src/test/**`) e a estrutura semântica do colapso lista→card é validada por queries de role/DOM; a aparência visual real (tipografia, espaçamento, quebra em 200% de zoom) fica para revisão/QA manual, mesmo padrão de FE-02. Decisão de detalhe adicional documentada no próprio `useMediaQuery.ts`: o hook ajusta estado durante a renderização (não dentro do corpo de um efeito) quando a `query` recebida muda entre renderizações, para evitar o padrão de "`setState` síncrono dentro de efeito" sinalizado pelo lint (`react(set-state-in-effect)`) — padrão recomendado pelo próprio React para esse caso. |

### 3.11 Frontend — Cadastro e Login/MFA (TL-01 a TL-16)

**Subtotal: 21 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-05 | Landing pública | Frontend | TL-01 | CTAs "Entrar"/"Criar conta" funcionais, branding dinâmico aplicado | 1 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (199/199, limpo). Implementado em `frontend/src/pages/LandingPage/` (TL-01), construído sobre `Header`/`Footer` de FE-02 e os tokens de marca de FE-01, sem recriar nenhum dos dois. 16 novos testes automatizados (RTL + user-event), 199 testes totais no frontend passando (`npm run test`), `npm run lint` (oxlint) e `npm run build` (`tsc -b && vite build`) limpos; cobertura 100% (statements/branches/funcs/lines) nos arquivos novos (`App.tsx`, `routes.tsx`, `LandingPage.tsx`, `PlaceholderPage.tsx`), confirmada via `npm run test:coverage`. Não depende de mock de API própria — a única dependência de dado dinâmico da tela (`BRANDING_CONFIG`) já é resolvida por `Header`/`BrandTokensProvider` (FE-01/FE-02, mock-aware naquela tarefa, não reaberta aqui). **Decisão de roteamento (primeira introdução de roteamento no projeto)**: `react-router-dom` v7 (`BrowserRouter`), dentro da autoridade do Frontend Developer — nenhum artefato de arquitetura/`UX-SPEC.md`/`TASK.md` fixava biblioteca. Rotas centralizadas em `frontend/src/routes.tsx` (`appRoutes`, reutilizado por `App.tsx` em produção e por `MemoryRouter` em teste, sem duplicar a lista). CTAs "Entrar"/"Criar conta" são `<Link>` para `/entrar`/`/criar-conta` — como as telas reais (login = FE-08/TL-08; cadastro = FE-06/TL-02) ainda não existem, cada rota aponta para um componente `PlaceholderPage` (`frontend/src/pages/PlaceholderPage/`, novo, não é uma tela do `UX-SPEC.md`) só para dar destino de navegação real e não bloquear esta tarefa de 1 dp — troca pontual do `element` de cada rota em `routes.tsx` quando FE-06/FE-08 forem implementadas, não reabertura de FE-05. Critério de aceite verificado: (a) **CTAs funcionais** — testado com clique e com navegação só por teclado (`Tab`/`Enter`, sem depender de mouse) via `user-event`, confirmando `href` correto e a troca real de tela ao navegar (`App.test.tsx`, inclusive um teste montando `App.tsx` real com `BrowserRouter`, não só a lista de rotas em isolado). (b) **Branding dinâmico aplicado** — `Header` reutilizado integralmente (logo/paleta 100% dinâmicos por tenant, mesmo mecanismo de FE-01/FE-02); CTAs usam `--color-brand-primary`/`--color-brand-primary-contrast-text` (nunca cor hardcoded, verificado por teste estrutural do CSS Module, mesma técnica de `FormLayout.test.tsx`/FE-04) e teste de integração confirmando o logo trocando dinamicamente quando `BRANDING_CONFIG` resolve. `FormLayout` (FE-04) **não** é usado nesta tela — TL-01 não tem formulário, só dois CTAs; aplicável apenas às telas de formulário listadas no próprio `FormLayout.tsx` (FE-06 em diante), decisão de escopo documentada, não uma omissão. Acessibilidade (`UX-SPEC.md` §5.1): `h1` único com a mensagem de boas-vindas, CTAs como `<a>` nativo (focável/ativável por teclado sem JS extra), alvo de toque mínimo 44px, indicador de foco visível (`:focus-visible`), Footer com `nav aria-label` (herdado de FE-02). Responsivo (`UX-SPEC.md` §6.1): CTAs empilham em coluna abaixo de 599px (mesmo breakpoint de `FE-04`/`breakpoints.ts`), lado a lado em tablet/desktop. Decisão de detalhe adicional: `hospitalName` continua como prop explícita do `Header` (mesma decisão já documentada em FE-02 — `BrandingConfig` não carrega nome institucional, `SDD.md` mantém `nome_institucional` em `TENANT`), com default de desenvolvimento `"Hospital Piloto"`; a resolução real por tenant/sessão é integração de tarefa futura, não desta. Limpeza feita como efeito colateral direto desta tarefa (não escopo novo): `App.tsx` substituído (a demo estrutural de FE-02 já tinha cobertura própria e independente em cada componente, não perdida) e a duplicação de `<BrandTokensProvider>` (antes aplicado tanto em `main.tsx` quanto dentro do próprio `App.tsx`) removida, ficando uma única instância em `main.tsx`. |
| FE-06 | Cadastro — dados pessoais + bloqueios | Frontend | TL-02, TL-03, TL-04 | Bloqueio de menor de idade (TL-03) sem opção de tentar novamente com outra data (RN-01); erro de CPF não localizado (TL-04) orienta recepção do hospital | 4 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (248/248, limpo), com leitura direta de `ageValidation.ts` e `CadastroBloqueioMenorIdadePage.tsx` confirmando RN-01 sem caminho de volta ao formulário. Decisão do orquestrador sobre o mock de CPF (mesmo princípio de FE-01/§4.4): o mecanismo de consumo é uma abstração real e testável (injeção de dependência, ponto único de troca documentado), TL-04 está construída e testada como estado de tela — não fica bloqueada pela ausência de um endpoint real que depende de uma premissa de negócio ainda não resolvida (P1, hospital piloto). Implementado em `frontend/src/pages/{CadastroDadosPessoaisPage,CadastroBloqueioMenorIdadePage,CadastroCpfNaoLocalizadoPage}/` (TL-02/TL-03/TL-04), construído sobre `CpfField`/`DateOfBirthField` (FE-03), `FormLayout`/`MessageBanner` (FE-04/FE-02) e o roteamento de FE-05 (`routes.tsx`: `/criar-conta` agora aponta para a tela real, com `/criar-conta/bloqueio-idade` e `/criar-conta/cpf-nao-localizado` como novas rotas; `/criar-conta/termos` vira o novo placeholder até FE-07). 30 novos testes automatizados (RTL + user-event; total do frontend 248/248 passando), `npm run lint` (oxlint) e `npm run build` (`tsc -b && vite build`) limpos; cobertura 97-100% (statements/branches/funcs/lines) nos arquivos novos via `npm run test:coverage` — únicas linhas não cobertas são guardas defensivas de `isMountedRef.current` (mesmo padrão já aceito em `useBrandingTokens.ts`/FE-01, corrida rara de unmount antes da promise resolver) e um default de prop opcional em `TextField.tsx`. **RN-01, sem exceção**: idade calculada 100% no cliente (`ageValidation.ts`, aritmética inteira sobre ano/mês/dia, sem `new Date` construído a partir da string — nunca normaliza silenciosamente uma data de calendário inválida) e verificada **antes** de qualquer chamada ao serviço de match de CPF — testado explicitamente que, para um paciente menor de idade, o mock de CPF nunca é chamado (`lookup).not.toHaveBeenCalled()`) e que a tela de bloqueio (TL-03) não contém nenhum formulário, campo de data ou link de volta ao cadastro — único CTA é "Voltar à página inicial" (`/`), nunca de volta a `/criar-conta`. **CPF não localizado (TL-04)**: implementado e testado (mensagem orientando a recepção do hospital + link secundário "Já tenho cadastro, entrar" → `/entrar`), mas **mock-aware com pendência real de backend** — RF-14/BE-18 (`TASK.md` §3.4, "A Fazer" nesta data) ainda não tem endpoint publicado em nenhum `API-CONTRACT.yaml` (o arquivo em si ainda não existe no repositório). `patientLookupApi.ts` documenta essa distinção explicitamente frente ao mock de `BRANDING_CONFIG`/FE-01: lá havia um schema estável em `SDD.md`/ADR-011 para derivar uma fixture fiel; aqui não existe nenhuma fonte de dado plausível de "pacientes reais do hospital piloto" (depende do RIS/HIS de um hospital ainda não escolhido, Premissa P1) — inventar uma lista fixa de CPFs "válidos" criaria falsa cobertura de uma regra de negócio real. Por isso o mock é deliberadamente otimista (sempre `{ found: true }`): o estado de erro TL-04 existe e está testado via injeção de dependência (`lookupPatientByCpf` como prop, mesmo padrão de `fetchFn` de `useBrandingTokens`/FE-01), mas não pode ser desencadeado de verdade pela UI em produção hoje. Esta pendência não impede o fechamento da tarefa (ver decisão do orquestrador no início desta célula) — quando BE-18 publicar o endpoint real, `patientLookupApi.ts` troca para uma chamada HTTP de fato (mesma assinatura, ponto único de troca documentado no próprio arquivo), sem exigir mudança na tela consumidora e sem reabrir FE-06 (`QA-REPORT.md`, `QA-DEBT-011`). Demais critérios verificados: (a) **Sem submissão parcial** — `handleSubmit` marca todos os campos como "tentativa de envio" de uma vez (revela erro em campo nunca tocado) e só prossegue com o formulário inteiro válido; testado que o CTA único "Continuar" com formulário vazio revela erro em todos os 5 campos simultaneamente sem navegar. (b) **Acessibilidade** (`UX-SPEC.md` §5.1): rótulo programático em todo campo (reaproveitando `CpfField`/`DateOfBirthField` de FE-03, mais um `TextField` novo — decisão de detalhe, não um componente de design system: usado só nesta tela para nome/e-mail/celular, ver comentário em `phone.ts` sobre por que não virou um novo componente global de FE-03); erro nunca só por cor (`role="alert"` + texto, mesmo padrão de `CpfField`); spinner textual + `aria-busy`/`disabled` no botão "Continuar" durante a validação assíncrona de CPF (estado "Carregando" de TL-02 no `UX-SPEC.md` §4); foco movido programaticamente para o `<h1>` ao entrar em TL-03/TL-04 via navegação SPA (`tabIndex={-1}` + `.focus()` no mount), para que um leitor de tela anuncie o desfecho do fluxo sem exigir navegação manual; testado que todo o formulário é preenchível e submetível só por teclado (`Tab` + digitação + `Enter`, sem mouse). (c) **Tom visual distinto TL-03 vs. TL-04** (`UX-SPEC.md`): `MessageBanner` `variant="info"` em TL-03 (regra de negócio, não erro/culpa do paciente) vs. `variant="warning"` em TL-04 (ação necessária, sem sugerir falha) — decisão de detalhe documentada no próprio `CadastroCpfNaoLocalizadoPage.tsx`, já que o `UX-SPEC.md` não fixa a variante exata, só o tom relativo a TL-03. Celular: sem componente de máscara dedicado em FE-03 (só CPF/data foram listados) — máscara/validação de telefone (`phone.ts`) implementada como utilitário puro local a esta tela, não exportado pelo design system, mesma lógica de "dígitos crus controlados" já usada por `CpfField`/`cpf.ts`. |
| FE-07 | Termos/consentimento, definir senha, confirmação | Frontend | TL-05, TL-06, TL-07 | Dois controles de aceite visual e semanticamente distintos (RN-02); CTA "Concluir cadastro" desabilitado até ambos os aceites; login não automático após cadastro | 4 dp | Concluído — revisão do orquestrador reexecutou `test`/`build`/`lint` de forma independente (279/279, limpo), confirmando o teste explícito de ausência de sessão em `CadastroConfirmacaoPage.test.tsx`. Mesmo princípio de FE-06 aplicado ao mock de termos/registro (mecanismo testável, não fica bloqueada por endpoint que depende de tarefa de Backend ainda não alcançada no backlog). Implementado em `frontend/src/pages/{CadastroTermosConsentimentoPage,CadastroDefinirSenhaPage,CadastroConfirmacaoPage}/` (TL-05/TL-06/TL-07), construído sobre `TermsAcceptanceCheckbox`/`HealthDataConsentCheckbox`/`PasswordField` (FE-03), `FormLayout`/`MessageBanner` (FE-04/FE-02) e o roteamento de FE-05/FE-06 (`routes.tsx`: `/criar-conta/termos` deixa de ser placeholder; `/criar-conta/senha` e `/criar-conta/sucesso` são rotas novas). 279 testes totais no frontend passando (RTL + user-event; `npm run test`), `npm run lint` (oxlint) e `npm run build` (`tsc -b && vite build`) limpos; cobertura 82-100% nos arquivos novos (`npm run test:coverage`) — únicos gaps são guardas defensivas de `isMountedRef.current`/`!content` (mesmo padrão já aceito em `useBrandingTokens.ts`/FE-01 e `CadastroDadosPessoaisPage.tsx`/FE-06). **RN-02, composição na tela real (TL-05)**: os dois componentes de FE-03 são reutilizados lado a lado sem nenhuma alteração — a distinção visual/programática (moldura, ícone, selo "Consentimento específico para dado de saúde", `role="group"` próprio) já testada em FE-03 é preservada na composição; teste de integração próprio confirma que os nomes acessíveis dos dois checkboxes nunca colidem nesta tela. **CTA "Concluir cadastro" desabilitado até ambos os aceites**: o botão só é renderizado quando `TERMS_VERSION` carrega com sucesso (não pode haver aceite sem conteúdo visível, `UX-SPEC.md` §4) e permanece `disabled` (bloqueio real de atributo HTML, nunca só indicação visual) até `termsAccepted && healthDataConsentAccepted` — testado marcando um checkbox por vez (CTA seguue desabilitado), os dois (CTA habilita) e desmarcando um dos dois de novo (CTA volta a desabilitar). **Login não automático (TL-07)**: garantido estruturalmente em duas camadas — (1) `registrationApi.ts` (mock de BE-18/BE-19) nunca retorna token/sessão, só `{ success: true }`, documentado como parte do próprio contrato esperado do endpoint real (ADR-007 exige sessão server-side via cookie `HttpOnly`, nunca criada pelo cliente); (2) `CadastroConfirmacaoPage`/`CadastroDefinirSenhaPage` não importam nenhum mecanismo de autenticação/sessão. Testado explicitamente (não só por ausência de código): após a submissão bem-sucedida e a chegada em TL-07, `localStorage.length`, `sessionStorage.length` e `document.cookie` são verificados vazios, tanto no teste de `CadastroDefinirSenhaPage` quanto no de `CadastroConfirmacaoPage`; o único caminho para a área autenticada continua sendo o CTA "Ir para o login" (`<Link>` comum para `/entrar`, TL-08, ainda placeholder até FE-08), sem nenhum estado pré-populado por este cadastro. **Mock-aware (pendência real de backend, mesmo padrão de FE-06)**: BE-18 (RF-15) e BE-19 (RF-12, `TERMS_VERSION`+`CONSENT_RECORD`) seguem "A Fazer" nesta data e nenhum `API-CONTRACT.yaml` foi publicado no repositório até o momento desta implementação — `termsApi.ts` (conteúdo de Termos/Política de Privacidade) e `registrationApi.ts` (submissão final TL-06→TL-07) são mocks documentados com o mesmo padrão de injeção de dependência já usado por `lookupPatientByCpf`/FE-06 (`fetchTerms`/`submitRegistration` como props, ponto único de troca quando o endpoint real existir). Diferente do CPF (sem nenhuma fonte plausível de dado real, premissa de negócio não resolvida), o texto de Termos não depende de integração externa — o mock retorna conteúdo placeholder plausível, permitindo exercitar de verdade os estados de carregamento/erro/sucesso de TL-05; `registrationApi.ts` documenta explicitamente que o formato de payload único usado aqui é uma simplificação do mock, e que o contrato real (quando publicado) pode exigir duas chamadas separadas (consistente com RN-02 exigir registro de consentimento separado) — troca pontual, sem reabrir a composição de tela. Essa pendência não impede o fechamento da tarefa (ver decisão do orquestrador no início desta célula) — mesmo critério já aplicado a FE-06, as três telas estão totalmente implementadas/testadas. Decisão de detalhe documentada nos próprios componentes: TL-05/TL-06 não aplicam o padrão de foco automático no `<h1>` usado em TL-03/TL-04/TL-07 (são telas de formulário com estado dinâmico próprio, mesma categoria de TL-02, não telas de "resultado/desfecho"); dados coletados em TL-02 são repassados entre as telas via `location.state` do `react-router-dom` (`cadastroPersonalData.ts`), sem introduzir nenhuma store global, desproporcional ao escopo de 4 dp. |
| FE-08 | Login + erro genérico + conta bloqueada | Frontend | TL-08, TL-09, TL-10 | Mensagem de erro genérica sem indicar campo incorreto; área de erro reservada no layout (não desloca conteúdo) | 3 dp | A Fazer |
| FE-09 | MFA — setup, verificação, recuperação assistida | Frontend | TL-11, TL-12, TL-13, TL-14 | QR code sempre acompanhado de código alfanumérico alternativo (nunca escondido); sem opção de "pular" em nenhum ponto (RN-03) | 6 dp | A Fazer |
| FE-10 | Aviso de expiração de sessão + sessão expirada | Frontend | TL-15, TL-16 | Modal com `role="alertdialog"`, foco movido ao aparecer e devolvido ao fechar; logout manual não passa por esse modal | 3 dp | A Fazer |

### 3.12 Frontend — Recuperação de Senha (TL-17 a TL-20)

**Subtotal: 4 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-11 | Esqueci minha senha, confirmação de envio, redefinir senha, link expirado | Frontend | TL-17, TL-18, TL-19, TL-20 | Mensagem de confirmação idêntica exista ou não o e-mail (antienumeração); nova senha exige validação de política mínima inline | 4 dp | A Fazer |

### 3.13 Frontend — Consulta e Download de Exame (TL-21 a TL-24)

**Subtotal: 14 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-12 | Meus Exames — lista + filtros + estados | Frontend | TL-21 | Filtro persiste visível mesmo sem resultado; estado vazio explicativo distinto de erro; skeleton durante carregamento | 4 dp | A Fazer |
| FE-13 | Detalhe — Laudo (visualizador PDF/HTML acessível) | Frontend | TL-22 | Visualizador embutido navegável por teclado e leitor de tela (critério a validar formalmente em QA); ações "Baixar"/"Compartilhar" ocultas (não só desabilitadas) quando a regra do hospital não permite, com motivo acessível ao foco/leitor de tela | 5 dp `[pós-spike SPK-06]` | A Fazer |
| FE-14 | Detalhe — Imagem (JPEG/PNG) | Frontend | TL-23 | `alt` text com metadados do exame (nunca vazio); texto de apoio visível gerenciando expectativa sobre ausência de zoom/pan dedicado (ADR-003) | 3 dp | A Fazer |
| FE-15 | Meu Histórico | Frontend | TL-24 | Lista cronológica sem nenhuma ação de edição/exclusão disponível (RN-08) | 2 dp | A Fazer |

### 3.14 Frontend — Compartilhamento (TL-25 a TL-29)

**Subtotal: 9 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-16 | Compartilhar exame (modal de geração), link gerado, meus links compartilhados | Frontend | TL-25, TL-26, TL-27 | Prazo de expiração consumido de configuração (nunca hardcoded "72 horas" no texto); data/hora de expiração exibida em formato absoluto, não só relativo | 6 dp | A Fazer |
| FE-17 | Visualização do destinatário + link expirado/inválido | Frontend | TL-28, TL-29 | Destinatário nunca acessa navegação principal do portal nem outros exames (RN-07); mensagem de expiração não distingue expiração natural de revogação manual | 3 dp | A Fazer |

### 3.15 Frontend — Administração (TL-30 a TL-33)

**Subtotal: 9 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-18 | Login administrativo (reuso) + Painel de gestão de usuários + Detalhe/ações | Frontend | TL-30, TL-31, TL-32 | Lista/tabela apenas de pacientes do próprio hospital; CPF mascarado por padrão com opção de revelar (`aria-pressed`); ação sensível exige modal de confirmação | 6 dp | A Fazer |
| FE-19 | Painel de auditoria do hospital | Frontend | TL-33 | Tabela semântica (`<table>`/`<th scope="col">`), filtro por paciente/tipo de evento/período, nunca dado de outro tenant | 3 dp | A Fazer |

### 3.16 Frontend — Ajuda/Suporte e Transversais (TL-34, TL-35)

**Subtotal: 12 dp.**

| ID | Tarefa | Dono | Telas | Critério de aceite | Estimativa | Status |
|---|---|---|---|---|---|---|
| FE-20 | Central de Ajuda / Manual de uso + Contato de Suporte | Frontend | TL-34, TL-35 | Estrutura de FAQ/acordeão acessível; horário de suporte exibido explicitamente, sem promessa de SLA formal | 3 dp | A Fazer |
| FE-21 | Passe de acessibilidade WCAG 2.1 AA transversal (revisão cross-tela, `aria-live`, gestão de foco, validação de contraste dinâmico Camada 1) | Frontend | Todas | Regras transversais de `UX-SPEC.md` §5.1 verificadas nas 35 telas; pontos específicos de maior risco (§5.2) tratados individualmente | 5 dp | A Fazer |
| FE-22 | Integração de contrato de API (client HTTP, tratamento de erro padrão, estados de loading/erro reutilizáveis) | Frontend | Todas | Client HTTP consome `API-CONTRACT.yaml` publicado pelo Backend; estado de erro/loading é componente compartilhado, não reimplementado tela a tela | 4 dp | A Fazer |

**Subtotal Frontend (soma das seções 3.10 a 3.16): 88 dp.**

---

## 4. Dependências e Ordem de Execução

### 4.1 Diretriz de paralelização — contrato de API primeiro

Para reduzir a dependência sequencial estrita entre Backend e Frontend, o Backend
publica `API-CONTRACT.yaml` (OpenAPI 3.x, `PIPELINE-CONVENTIONS.md` §1) **por
módulo, incrementalmente**, assim que o desenho do endpoint estiver definido —
**antes** da implementação completa terminar. O Frontend consome o contrato
(mock/stub) para começar a construção de tela em paralelo ao Backend implementar
o endpoint real, integrando de fato assim que o endpoint estiver disponível.
**Sem essa prática, a dependência vira estritamente sequencial e o risco de prazo
da Seção 5 piora.**

### 4.2 Fases de execução (visão macro)

| Fase | Semanas (referência, 20 semanas) | Foco | Tarefas principais |
|---|---|---|---|
| Fase 0 — Fundação | 1-2 | Setup de infraestrutura + design system + spikes | BE-01, BE-02, BE-05, BE-08, SPK-01 a SPK-06 (paralelos onde possível — SPK-07 já resolvido via ADR-012 antes desta fase), FE-01 a FE-04 |
| Fase 1 — Segurança e Identidade | 2-6 | Multi-tenancy + Identity & Access + integração base | BE-03, BE-04, BE-06, BE-07, BE-09, BE-10 a BE-17, FE-05 a FE-10 (contra mock) |
| Fase 2 — Núcleo de valor (exames) | 5-12 | Cadastro, Catálogo, Entrega, Fila de exceção, Auditoria (início cedo) | BE-18 a BE-25, BE-38 (resolução de tenant/rastreabilidade DICOM, logo após BE-07), BE-29 a BE-31 (auditoria iniciada aqui, não esperar Fase 3), FE-06 a FE-15 |
| Fase 3 — Compartilhamento, Admin, Branding | 8-16 | Compartilhamento, gestão de usuários, gate ADR-011 | BE-26 a BE-28, BE-32 a BE-35, FE-16 a FE-19 |
| Fase 4 — Suporte, hardening, QA intensivo | 12-20 | Notificação, ajuda, acessibilidade transversal, hardening final | BE-36, BE-37, FE-20 a FE-22, ciclo de QA concentrado |

### 4.3 Tabela de dependências (o que bloqueia o quê)

| Tarefa(s) predecessora(s) | Bloqueia | Motivo |
|---|---|---|
| BE-02 (schema base) | BE-03, BE-04 e todas as tarefas de módulo de domínio (BE-10+) | Nenhuma entidade de domínio existe antes do schema base |
| BE-03, BE-04 (guard tenant + RLS + teste de vazamento) | **Qualquer PR que acesse dado de domínio**, backend ou frontend integrando dado real | Condição do Gate 2 do CTO — regra também em `GUARDRAILS.md` |
| BE-05 (Redis) | BE-14 (sessão) | Sessão depende do Redis operacional |
| BE-06 (Integration Engine) | BE-18 (match CPF), BE-24 (ingestão), indiretamente BE-20/BE-21 (sem dado ingerido não há o que listar/exibir) | RF-14 é pré-condição de negócio para RF-05/RF-06/RF-07 (`PRD-TECNICO.md` §5.1) |
| BE-02 (schema base, campos ADR-012) | BE-38 | `dicom_remote_ae_title`/UIDs DICOM precisam existir no schema antes da lógica de resolução ser implementada |
| BE-03, BE-04 (guard tenant + RLS) | BE-38 | BE-38 persiste dado com `tenant_id` resolvido — passa pelo mesmo guard obrigatório, sem exceção |
| BE-07 (Imaging Gateway) | BE-38 (resolução de tenant + persistência de UIDs) | BE-38 consome a notificação (`RemoteAET` + UIDs) que BE-07 produz |
| BE-25 (fila de exceção) | BE-38 | `RemoteAET` não cadastrado é roteado para a fila de exceção já construída em BE-25, não reimplementado |
| BE-38 (resolução de tenant + rastreabilidade DICOM) | BE-22 (exibição de imagem) | Sem `tenant_id` resolvido e UIDs persistidos, não há o que exibir de forma segura/rastreável — substitui a dependência anterior "BE-07 → BE-22" direta |
| BE-16 (RBAC) | BE-31 (painel de auditoria admin), BE-35 (gestão de usuários), toda rota administrativa | Guards de papel são pré-condição de qualquer rota restrita a admin |
| BE-29 (`AUDIT_EVENT`) | BE-23, BE-26/27/28, BE-30, BE-31, BE-35 | Todas essas tarefas publicam evento de auditoria — recomendação: iniciar BE-29 já na Fase 1/2, não esperar a Fase 3 |
| BE-10 a BE-15 (Identity/MFA/Sessão) | FE-08 a FE-19 (integração final, não o desenvolvimento de tela em si — ver 4.1) | Toda tela autenticada depende de sessão/RBAC reais para a integração final |
| SPK-06 | FE-13 | Estimativa final do visualizador de PDF/HTML acessível depende do spike |
| SPK-01, SPK-02 | BE-06, BE-24 (estimativa final) | Protocolo real do hospital piloto e curva de aprendizado da engine |
| SPK-03 | BE-07, BE-22 (estimativa final) | Pipeline DICOM permanece gap de especialização (Gate 1), mesmo com ADR-012 já formalizando o mecanismo de tenant (SPK-07 resolvido, não bloqueia mais) |
| SPK-04 | BE-03, BE-04 (estimativa final) | Desenho de RLS + guard precisa ser validado antes de escalar |
| SPK-05 | BE-29 (estimativa final) | Formato de hash chain |

### 4.4 O que roda em paralelo

- **Backend Fase 0 (setup de infraestrutura) roda inteiramente em paralelo ao
  Frontend Fase 0 (design system, FE-01 a FE-04)** — sem dependência cruzada.
- A partir da Fase 1, cada fluxo de tela do Frontend (FE-06 a FE-20) pode avançar
  em paralelo ao módulo Backend correspondente, **desde que o contrato de API
  esteja publicado antes** (diretriz 4.1) — o Frontend não precisa esperar o
  Backend terminar a implementação, só o contrato estar definido.
- BE-32 a BE-34 (Branding/ADR-011) têm baixo acoplamento com o resto do backlog e
  podem ser feitas a qualquer momento a partir da Fase 0/1, em paralelo a
  qualquer outra frente — bom candidato a preencher ociosidade pontual de um
  desenvolvedor backend.
- BE-36/BE-37 (Notificação/Ajuda) e FE-20 (Ajuda/Suporte) têm o mesmo perfil —
  baixo acoplamento, boas tarefas de preenchimento (*filler*) quando uma frente
  principal está bloqueada por dependência externa (ex.: aguardando SPK-01/P1).
- FE-21 (passe de acessibilidade) é transversal por natureza — recomenda-se rodar
  **continuamente** (checklist a cada tela concluída), não só como uma tarefa
  concentrada no fim, ainda que o esforço formal esteja alocado na Fase 4 como
  checkpoint final.

---

## 5. Riscos de Prazo Sinalizados (insumo para o Gate 3 do CTO)

> Este Tech Lead não força o volume decomposto a caber artificialmente na
> extremidade otimista da Premissa P3 (`PRD.md` §1.4, 16-20 semanas). Os riscos
> abaixo são quantitativos onde possível, com recomendação explícita — cabe ao
> Gate 3 decidir prazo/composição de squad final, não a este documento.

| # | Risco | Severidade | Evidência quantitativa | Recomendação |
|---|---|---|---|---|
| R1 | **Capacidade de Frontend é a maior variável não resolvida.** A hipótese de squad do `PRD.md` é "1-2 frontend" — um swing de ~80-100 dp de capacidade. O esforço estimado de Frontend (~101 dp com buffer) **excede** a capacidade de 1 dev em 16 semanas (80 dp) em ~26%, mas cabe com folga em 2 devs ou em 20 semanas com 1 dev | **Alta** | 101 dp necessários vs. 80-200 dp de capacidade, dependendo de 1 ou 2 devs | Confirmar no Gate 3 se o squad real terá 1 ou 2 desenvolvedores Frontend — decisão de composição de squad, não de escopo |
| R2 | **Esforço de Backend (~175 dp com buffer) está no limite superior da capacidade de 2 devs em 16 semanas (160 dp)**, sem folga para os riscos R3-R6 abaixo | **Alta** | 175 dp necessários vs. 160-200 dp de capacidade | Tratar 16 semanas como piso otimista, não meta realista; 18-20 semanas é o cenário mais compatível com o volume decomposto |
| R3 | **Squad sem especialização declarada em HL7/FHIR/DICOM** (`CTO-REVIEW.md`, Gate 1) — mesmo com o motor de mercado (ADR-002/003), as tarefas BE-06, BE-07, BE-22, BE-24 carregam incerteza acima da média do backlog; são as únicas 4 tarefas marcadas `[pós-spike]` com maior volume de dp (25 dp somados). O mecanismo de resolução de `tenant_id` do Imaging Gateway (antigo SPK-07) já foi resolvido pelo Software Architect via **ADR-012**, o que reduz um eixo de incerteza real de BE-07/BE-22 — mas o gap de especialização em HL7/FHIR (SPK-01/02) e em pipeline DICOM em si (SPK-03) permanece aberto e não é eliminado por essa resolução | **Alta** (reduzida de "Alta com incerteza total" para "Alta com um eixo já mitigado") | 4 tarefas, 25 dp, todas pós-spike | Rodar SPK-01/02/03 nas primeiras 2 semanas sem exceção antes de comprometer prazo dessas 4 tarefas publicamente com o hospital piloto; BE-38 (nova, ADR-012) não entra nesta lista — sua estimativa (4 dp) já é firme, não pós-spike, por decorrer de decisão arquitetural formalizada, não de investigação em aberto |
| R4 | **Protocolo real do hospital piloto (Premissa P1) segue não confirmado.** BE-06/BE-24 usam premissa de trabalho (HL7 v2.x/FHIR R4); se o protocolo real divergir, reestimativa é praticamente certa, não hipotética | **Média-Alta** | Já reconhecido como risco residual pelo próprio ADR-002 (`CTO-REVIEW.md`, Gate 2, item R5) | Revisitar BE-06/BE-24 formalmente assim que P1 for resolvida, antes de configurar o canal real com o hospital — não esperar um bug em produção para descobrir a divergência |
| R5 | **QA com 1 pessoa para um escopo de 23 RFs + 35 telas + teste obrigatório de vazamento cruzado + `accessibility-review` formal em todas as telas + validação de fluxo de consentimento LGPD.** O volume de teste necessário é desproporcional a 1 QA mesmo em 20 semanas — agravado porque a execução de teste consistente só é possível depois que Backend e Frontend integrarem, comprimindo a janela real de execução de QA para menos que o cronograma total. O escopo de teste também cresceu ligeiramente com BE-38 (novo caminho de exceção — AET desconhecido — a validar) | **Alta** | Estimativa qualitativa: volume de teste da ordem de 25-35% do esforço combinado de dev (~240 dp × 0,3 ≈ 72 dp), concentrado nas últimas 6-8 semanas do cronograma se seguir o sequenciamento da Seção 4 | Avaliar reforço de QA (2ª pessoa, mesmo que parcial) ou apoio adicional de DevSecOps em automação de teste, além do "suporte parcial" hoje hipotetizado pela Premissa P3 — sinalizar explicitamente ao Gate 3, não assumir que "1 QA" absorve esse volume |
| R6 | **Infraestrutura com estado (Postgres, Redis, Orthanc, motor de integração) consome ~43 dp só de fundação** (Seção 3.1) — quase 28% da capacidade de 1 dos 2 backend devs em 16 semanas, antes de qualquer feature de negócio começar. Depende de quanto suporte real o DevOps ("suporte parcial") vai prover; se mínimo, essa carga recai inteiramente sobre os 2 backend devs, piorando R2 | **Alta** | 43 dp de 152 dp do backlog Backend (~28%) | Confirmar no Gate 3 o nível real de suporte de DevOps disponível durante a Fase 0/1 — se "suporte parcial" significar quase nada, o prazo de Backend precisa de ajuste explícito, não implícito |
| R7 | RNF-04 (retenção do log de auditoria) e o job de purga permanecem bloqueados por definição jurídica pendente (`CTO-REVIEW.md`, Gate 2) — nenhuma tarefa de purga foi incluída neste `TASK.md` por desenho, conforme diretriz explícita do CTO | **Baixa (agora) / Média (ao confirmar prazo legal)** | `CTO-REVIEW.md`, Gate 2, "nenhum job de purga deve ser implementado antes da confirmação formal" | Nenhuma ação deste Tech Lead — revisitar `TASK.md` quando a definição legal chegar (fora do controle deste documento) |

### Veredito preliminar de capacidade

**O volume decomposto não cabe com folga na extremidade otimista da Premissa P3
(16 semanas, 1 frontend, 1 QA sem reforço).** Cabe de forma mais realista em
**18-20 semanas com 2 backend + 2 frontend**, e mesmo nesse cenário o QA (R5) e a
incerteza de interoperabilidade em saúde (R3/R4) permanecem como risco residual
elevado, não eliminado só por mais tempo de calendário. Esta é uma sinalização
quantitativa para o Gate 3 decidir — não uma reprovação preventiva deste próprio
documento, nem uma tentativa de forçar o escopo a caber artificialmente no prazo
hipotético original.

---

## 6. Lacunas Sinalizadas ao Software Architect

> Nenhuma lacuna estrutural foi decidida em silêncio por este Tech Lead — a
> única lacuna estrutural encontrada durante a decomposição (duas frentes da
> mesma origem, Imaging Gateway) foi escalada formalmente ao Software Architect
> via `BLOCKERS.md`, conforme guardrail deste agente, e **já foi resolvida**
> antes desta submissão ao Gate 3. Registro completo abaixo, mantido para
> rastreabilidade — não é lacuna aberta.

### Lacuna A + Lacuna B — Rastreabilidade DICOM em `EXAM_FILE` e resolução de `tenant_id` no Imaging Gateway — **Resolvidas, 2026-09-02**

**Descrição original** (registrada em `BLOCKERS.md`, Bloqueio 002, ao decompor
BE-07/BE-22 pela primeira vez):

1. **Lacuna A**: `EXAM_FILE` (`SDD.md` §5) armazenava apenas
   `object_storage_key`/`tipo_arquivo`, sem campo que correlacionasse o arquivo
   convertido ao `StudyInstanceUID`/`SeriesInstanceUID`/`SOPInstanceUID` do
   DICOM original no Orthanc — necessário para o "monitoramento dedicado por
   exame" já exigido por RF-07/`SDD.md` §6.1, e para RF-S02 (Release 2)
   reaproveitar o DICOM original "sem retrabalho" (ADR-003).
2. **Lacuna B**: `INTEGRATION_ENDPOINT_CONFIG` modelava apenas
   `canal_integration_gateway` (HL7/FHIR), sem equivalente para o lado DICOM. O
   Orthanc é agnóstico de tenant por natureza; o diagrama de sequência do
   `SDD.md` §2.2 não explicitava como `tenant_id` chegava ao ponto de
   notificação do Imaging Gateway — risco real de atribuição implícita/
   hardcoded, que a regra de multi-tenancy deste `TASK.md` (Seção 1.3) proíbe.

**Resolução (Software Architect, `ADR-012`, 2026-09-02)** — `BLOCKERS.md`
Bloqueio 002 marcado `Resolvido`:

- `EXAM_FILE` ganhou `dicom_study_instance_uid`, `dicom_series_instance_uid`,
  `dicom_sop_instance_uid` (nullable, UIDs padrão do protocolo DICOM, não ID
  proprietário do Orthanc — escolha que sobrevive a eventual troca futura de
  gateway).
- `INTEGRATION_ENDPOINT_CONFIG` ganhou `dicom_remote_ae_title` (AE Title de
  origem do PACS de cada hospital), equivalente a `canal_integration_gateway`
  para o lado DICOM.
- O Orthanc **não** ganhou nenhum conceito de tenant — continua produto de
  mercado genérico (ADR-003 preservado, sem plugin/customização). A
  **Aplicação Core** resolve `tenant_id`, casando o `RemoteAET` (metadado
  nativo que o Orthanc já registra em toda associação DICOM recebida) contra
  `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, explicitado no diagrama
  de sequência atualizado (`SDD.md` §2.2) — nenhum ponto implícito remanescente.
- `SDD.md` §6.1 e §7.1 atualizados para refletir a correlação/mecanismo.

**Impacto neste `TASK.md`** (ver Seções 2, 3.1, 3.4, 4, 5 para o detalhe
completo de cada ajuste):

- A decisão provisória anterior (campo ad hoc + configuração estática de
  "tenant único ativo" em BE-07/BE-09) fica **superada** e foi removida —
  substituída pelo modelo definitivo de ADR-012.
- SPK-07 (spike que investigaria esse mecanismo) foi encerrado sem precisar
  ser executado como investigação interna do Backend — a decisão arquitetural
  chegou primeiro, via resolução formal do Software Architect.
- BE-07 reestimado de 8 dp para 7 dp (incerteza reduzida pela decisão
  formalizada, ainda que a notificação agora carregue mais metadado).
- BE-22 reestimado de 5 dp para 4 dp (deixa de carregar a lógica de workaround
  de tenant, que passa a ser responsabilidade de uma tarefa dedicada).
- Nova tarefa **BE-38** criada (4 dp, Seção 3.4) para a lógica de resolução de
  `tenant_id` via `RemoteAET` e persistência dos UIDs DICOM em `EXAM_FILE`,
  incluindo o caminho de exceção (`RemoteAET` desconhecido → fila de exceção
  de BE-25, nunca atribuição best-effort) exigido pelo próprio ADR-012.
- `BE-02` (schema base) atualizado para incluir os novos campos de ADR-012
  desde a primeira migration.

**Nenhuma nova lacuna estrutural foi identificada nesta revisão.** Se a
decomposição de tarefas revelar outra lacuna do `SDD.md` no futuro (ex.: ao
detalhar a Fase 2/3 de implementação), o mesmo processo de `BLOCKERS.md` §4 se
aplica.

---

## Checklist de Critérios de Pronto (Tech Lead)

- [x] Toda tarefa tem dono/time responsável (Backend ou Frontend) — Seção 3
      (inclui BE-38, adicionada nesta revisão)
- [x] Toda tarefa tem critério de aceite testável — Seção 3
- [x] Toda tarefa não-spike tem estimativa de esforço; toda tarefa de incerteza
      alta está marcada `[pós-spike]`, sem estimativa forçada sem passar por
      spike primeiro (Seção 2 lista os 7 spikes — SPK-07 resolvido via decisão
      arquitetural do Software Architect antes de precisar ser executado —,
      cada um referenciado nas tarefas correspondentes da Seção 3; BE-38 não é
      pós-spike porque decorre de decisão já formalizada em ADR-012, não de
      investigação em aberto)
- [x] Toda dependência entre tarefas está mapeada, com o que pode rodar em
      paralelo explícito (Seção 4.3 e 4.4, incluindo as novas dependências de
      BE-38)
- [x] Toda diretriz de implementação relevante está traduzida em regra prática,
      não só citação do ADR sem tradução (Seção 1, tabelas com "regra prática"
      por decisão — inclui o mecanismo concreto de ADR-012 na Seção 1.3)
- [x] Toda lacuna estrutural encontrada no `SDD.md` está sinalizada na Seção 6,
      nunca decidida em silêncio; a única lacuna estrutural encontrada
      (Lacunas A e B, mesma origem) foi escalada formalmente via `BLOCKERS.md`
      Bloqueio 002 e **já resolvida** pelo Software Architect via ADR-012
      antes desta submissão — Seção 6 registra a resolução completa para
      rastreabilidade, sem lacuna aberta remanescente; toda lacuna de detalhe
      tem a escolha documentada (Seção 1.7)
- [x] Nenhuma das 6 seções está vazia ou com placeholder
- [x] Rascunho do `GUARDRAILS.md` produzido (`guardrails-drafting`), atualizado
      com a regra concreta derivada de ADR-012 (Seção A.5), e submetido ao CTO
      junto com este `TASK.md` para o Gate 3 — ver `.md/GUARDRAILS.md`

**Veredito do Tech Lead**: `TASK.md` pronto para o Gate 3 do CTO
(`capacity-and-timeline-validation`), nesta versão revisada pós-resolução do
Bloqueio 002. A condição explícita do Gate 2 (teste automatizado de vazamento
cruzado entre tenants) está formalizada como tarefa (BE-04) e como regra em
`GUARDRAILS.md`. A ressalva de dimensionamento de infraestrutura está
formalizada com esforço explícito (Seção 3.1, 43 dp) e risco quantificado
(Seção 5, R6). O volume decomposto **não** foi forçado a caber na extremidade
otimista da Premissa P3 — a Seção 5 registra explicitamente onde e por quê o
encaixe é apertado ou não ocorre (esforço total revisado: ~152 dp Backend / ~88
dp Frontend sem buffer, ~276 dp combinado com buffer), projetando **18-20
semanas com 2 backend + 2 frontend** como cenário realista, não os 16 semanas
otimistas da Premissa P3 original — decisão final cabe ao CTO no Gate 3, não a
este documento. A única lacuna estrutural do `SDD.md` encontrada durante a
decomposição (Bloqueio 002, Imaging Gateway) foi escalada ao Software Architect
e **resolvida via ADR-012** antes desta submissão — BE-07, BE-22 reestimados e
BE-38 adicionada em decorrência, conforme detalhado na Seção 6. Nenhuma nova
lacuna estrutural pendente nesta submissão.
