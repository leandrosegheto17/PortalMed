# LOTE-LOG.md — Portal de Resultados de Exames

**Dono**: Tech Lead
**Convenção**: uma entrada por lote fechado, na ordem em que os lotes fecham
(`EXECUTION-FLOW.md`, revisão de 2026-09-03). Cada entrada registra: as
tarefas do lote, o veredito de QA, o veredito de DevSecOps, o veredito do
Tech Lead (checklist de integridade da decomposição — não revalida
funcionalidade nem segurança), e os débitos herdados com dono/prazo. Uma
entrada "Aprovado"/"Aprovado com ressalvas" libera o lote para o DevOps
prosseguir com o deploy. Este arquivo é sempre acrescentado, nunca reescrito.

---

## Lote 1 — Fundação de Infraestrutura e Design System

**Tarefas** (`TASK.md` §4.1.1): BE-01, BE-02, BE-05, BE-08 (Backend) + FE-01,
FE-02, FE-03, FE-04 (Frontend) — 34 dp, Fase 0.

**Data de aprovação (Tech Lead)**: 2026-09-03

### Veredito de QA

`QA-REPORT.md` Seção 4.8 — **Aprovado com ressalvas** (2026-09-03). Todas as
8 tarefas confirmadas `Concluído` em `TASK.md` por reexecução independente da
suíte (backend: 119/119 unit + 245/245 e2e; frontend: 279/279, 181/181 no
escopo isolado de FE-01 a FE-04). Nenhum bug de severidade Alta/Crítica em
aberto. 9 débitos de severidade Baixa/Média herdados para este lote:
`QA-DEBT-001`, `QA-DEBT-002` (FE-01), `QA-DEBT-003`, `QA-DEBT-004`,
`QA-DEBT-005` (FE-02), `QA-DEBT-006` (BE-02), `QA-DEBT-007` (FE-03),
`QA-DEBT-008`, `QA-DEBT-009` (FE-04), mais `QA-DEBT-016` (BE-08, achado novo
desta rodada de fechamento de lote) — todos com dono e prazo (ver tabela
abaixo), nenhum vencido nesta data.

### Veredito de DevSecOps

`SECURITY-REVIEW.md` "Lote 1" — **Aprovado com débito registrado**
(2026-09-03). Nenhum achado de severidade Alta/Crítica. Nenhum achado de
compliance (LGPD) obrigatório pendente — CPF via `pgcrypto` corretamente
implementado no nível de schema; requisitos de compliance restantes (gestão
de chave de criptografia de coluna em runtime, retenção de log de auditoria)
são requisitos antecipados para tarefas futuras, não lacunas deste lote. 4
débitos novos/reclassificados: `SEC-DEBT-001`, `SEC-DEBT-002` (novos),
`QA-DEBT-006` e `QA-DEBT-016` (herdados de QA, reclassificação/confirmação
de severidade concordante).

### Veredito do Tech Lead — Checklist de Integridade da Decomposição

| Item | Resultado |
|---|---|
| Todas as tarefas do lote `Concluída` no `TASK.md`, nenhuma presa em mock-aware/parcial sem justificativa registrada | **Confirmado.** BE-01, BE-02, BE-05, BE-08, FE-01, FE-02, FE-03, FE-04 — todas `Concluído` (`TASK.md` §3.1/§3.10). O único caso de dado consumido via mock (FE-01, `BRANDING_CONFIG` local) está explicitamente justificado na própria célula de status e na Seção 4.4/4.6 do `QA-REPORT.md` (BE-32 é Lote 9, sem dependência cruzada com este lote por desenho original do `TASK.md`) — não é uma pendência disfarçada de conclusão. |
| QA aprovou o lote (Aprovado ou Aprovado com ressalvas); todo débito registrado tem dono e prazo | **Confirmado.** Veredito "Aprovado com ressalvas". Os 9 débitos herdados (ver tabela abaixo) têm dono identificável (Frontend, Backend, Tech Lead ou combinação, conforme a célula "Prazo/Ação" de cada um em `QA-REPORT.md` §2) e prazo atrelado a uma tarefa/marco futuro específico — nenhum genérico ou em aberto. |
| DevSecOps aprovou (Aprovado ou Aprovado com débito registrado); nenhum achado crítico em aberto | **Confirmado.** Veredito "Aprovado com débito registrado". `SEC-DEBT-001` (dono DevSecOps, prazo: antes do fechamento do próximo lote) e `SEC-DEBT-002` (dono DevOps + DevSecOps, prazo: antes do primeiro deploy real em staging) têm dono e prazo explícitos. Nenhum achado Alta/Crítica. |
| Esforço real do lote não invalida a Seção 5 (Riscos de Prazo) sem atualização | **Não invalida — nenhuma atualização necessária nesta rodada.** BE-05 (3 dp estimados, 1 rodada de fix-loop de qualidade/spec-compliance no mesmo dia) e BE-08 (3 dp estimados, 2 rodadas de fix-loop de segurança/spec-compliance, teto de tentativas atingido) fecharam dentro da estimativa em dp — não há sinal de estouro de esforço que altere quantitativamente R2 ("Backend no limite superior de capacidade") ou R6 ("infraestrutura com estado consome ~28% da capacidade de 1 dev") além do que já estava sinalizado no `TASK.md` original. **Observação registrada para acompanhamento** (não é um risco novo, é um dado a monitorar nos próximos lotes de infraestrutura/segurança): BE-08 esgotou as 2 tentativas de fix-loop permitidas — ambas por achados de segurança reais (region override silencioso; `REDIS_TLS` com fallback permissivo), não por retrabalho de escopo. Isso é consistente com R3 (squad sem especialização declarada em integração/segurança de dados de saúde) e reforça a recomendação já existente de não tratar 16 semanas como meta realista (R2) — mas, com uma amostra de 2 tarefas de infraestrutura, ainda é cedo para reabrir R2/R3/R6 com novo número. Se o padrão se repetir no fechamento do Lote 2 (BE-06/07/09, também pós-spike e também sensíveis a segurança/integração), este Tech Lead reavalia R3/R6 com número atualizado. |
| Nenhuma dependência do próximo lote comprometida por decisão tomada durante a implementação deste lote | **Confirmado, sem comprometimento.** Verificação dirigida às duas abstrações novas deste lote com consumidor futuro fora do lote: (1) `QueueRegistryService.getQueue(name: string): Queue` e `buildSessionRedisKey(keyPrefix, { tenantId, sessionId })` (BE-05) — assinaturas genéricas, sem acoplamento a lógica de negócio, diretamente consumíveis por BE-07 (fila de conversão de imagem, Lote 2), BE-14 (sessão, Lote 4) e BE-24 (fila de ingestão, Lote 5) sem refatoração, conforme já verificado por inspeção de contrato tanto pelo Backend quanto de forma independente por QA (`QA-REPORT.md` §4.4/4.7); (2) `ObjectStorageService.getReadSignedUrl(key, expirySecondsOverride?)` e `putObject(key, body, contentType?)` (BE-08) — mesma característica, consumíveis por BE-07/BE-21/BE-22/BE-23 (Lotes 2 e 5) sem mudança de assinatura esperada. Nenhuma das duas abstrações reserva convenção de nome/negócio que amarraria a implementação futura a uma decisão não documentada. `SEC-DEBT-002` (descompasso de wiring de secrets entre Terraform e variáveis de ambiente planas) é um requisito operacional de deploy, não uma dependência de contrato entre lotes — não bloqueia o Lote 2/Lote 3 nem exige mudança em `TASK.md` §4.1.2. |

