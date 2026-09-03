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
