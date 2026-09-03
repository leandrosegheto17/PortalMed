# ADR-004: Adotar Multi-Tenancy Lógica (tenant_id + Row-Level Security) desde o MVP, em vez de Single-Tenant com Migração Futura

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (submeter a `architecture-decision-review` do CTO no Gate 2)
- **Tags**: architecture, multi-tenancy, security, gate-2

> **Marcação para o Gate 2**: candidata obrigatória a
> `architecture-decision-review` (e considerar `build-vs-buy-analysis` quanto
> a produto de isolamento gerenciado, se aplicável) — `CTO-REVIEW.md` Gate 1,
> ressalva 4; `PRD.md` Seção 4.2/R4, Premissa P9.

## Contexto e Problema

RNF-11 e RN-09 (`PRD-TECNICO.md`) exigem isolamento de dados entre hospitais
como **resultado de negócio obrigatório**, mesmo que o MVP opere com um único
hospital piloto — nenhum dado (cadastral, exame, auditoria, configuração
visual) de um hospital pode ser acessível a usuário de outro hospital. O
`PRD.md` (Seção 4.2, item 3) explicitamente delega ao Software Architect a
decisão entre nascer multi-tenant-ready desde o MVP vs. single-tenant com
migração futura, registrando que é um trade-off de custo/retrabalho a ser
avaliado formalmente, não decidido por atalho.

## Decision Drivers

- RNF-11/RN-09 já são regra de negócio confirmada, não hipótese — mesmo com 1
  hospital no MVP, a arquitetura de dados precisa sustentar essa garantia.
- Migrar de single-tenant para multi-tenant depois do go-live é uma operação
  de alto risco sobre dado de saúde sensível: exige migração de dados em
  produção, reescrita de toda camada de acesso a dado, e uma janela de risco
  real de vazamento cruzado durante a transição — incompatível com o rigor de
  LGPD já elevado a Must-have (R3).
- O modelo de negócio confirmado é B2B2C white-label multi-hospital (`PRD.md`
  Seção 1.2, `CTO-REVIEW.md` Gate 1) — não é uma hipótese incerta de escala
  futura, é o modelo de negócio validado desde o Gate 1.
- Squad pequena (P3) tem menos capacidade de absorver uma migração de alto
  risco no meio da operação do que o custo incremental de desenhar isolamento
  lógico desde o início.

## Considered Options

- **Single-tenant** (uma instância/base de dados por hospital), com plano de
  migração para multi-tenant quando hospital #2 for confirmado
- **Multi-tenant lógico desde o MVP**: schema único compartilhado, toda tabela
  relevante carrega `tenant_id`, isolamento reforçado por Row-Level Security
  (RLS) no PostgreSQL (ver ADR-006) + guarda de aplicação (todo acesso a dado
  passa por contexto de tenant obrigatório, nunca query sem filtro)
- **Multi-tenant físico** (banco/schema separado por hospital, mesma
  aplicação)

## Decision Outcome

Opção escolhida: **"Multi-tenant lógico desde o MVP (tenant_id + RLS)"**,
porque atende RNF-11/RN-09 como regra de negócio confirmada sem pagar o custo
operacional de gerenciar N bancos físicos separados (que só se justificaria
com requisito de isolamento físico mais rígido do que o hoje declarado), e
evita o risco alto de uma migração de dado de saúde sensível em produção
depois do go-live — que seria necessária na alternativa single-tenant assim
que hospital #2 fosse confirmado. Toda tabela do domínio de negócio (Seção 5 do
`SDD.md`) carrega `tenant_id` desde a primeira migration; a aplicação nunca
executa uma query sem contexto de tenant explícito (imposto por middleware/
guard na camada de acesso a dado); o PostgreSQL aplica RLS como segunda camada
de defesa (defesa em profundidade), não a única.

### Positive Consequences

- Elimina o risco de migração de dado de saúde sensível em produção quando
  hospital #2 for confirmado — extensão é apenas inserir nova linha de tenant,
  não redesenho de schema/dado.
- RLS no PostgreSQL fornece uma segunda camada de isolamento reforçada pelo
  próprio banco, reduzindo a chance de um bug de aplicação vazar dado entre
  hospitais (defesa em profundidade, ligado à Seção 7 do `SDD.md`).
- Alinhado ao modelo de negócio já validado (B2B2C multi-hospital) desde o
  Gate 1 — não é engenharia especulativa, é a arquitetura correspondente ao
  modelo de negócio confirmado.

### Negative Consequences

- Custo incremental de esforço no MVP: toda entidade de domínio precisa
  carregar e validar `tenant_id` desde o primeiro schema, e todo teste
  automatizado de dado precisa cobrir cenário de vazamento cruzado entre
  tenants — mais esforço de implementação/QA do que um single-tenant simples
  para 1 hospital.
- Erro de implementação (esquecer o filtro de tenant em uma query nova) é o
  tipo de bug com maior impacto possível no produto (vazamento de dado de
  saúde entre hospitais) — exige disciplina de revisão de código e teste
  automatizado dedicado (guardrail a ser proposto pelo Tech Lead em
  `GUARDRAILS.md`).
- Para 1 hospital piloto, parte desse investimento não gera valor imediato —
  é custo antecipado consciente para não repetir o padrão que o próprio
  `PRD.md` já identificou como risco (Seção 4.2, R4).

## Pros and Cons of the Options

### Multi-tenant lógico (tenant_id + RLS) ✅ Chosen

- ✅ Sem migração de dado sensível em produção ao escalar
- ✅ Defesa em profundidade (aplicação + banco)
- ✅ Alinhado ao modelo de negócio já validado
- ❌ Esforço incremental no MVP para 1 hospital
- ❌ Exige disciplina de engenharia rigorosa (todo acesso a dado com tenant)

### Single-tenant com migração futura

- ✅ Menor esforço imediato para 1 hospital
- ❌ Migração de dado de saúde sensível em produção é operação de alto risco,
  incompatível com o rigor de LGPD já elevado a Must-have (R3)
- ❌ Contraria diretamente a exigência do `PRD.md` (R4) de não gerar
  retrabalho estrutural ao escalar

### Multi-tenant físico (banco/schema por hospital)

- ✅ Isolamento mais forte que o lógico
- ❌ Custo operacional de gerenciar N bancos cresce linearmente com o número
  de hospitais — incompatível com a squad pequena (P3) e sem ganho de
  isolamento proporcional ao requisito hoje declarado (lógico já atende
  RNF-11/RN-09)
- ❌ Complexidade de migração de schema replicada N vezes a cada mudança

## Links

- Relacionado: ADR-001 (padrão arquitetural), ADR-006 (PostgreSQL/RLS)
- `SDD.md`, Seções 2, 5 e 7
- `CTO-REVIEW.md`, Gate 1, ressalva 4
- `PRD.md`, Seção 4.2 (R4), Premissa P9
- `PRD-TECNICO.md`, RNF-11, RN-09