**Veredito final do Tech Lead: Aprovado com ressalvas.**

### Débitos herdados (dono/prazo)

| ID | Origem | Severidade | Dono | Prazo |
|---|---|---|---|---|
| QA-DEBT-001 | QA | Baixa | Frontend | Próximo PR que tocar `brandingApi.ts`; no mais tardar na troca pelo endpoint real de BE-32 |
| QA-DEBT-002 | QA | — (revalidação agendada) | QA (revalida) / Frontend (troca) | Assim que BE-32 publicar o endpoint e Frontend trocar `brandingApi.ts` |
| QA-DEBT-003 | QA | Baixa | Tech Lead (avalia item de integração) + UX-UI/BA (corrige `UX-SPEC.md` §3.1) | Antes do início da implementação do app shell autenticado |
| QA-DEBT-004 | QA | Baixa | Frontend | Primeira tarefa que integrar `MessageBanner` com copy real (ex. FE-08, FE-11) |
| QA-DEBT-005 | QA | Baixa | Frontend | Primeira tarefa que usar `isConfirming={true}` em produção (ex. TL-27, TL-32) |
| QA-DEBT-006 | QA | Média | Tech Lead (formaliza redação de `TASK.md`/`GUARDRAILS.md` A.5) | Antes de BE-38 (Lote 5) |
| QA-DEBT-007 | QA | Baixa | Tech Lead (consolida valor único de política de senha) + Backend (aplica em BE-18) | Antes de Backend implementar validação server-side equivalente (BE-18) e antes de FE-11 reutilizar o componente |
| QA-DEBT-008 | QA | Baixa | Frontend | Se/quando o projeto adotar SSR/SSG (nenhuma tarefa prevista hoje) |
| QA-DEBT-009 | QA | Baixa | Frontend | Primeira tela que consumir `ResponsiveDataList` com elementos focáveis (a partir de FE-12, Lote 5) |
| QA-DEBT-016 | QA (achado no fechamento do lote) / DevSecOps (confirma severidade) | Baixa | DevSecOps + Backend | Antes do primeiro deploy em `staging` com tráfego real de laudo/imagem (a partir do fechamento do Lote 5) |
| SEC-DEBT-001 | DevSecOps | Baixa | DevSecOps | Antes do fechamento do próximo lote |
| SEC-DEBT-002 | DevSecOps | Média | DevOps (implementa) + DevSecOps (acompanha) | Antes do primeiro deploy real em `staging` |

### Observação registrada (não é achado deste lote — contexto para o próximo lote a processar)

BE-03/BE-04 (Lote 3) têm histórico de execução anterior à convenção de lote
(BE-04 `Concluído` e aprovado sem ressalvas por QA; BE-03 `Em andamento`,
aguardando revalidação de QA sobre a correção de `QA-BUG-002`, rodada 3 já
concluída conforme `QA-REPORT.md` Seção 1.6.2, mas o fechamento formal do
Lote 3 pela convenção de lote ainda não ocorreu). Isso não é uma pendência de
integridade do Lote 1 — é o próximo lote a ser processado por este fluxo,
registrado aqui apenas para rastreabilidade.

### Liberação

Lote 1 liberado para deploy do ponto de vista de integridade de decomposição
(Tech Lead), somado às aprovações já registradas de QA e DevSecOps. Lote 2
(Integração com Sistemas do Hospital) e Lote 3 (Segurança de Multi-tenancy),
ambos dependentes só do Lote 1 (`TASK.md` §4.1.2), seguem sem bloqueio
originado nesta aprovação.

### Execução de Deploy (DevOps) — 2026-09-03

Dupla aprovação (QA + DevSecOps) e integridade de decomposição (Tech Lead)
confirmadas acima liberaram `deployment-execution` para o Lote 1. Resultado,
detalhado em `DEPLOY.md` Seção 8:

1. **`SEC-DEBT-002` resolvido em código** — prazo era "antes do primeiro
   deploy real em staging", cumprido nesta rodada. `infra/modules/secrets/`
   passou a expor `APP_DATABASE_URL` (connection string dedicada, role de
   runtime `portalmed_app`, nunca a role master) e `REDIS_HOST`/
   `REDIS_PASSWORD` (chave individual extraída do secret JSON via sintaxe
   nativa do ECS) em vez do blob JSON único que não batia com o que
   `redis-config.ts`/`DatabaseModule` esperam. Nenhum segredo em texto plano
   foi introduzido no repositório.
2. **Deploy real em staging bloqueado por limitação de ambiente de
   execução** — verificação genuína (não presumida) confirmou ausência de
   credencial/conta AWS e do binário `terraform` neste ambiente de
   execução. `infra/bootstrap/` nunca foi aplicado, nenhuma role IAM de
   OIDC existe, nenhum recurso AWS foi criado, nenhum drill de rollback foi
   exercitado. **Este bloqueio não é um achado de segurança, não é uma
   reprovação de QA e não é tratado como pausa obrigatória aguardando o
   CTO** — é uma limitação de ambiente de execução, registrada com
   honestidade, sem nenhum output de `terraform apply`/smoke test simulado.
3. Nenhuma limitação de infraestrutura/arquitetura foi sinalizada ao
   Software Architect nesta rodada — a limitação encontrada é de acesso a
   conta cloud deste ambiente de execução, não de dimensionamento ou
   paridade de serviço da AWS `sa-east-1` já decidida em `DEPLOY.md` §2.

**Estado do critério "deploy concluído com sucesso" (DoD de
`deployment-execution`) para o Lote 1**: não atingido nesta rodada — build
não está em produção nem em staging real, rollback não foi testado contra
infraestrutura real, observabilidade não está ativa com tráfego real. Fica
como pendência explícita, condicionada à disponibilidade de uma conta AWS
real em uma futura execução deste fluxo — não como um deploy considerado
concluído por presunção.

---

## Lote 3 — Segurança de Multi-tenancy (Guard de Aplicação + RLS + Teste de Vazamento)

**Tarefas** (`TASK.md` §4.1.1): BE-03, BE-04 (Backend) — 10 dp, Fase 1.

**Data de aprovação (Tech Lead)**: 2026-09-04

### Veredito de QA

`QA-REPORT.md` Seção 5.6 — **Aprovado** (2026-09-03). BE-03 e BE-04
confirmadas `Concluído` em `TASK.md`. Os dois únicos bugs de severidade Alta
encontrados neste lote (`QA-BUG-001` e `QA-BUG-002`, ambos em BE-03 — dois
vetores distintos de bypass do guard de aplicação de `tenant_id`) foram
corrigidos e revalidados empiricamente em rodadas sucessivas (`QA-REPORT.md`
Seções 1.6.1/1.6.2), sem regressão. `QA-DEBT-012` (vetor residual de
deep-import de `KYSELY_CONNECTION`, contido por lint + teste de regressão
permanente) está fechado — nenhum débito de severidade Baixa/Média aberto
herdado deste lote. Teste de integração cruzada entre BE-03 e BE-04
(BE-04 exercita estruturalmente a implementação de BE-03) confirmado
passando. Condição não negociável do Gate 2 do CTO (BE-04, suíte de
vazamento cruzado bloqueante no CI) confirmada estruturalmente cumprida, não
apenas declarada.

### Veredito de DevSecOps

`SECURITY-REVIEW.md` "Lote 3" — **Aprovado**, após uma iteração de bloqueio.
Veredito inicial (Seção 8, 2026-09-03): **Reprovado**, por 1 achado de
severidade Alta (`SEC-BUG-001`) — a migration `1788336900000_create-app-
database-role.ts` concedia à role de runtime `portalmed_app` privilégio de
`UPDATE`/`DELETE` também em `audit_events`/`consent_records`, violando
`GUARDRAILS.md` D.18/F.28 (ADR-009, fundamento LGPD RN-08/RN-02), sem camada
compensatória ativa e sem processo de exceção seguido (`GUARDRAILS.md`
regras 37-39) — registrado como Bloqueio 004 em `BLOCKERS.md`. O Backend
corrigiu na mesma migration (nunca aplicada a nenhum ambiente real,
confirmado via `git log`/`DEPLOY.md`), particionando `DOMAIN_TABLES` em
`FULL_PRIVILEGE_DOMAIN_TABLES` (11 tabelas, inalterado) e
`APPEND_ONLY_TABLES` (`audit_events`/`consent_records`, só `SELECT`/
`INSERT`), com teste de regressão permanente e ajuste espelhado na suíte
exaustiva de BE-04. DevSecOps revalidou de forma independente (Seção 9,
2026-09-04): leitura de código linha a linha da migration corrigida, da
documentação e dos dois arquivos de teste, mais reexecução própria (não só
o relato do Backend) de `tenant-guard-and-rls.e2e-spec.ts` (48/48),
`test:tenant-isolation` (158/158) e da suíte e2e completa (268/268) — nenhum
privilégio residual, nenhuma regressão nas 11 tabelas restantes. Nenhum
débito novo de severidade Baixa/Média registrado nesta revalidação.
`BLOCKERS.md` Bloqueio 004 fechado como **Resolvido** pelo próprio
DevSecOps em 2026-09-04.

### Veredito do Tech Lead — Checklist de Integridade da Decomposição

| Item | Resultado |
|---|---|
| Todas as tarefas do lote `Concluída` no `TASK.md`, nenhuma presa em mock-aware/parcial sem justificativa registrada | **Confirmado.** BE-03 e BE-04 — ambas `Concluído` (`TASK.md` §3.3). A célula de status de BE-03 registra o histórico completo de 2 reversões para `Em andamento` (por `QA-BUG-001` e `QA-BUG-002`) e uma correção pontual pós-`Concluído` (`SEC-BUG-001`), cada uma com a correção, o teste de regressão e a reexecução de suíte documentados — não é uma pendência disfarçada de conclusão, é o registro transparente do fix-loop já fechado e revalidado tanto por QA quanto por DevSecOps. Nenhuma das duas tarefas tem escopo parcial ou dependência mockada. |
| QA aprovou o lote (Aprovado ou Aprovado com ressalvas); todo débito registrado tem dono e prazo | **Confirmado.** Veredito "Aprovado" (sem ressalvas). Nenhum débito de severidade Baixa/Média aberto herdado deste lote — `QA-DEBT-012` já fechado com cobertura de regressão permanente antes deste fechamento formal. |
| DevSecOps aprovou (Aprovado ou Aprovado com débito registrado); nenhum achado crítico em aberto | **Confirmado.** Veredito final "Aprovado", após correção e revalidação independente de `SEC-BUG-001` (único achado Alta, hoje fechado). Nenhum achado Alta/Crítica em aberto. Nenhum débito novo registrado. |
| Esforço real do lote não invalida a Seção 5 (Riscos de Prazo) sem atualização | **Não invalida quantitativamente — nenhuma atualização numérica necessária nesta rodada, mas um segundo ponto de dado é registrado para acompanhamento.** BE-03 (5 dp pós-spike) e BE-04 (5 dp pós-spike) somam os 10 dp já previstos para este lote na Seção 4.1.1 — nenhum estouro de dp declarado. Dito isso, BE-03 consumiu 3 rodadas de correção de severidade Alta (2 de QA — dois vetores distintos de bypass do guard — mais 1 de DevSecOps, `SEC-BUG-001`), mesmo tendo passado por spike dedicado (SPK-04) antes da estimativa. Isso é o **segundo** caso deste tipo desde o fechamento do Lote 1 (o primeiro foi BE-08, que esgotou o teto de 2 tentativas de fix-loop por achados de segurança reais). Diferente de BE-08, este não é sobre o gap de especialização em HL7/FHIR/DICOM nomeado em R3 — é sobre a superfície de maior severidade do próprio projeto (isolamento multi-tenant/imutabilidade de auditoria e consentimento, `GUARDRAILS.md` Seção A/D/F). Não altero R2/R3/R6 com número novo nesta rodada (R3 é especificamente sobre interoperabilidade, ainda não testado pelo fechamento do Lote 2) — mas registro que dois lotes consecutivos de fundação/segurança já geraram fix-loop por achado real de severidade Alta, o que reforça a leitura qualitativa de R5 (volume de teste desproporcional a 1 QA, agora medido em rodadas concretas, não só hipotético) e mantém a recomendação já existente de não tratar 16 semanas como meta realista. Quando o Lote 2 (BE-06/07/09) fechar, este Tech Lead consolida os três pontos de dado (BE-08, BE-03, e o resultado do Lote 2) para decidir se R2/R3/R6 precisam de número atualizado. |
| Nenhuma dependência do próximo lote comprometida por decisão tomada durante a implementação deste lote | **Confirmado, sem comprometimento — com uma observação de decomposição para os consumidores diretos.** A correção de `SEC-BUG-001` (privilégio de `UPDATE`/`DELETE` restrito em `audit_events`/`consent_records` no nível de banco) **antecipa**, em vez de contradizer, parte do critério de aceite já escrito para BE-29 (Lote 6: "Role de aplicação sem `GRANT UPDATE/DELETE` na tabela [`AUDIT_EVENT`]") — quando BE-29 for implementada, essa parte específica do critério já estará satisfeita pela migration deste lote; Backend não deve reimplementar a restrição de privilégio, só verificá-la e focar o esforço de BE-29 no hash chain (SPK-05) e no bloqueio de rota administrativa de edição/exclusão. O mesmo vale para o lado `consent_records`, relevante para BE-19 (Lote 4), cujo critério de aceite (imutabilidade do registro de consentimento) também já é parcialmente reforçado no nível de banco. Nenhuma suposição incompatível foi introduzida — a correção é estritamente mais restritiva (menos privilégio), nunca menos. Verificado também que o padrão de registro de repositório de domínio (`provideTenantScopedRepository`, `TenantScopedRepository`, `DOMAIN_TABLES`/`FULL_PRIVILEGE_DOMAIN_TABLES`/`APPEND_ONLY_TABLES`) permanece a única via sancionada para módulos de domínio (BE-10+), sem mudança de assinatura que afete os Lotes 4, 5, 6, 7 e 8, todos dependentes deste lote (`TASK.md` §4.1.2). Nota de discrepância registrada pelo próprio DevSecOps (Seção 9 de `SECURITY-REVIEW.md`: 268 testes e2e reexecutados de forma independente vs. 264 relatados pelo Backend) foi avaliada como não-material pelo próprio DevSecOps (suíte inteira verde, nenhuma falha) — não é uma pendência de integridade de decomposição, e este Tech Lead concorda com essa leitura; não gera ação adicional. |

**Veredito final do Tech Lead: Aprovado.**

### Débitos herdados (dono/prazo)

Nenhum débito novo de severidade Baixa/Média foi herdado especificamente por
este lote — QA e DevSecOps confirmaram, de forma independente, que os
débitos abertos por este lote (`QA-DEBT-012`) já estavam fechados antes
deste fechamento formal, e nenhum achado adicional gerou débito (só o
achado bloqueante `SEC-BUG-001`, já corrigido e fechado, não um débito
residual). Os débitos ainda em aberto do Lote 1 (tabela na entrada acima)
não pertencem a este lote e continuam sob seus próprios donos/prazos.

### Observação registrada (contexto para os próximos lotes a processar)

1. **BE-29 e BE-19 herdam parte de seu critério de aceite já satisfeita.**
   Ver checklist acima — quando este Tech Lead (ou o Backend) revisitar
   BE-29 (Lote 6) e BE-19 (Lote 4), a restrição de privilégio de banco em
   `audit_events`/`consent_records` já estará em vigor desde este lote; não
   é retrabalho pendente, é uma verificação a não pular.
2. **Padrão de fix-loop em tarefas de fundação/segurança, segundo ponto de
   dado.** Registrado para consolidação quando o Lote 2 fechar (ver célula
   de esforço/Seção 5 no checklist acima) — não é uma reabertura de R2/R3/R6
   nesta rodada, é rastreabilidade explícita do sinal.
3. Resolve a "Observação registrada" da entrada do Lote 1 acima, que
   apontava BE-03/BE-04 como pendentes do fechamento formal pela convenção
   de lote — este fechamento a encerra.

### Liberação

Lote 3 liberado para deploy do ponto de vista de integridade de decomposição
(Tech Lead), somado às aprovações já registradas de QA e DevSecOps. Os
Lotes 4, 6, 7 e 8, todos dependentes do Lote 3 (`TASK.md` §4.1.2, regra
geral de acesso a dado de domínio via BE-03/BE-04), seguem sem bloqueio
originado nesta aprovação — permanecem sujeitos às demais dependências
próprias de cada um (Lote 2 para o Lote 4; Lote 3+Lote 4 para o Lote 6;
etc.), não avaliadas nesta entrada.

### Execução de Deploy (DevOps) — 2026-09-04

Dupla aprovação (QA + DevSecOps) e integridade de decomposição (Tech Lead)
confirmadas acima liberaram `deployment-execution` para o Lote 3. Resultado,
detalhado em `DEPLOY.md` Seção 8 ("Detalhamento da tentativa de 2026-09-04
(Lote 3)"):

1. **Nenhuma correção de código era pré-requisito desta tentativa** —
   diferente do Lote 1 (`SEC-DEBT-002`), o único achado bloqueante deste
   lote (`SEC-BUG-001`) já havia sido corrigido e fechado pelo próprio
   DevSecOps antes deste dispatch de deploy.
2. **Deploy real em staging bloqueado pela mesma limitação de ambiente de
   execução já registrada para o Lote 1** — reverificação genuína (não
   herdada por presunção da tentativa anterior) confirmou, nesta mesma
   sessão de ambiente, ausência de credencial/conta AWS e do binário
   `terraform`. `infra/bootstrap/` continua nunca aplicado, nenhuma role
   IAM de OIDC existe, nenhum recurso AWS foi criado, nenhum drill de
   rollback foi exercitado. **Este bloqueio não é um achado de segurança,
   não é uma reprovação de QA e não é tratado como pausa obrigatória
   aguardando o CTO** — é a mesma limitação de ambiente de execução já
   documentada, sem nenhum output de `terraform apply`/smoke test simulado.
3. Nenhuma limitação de infraestrutura/arquitetura foi sinalizada ao
   Software Architect nesta rodada — a limitação encontrada é de acesso a
   conta cloud deste ambiente de execução, idêntica à do Lote 1, não de
   dimensionamento ou paridade de serviço da AWS `sa-east-1` já decidida em
   `DEPLOY.md` §2.
4. Deploy em produção não foi cogitado — permanece fora de escopo,
   condicionado à pausa obrigatória de validação explícita do usuário
   quando a vez de produção chegar.

**Estado do critério "deploy concluído com sucesso" (DoD de
`deployment-execution`) para o Lote 3**: não atingido nesta rodada — build
não está em produção nem em staging real, rollback não foi testado contra
infraestrutura real, observabilidade não está ativa com tráfego real. Fica
como pendência explícita, condicionada à disponibilidade de uma conta AWS
real em uma futura execução deste fluxo — não como um deploy considerado
concluído por presunção. Idêntico ao estado já registrado para o Lote 1.

---

## Lote 2 — Integração com Sistemas do Hospital (Motor HL7/FHIR e Imaging Gateway)

**Tarefas** (`TASK.md` §4.1.1): BE-06, BE-07, BE-09 (Backend) — 18 dp, Fase 1.
Sem tarefas de Frontend neste lote.

**Data de aprovação (Tech Lead)**: 2026-09-05

### Veredito de QA

`QA-REPORT.md` Seção 6.7 — **Aprovado com ressalvas** (2026-09-04). As 3
tarefas confirmadas `Concluído` em `TASK.md`. Nenhum bug de severidade
Alta/Crítica em aberto — BE-06 e BE-09 aprovados sem ressalvas; BE-07
aprovado com uma ressalva não bloqueante. 1 débito novo de severidade Média
(`QA-DEBT-017`, BE-07 — fila `imaging-conversion` sem `attempts`/`backoff`,
achado por teste adversarial próprio desta validação), dono Backend, prazo
"antes do primeiro deploy em `staging` com tráfego real de imagem" (mesmo
marco de `QA-DEBT-016`, herdado do Lote 1). Nenhuma tarefa revertida de
`Concluída` para `Em andamento`. Testes de integração cruzada dentro do
lote (BE-07↔BE-08, BE-09↔BE-06/BE-07) confirmados passando. Um achado
ancilar de excesso de privilégio IAM (fora das 3 tarefas do lote,
Terraform pré-existente) sinalizado para a auditoria do DevSecOps, sem
impacto neste veredito. Nenhum padrão recorrente de decomposição
identificado — nenhum escalonamento ao Tech Lead via `BLOCKERS.md`.

### Veredito de DevSecOps

`SECURITY-REVIEW.md` "Lote 2" — **Aprovado com débito registrado**
(2026-09-05), após uma iteração de bloqueio. Veredito inicial (Seção 8,
2026-09-04): **Reprovado**, por 1 achado de severidade Alta (`SEC-BUG-002`)
— `CoreIngestPlaceholderController.receive` (BE-06) logava o
`CanonicalExamResultMessage` inteiro (`patient.identifier`/`patient.name` +
`exam`/`result`, dado de saúde identificável) em texto claro via
`this.logger.log(...JSON.stringify(body))`, em nível `log`, em todo request
real — violação do princípio de minimização de dado (LGPD Art. 6º, III)
sobre dado sensível de saúde (Art. 11), sem camada compensatória ativa —
registrado como Bloqueio 005 em `BLOCKERS.md`. O Backend corrigiu no mesmo
dia (`CoreIngestPlaceholderController` e, pela mesma causa raiz,
`CoreImagingIngestPlaceholderController` de BE-07, que carregava o mesmo
anti-padrão embora sem PII no payload), trocando o log irrestrito por
metadado técnico não identificável, com teste de regressão novo em ambos
os controllers (espiona `Logger.prototype.log`, request HTTP real). O
DevSecOps revalidou de forma independente (Seção 9 de `SECURITY-REVIEW.md`
"Lote 2", 2026-09-05): leitura de código linha a linha dos dois
controllers corrigidos, grep por `JSON.stringify` remanescente em todo
`backend/src/` (nenhuma ocorrência), verificação de que `lastReceivedMessage`
não é exposto por nenhum endpoint HTTP, leitura completa dos 2 testes de
regressão, mais reexecução própria (não só o relato do Backend) da suíte
e2e afetada (25/25 passando, incluindo os 2 blocos `[SEC-BUG-002]`) —
nenhum achado residual. `BLOCKERS.md` Bloqueio 005 fechado como
**Resolvido** pelo próprio DevSecOps em 2026-09-05. 2 débitos de
severidade Média registrados, nenhum bloqueante: `SEC-DEBT-003` (privilégio
IAM excessivo `s3:PutObject` em `imaging_gateway_service`, Terraform
pré-existente e não introduzido por este lote — dono DevOps, prazo "antes
do primeiro deploy real em `staging` com tráfego de DICOM do hospital
piloto") e `QA-DEBT-017` (herdado do QA, classificação de severidade
confirmada pelo DevSecOps).

### Veredito do Tech Lead — Checklist de Integridade da Decomposição

| Item | Resultado |
|---|---|
| Todas as tarefas do lote `Concluída` no `TASK.md`, nenhuma presa em mock-aware/parcial sem justificativa registrada | **Confirmado, com histórico de correção transparente.** BE-06, BE-07 e BE-09 — todas `Concluído` (`TASK.md` §3.1). BE-06 registra 1 correção pós-implementação (`SEC-BUG-002`); BE-07 registra 2 (1 fix-loop de qualidade — duplicação de leitura de config Redis, mesma classe já corrigida em BE-05 — mais `SEC-BUG-002`); BE-09 registra 1 (fix-loop de qualidade — nome de variável de ambiente `SERVICE_API_KEY` corrigido para `INTERNAL_SERVICE_API_KEY`, já provisionado assim pelo Terraform do DevOps desde a fundação de infraestrutura). Todas as correções têm o achado, a correção e a reexecução completa da suíte documentados na própria célula de status — nenhuma é uma pendência disfarçada de conclusão. Nenhuma das 3 tarefas tem escopo parcial ou dependência mockada; os dois placeholders (`CoreIngestPlaceholderController`, `CoreImagingIngestPlaceholderController`) são explicitamente delimitados como escopo futuro de BE-24/BE-38, não uma pendência não sinalizada desta rodada. |
| QA aprovou o lote (Aprovado ou Aprovado com ressalvas); todo débito registrado tem dono e prazo | **Confirmado.** Veredito "Aprovado com ressalvas". `QA-DEBT-017` tem dono explícito (Backend) e prazo atrelado a um marco futuro específico (antes do primeiro deploy em `staging` com tráfego real de imagem) — não genérico, não em aberto. |
| DevSecOps aprovou (Aprovado ou Aprovado com débito registrado); nenhum achado crítico em aberto | **Confirmado, após verificação da revalidação.** Veredito final "Aprovado com débito registrado", alcançado depois de uma reprovação inicial por `SEC-BUG-002` (achado Alta), corrigido pelo Backend e revalidado de forma independente pelo próprio DevSecOps (leitura de código linha a linha dos dois controllers + grep de regressão + reexecução própria de 25/25 testes e2e, não apenas aceitação do relato do Backend) — mesmo padrão de rigor já usado para `SEC-BUG-001`/Bloqueio 004 no Lote 3. Bloqueio 005 confirmado `Resolvido` em `BLOCKERS.md`. Nenhum achado Alta/Crítica em aberto. `SEC-DEBT-003` (dono DevOps) e `QA-DEBT-017` (dono Backend) têm prazo explícito, nenhum genérico. |
| Esforço real do lote não invalida a Seção 5 (Riscos de Prazo) sem atualização | **Não invalida quantitativamente — consolidação qualitativa registrada e promessa de reavaliação encerrada.** BE-06 (8 dp), BE-07 (7 dp) e BE-09 (3 dp) somam exatamente os 18 dp já previstos para este lote — nenhum estouro de dp. Como prometido nas entradas do Lote 1 e do Lote 3 deste `LOTE-LOG.md`, este Tech Lead consolidou agora os três pontos de dado (BE-08/Lote 1, BE-03/Lote 3, BE-06/07/09/Lote 2) em `TASK.md` §5 (nova subseção "Consolidação de dados reais de fix-loop/correção pós-implementação — Lotes 1, 2 e 3", 2026-09-05). **Decisão: R2, R3 e R6 não recebem número atualizado.** Nenhum dos 3 lotes estourou dp apesar de 6 das 8 tarefas de fundação/segurança/integração terem exigido ao menos 1 rodada de correção — o custo do fix-loop já está absorvido no dp estimado (R2/R6 permanecem corretos como estão). R3 (especialização HL7/FHIR/DICOM) permanece "Alta" sem escalar — os achados reais de BE-06/BE-07 (schema de canal da engine, comportamento de `Content-Type` do Orthanc, hang de `Worker.close()`) são exatamente o tipo de incerteza que R3 já nomeava, mas nenhum exigiu esgotar o teto de 2 tentativas de fix-loop (diferente de BE-08, Lote 1) — evidência de que o investimento em SPK-01/02/03 antes de estimar funcionou como pretendido, não motivo para elevar nem reduzir a severidade (a mesma incerteza ainda vale para BE-22/BE-24, não implementadas). Um sinal novo, fora do escopo original de R3, foi registrado (não como alteração de risco de prazo, mas como observação de processo): o mesmo achado de segurança (`SEC-BUG-002`) surgiu de forma independente em dois controllers-placeholder distintos, sem ser capturado nem pelo fix-loop de autorrevisão do Backend nem pela primeira passada de QA — só a auditoria formal do DevSecOps o encontrou; registrado para que o Backend trate "nenhum dado de paciente/clínico em log não-debug" como item explícito de autorrevisão nos próximos placeholders (BE-18, BE-24, BE-38, BE-29). |
| Nenhuma dependência do próximo lote comprometida por decisão tomada durante a implementação deste lote | **Confirmado, sem comprometimento.** A correção de `SEC-BUG-002` (BE-06/BE-07) só altera o conteúdo do log dos dois placeholders — não altera `CanonicalExamResultMessage`/`CanonicalImagingNotificationMessage`, não altera `lastReceivedMessage`/`getLastReceivedMessage()` (ainda disponível só para a suíte de teste, sem endpoint HTTP), e não introduz nenhuma restrição nova de contrato que BE-24 (substitui `CoreIngestPlaceholderController`) ou BE-38 (substitui `CoreImagingIngestPlaceholderController`) precisem contornar — ao contrário, a disciplina de "logar só metadado técnico" fica como precedente direto a seguir quando esses controllers forem reimplementados. A correção de nome de variável em BE-09 (`SERVICE_API_KEY` → `INTERNAL_SERVICE_API_KEY`) elimina, em vez de criar, uma dependência não sinalizada para o DevOps — o Terraform já provisionava o nome correto desde a fundação de infraestrutura; com a correção, BE-09 fecha de ponta a ponta sem pendência de infraestrutura registrada. `SEC-DEBT-003` (IAM excessivo em `imaging_gateway_service`) é um achado sobre Terraform pré-existente, não introduzido por este lote, e não bloqueia nenhuma dependência declarada do Lote 4/Lote 5 na Seção 4.1.2 do `TASK.md`. Verificado também que `QA-DEBT-017` (retry/backoff da fila `imaging-conversion`) não é uma dependência de contrato para BE-38 — QA já recomendou explicitamente que BE-38 "não herde o gap de resiliência... sem, ao menos, uma decisão consciente registrada" (`QA-REPORT.md` Seção 6.7), o que este Tech Lead adota como diretriz a repassar quando BE-38 (Lote 5) for implementada. |

**Veredito final do Tech Lead: Aprovado com ressalvas.**

### Débitos herdados (dono/prazo)

| ID | Origem | Severidade | Dono | Prazo |
|---|---|---|---|---|
| QA-DEBT-017 | QA (achado adversarial próprio desta validação) / DevSecOps (confirma severidade) | Média | Backend | Antes do primeiro deploy em `staging` com tráfego real de imagem (mesmo marco de `QA-DEBT-016`) |
| SEC-DEBT-003 | DevSecOps (achado sobre Terraform pré-existente, sinalizado inicialmente pelo QA) | Média | DevOps | Antes do primeiro deploy real em `staging` com tráfego de DICOM do hospital piloto |

Débitos ainda em aberto de lotes anteriores (Lote 1: `QA-DEBT-001` a
`QA-DEBT-005`, `QA-DEBT-007` a `QA-DEBT-009`, `QA-DEBT-016`, `SEC-DEBT-001`,
`SEC-DEBT-002`; `QA-DEBT-006` já com prazo "antes de BE-38") não pertencem
a este lote e continuam sob seus próprios donos/prazos.

### Observação registrada (contexto para os próximos lotes a processar)

1. **Consolidação de fix-loop encerrada** (ver checklist acima e `TASK.md`
   §5) — as observações abertas nas entradas de Lote 1 e Lote 3 sobre
   reavaliar R2/R3/R6 estão fechadas sem mudança quantitativa.
2. **BE-24 e BE-38 (Lote 5) herdam um precedente de logging a seguir, não
   um débito a resolver**: os dois placeholders que essas tarefas
   substituem já demonstram o padrão correto ("log só metadado técnico,
   nunca dado de paciente/clínico") — verificar que a implementação real
   mantém essa disciplina, não regride para o anti-padrão já corrigido.
3. **BE-38 também herda a recomendação do QA sobre `QA-DEBT-017`**: decidir
   conscientemente (registrar a decisão, não apenas herdar por omissão) se
   o gap de retry/backoff da fila `imaging-conversion` é resolvido antes ou
   junto de BE-38, já que BE-38 é o próximo consumidor direto do fluxo de
   notificação de imagem.

### Liberação

Lote 2 liberado para deploy do ponto de vista de integridade de decomposição
(Tech Lead), somado às aprovações já registradas de QA e DevSecOps. O
Lote 4 (parcialmente, via BE-18 consumindo BE-06) e o Lote 5 (BE-24
consumindo BE-06; BE-38 consumindo BE-07), ambos dependentes deste lote
(`TASK.md` §4.1.2), seguem sem bloqueio originado nesta aprovação —
permanecem sujeitos às demais dependências próprias de cada um, não
avaliadas nesta entrada.

### Execução de Deploy (DevOps) — 2026-09-05

Dupla aprovação (QA + DevSecOps) e integridade de decomposição (Tech Lead)
confirmadas acima liberaram `deployment-execution` para o Lote 2. Resultado,
detalhado em `DEPLOY.md` Seção 8 ("Detalhamento da tentativa de 2026-09-05
(Lote 2)"):

1. **`SEC-DEBT-003` resolvido em código, de forma proativa** — avaliado como
   corrigível sem risco de regressão (a permissão `s3:PutObject` concedida a
   `imaging_gateway_service` nunca é exercitada pelo Orthanc; `task_policy_json`
   é variável opcional do módulo `ecs-service`, com efeito limpo quando
   omitida). `infra/environments/{staging,production}/main.tf` tiveram o
   bloco removido, comentário corrigido. O prazo real do débito ("antes do
   primeiro deploy real com tráfego de DICOM") ainda não havia sido
   atingido — não há deploy real de staging nesta tentativa, logo não há
   tráfego DICOM real possível; a correção foi antecipada, não uma resposta
   a prazo vencido.
2. **`QA-DEBT-017` não é ação deste agente** — prazo é "antes do primeiro
   deploy em staging com tráfego real de imagem", dono Backend; um deploy
   de staging sem tráfego real (esta tentativa, se tivesse sido possível)
   não atinge essa condição — mesma leitura já usada para `QA-DEBT-016` no
   Lote 1.
3. **Deploy real em staging bloqueado pela mesma limitação de ambiente de
   execução já registrada para o Lote 1/Lote 3** — reverificação genuína
   (não herdada por presunção das tentativas anteriores) confirmou, nesta
   mesma sessão de ambiente, ausência de credencial/conta AWS e do binário
   `terraform`. `infra/bootstrap/` continua nunca aplicado, nenhuma role
   IAM de OIDC existe, nenhum recurso AWS foi criado (nem a remoção do
   privilégio IAM do item 1 pôde ser confirmada contra um `plan`/`apply`
   real), nenhum drill de rollback foi exercitado. **Este bloqueio não é um
   achado de segurança, não é uma reprovação de QA e não é tratado como
   pausa obrigatória aguardando o CTO** — é a mesma limitação de ambiente
   de execução já documentada, sem nenhum output de `terraform
   apply`/smoke test simulado.
4. Nenhuma limitação de infraestrutura/arquitetura foi sinalizada ao
   Software Architect nesta rodada — a limitação encontrada é de acesso a
   conta cloud deste ambiente de execução, idêntica à dos lotes anteriores,
   não de dimensionamento ou paridade de serviço da AWS `sa-east-1` já
   decidida em `DEPLOY.md` §2.
5. Deploy em produção não foi cogitado — permanece fora de escopo,
   condicionado à pausa obrigatória de validação explícita do usuário
   quando a vez de produção chegar.

**Estado do critério "deploy concluído com sucesso" (DoD de
`deployment-execution`) para o Lote 2**: não atingido nesta rodada — build
não está em produção nem em staging real, rollback não foi testado contra
infraestrutura real, observabilidade não está ativa com tráfego real. Fica
como pendência explícita, condicionada à disponibilidade de uma conta AWS
real em uma futura execução deste fluxo — não como um deploy considerado
concluído por presunção. Idêntico ao estado já registrado para o Lote 1 e
o Lote 3, com o adicional de que `SEC-DEBT-003` (dono DevOps) já está
resolvido em código, restando apenas confirmar contra infraestrutura real
quando ela existir.
