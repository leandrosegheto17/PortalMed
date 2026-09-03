# ADR-010: Hospedar Dados em Região de Nuvem Localizada no Brasil

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (submeter a `risk-and-compliance-check` do CTO no Gate 2)
- **Tags**: architecture, compliance, data-residency, gate-2

> **Marcação para o Gate 2**: RNF-15 explicitamente delega esta decisão à
> avaliação conjunta do Software Architect com o CTO (`risk-and-compliance-
> check`) — registrada aqui como proposta, não considerada final até revisão
> do CTO.

## Contexto e Problema

RNF-15 exige que a decisão de localização de armazenamento (data center no
Brasil vs. fora) seja avaliada pelo Software Architect com o CTO, dado que
dado de saúde de paciente brasileiro é tratado sob LGPD (Art. 5º, XI e Art.
11) — não é decisão que o BA teve autoridade para tomar.

## Decision Drivers

- Dado de saúde é dado sensível sob LGPD (Art. 11) — a ressalva 3 do
  `CTO-REVIEW.md` (Gate 1) já exige rigor acima do padrão de projeto sem dado
  sensível.
- ADR-006 (PostgreSQL) e a decisão de object storage (Seção 3 do `SDD.md`)
  precisam de um provedor de nuvem com região disponível no Brasil para essa
  opção ser tecnicamente viável sem custo desproporcional.
- Transferência internacional de dado sensível sob a LGPD exige base legal e
  salvaguardas adicionais (Art. 33 e seguintes) — manter o dado em território
  nacional remove essa camada extra de complexidade de compliance no MVP.

## Considered Options

- **Hospedar em região de nuvem no Brasil** (ex.: `sa-east-1`/São Paulo, ou
  provedor nacional equivalente)
- **Hospedar em região de nuvem fora do Brasil** (ex.: `us-east-1`), com
  salvaguardas contratuais de transferência internacional de dado (cláusulas
  padrão, avaliação de adequação)

## Decision Outcome

Opção escolhida: **"Hospedar em região de nuvem no Brasil"**, porque reduz a
superfície de risco de compliance do MVP (evita a complexidade adicional de
transferência internacional de dado sensível sob LGPD) em um momento em que o
produto ainda não tem hospital piloto confirmado nem contrato validado (P1/P2)
— não há justificativa de negócio hoje para assumir o risco/custo extra de
uma arquitetura multi-região. Provedores de nuvem majoritários (AWS
`sa-east-1`, Azure Brazil South, GCP `southamerica-east1`) já oferecem região
no Brasil com paridade de serviço suficiente para os componentes decididos
neste `SDD.md` (PostgreSQL gerenciado, Redis gerenciado, object storage).

### Positive Consequences

- Remove a necessidade de avaliar base legal de transferência internacional
  de dado sensível (LGPD Art. 33+) para o MVP.
- Simplifica a resposta a auditoria/fiscalização — "onde o dado está
  armazenado" tem resposta direta e alinhada à expectativa do hospital
  piloto/paciente brasileiro.
- Reduz risco de latência para usuários finais brasileiros (paciente,
  administrador do hospital), efeito colateral positivo de desempenho.

### Negative Consequences

- Reduz a opcionalidade de provedor/região no futuro — trocar de região depois
  do go-live exigiria migração de dado sensível em produção (risco análogo ao
  discutido em ADR-004 para multi-tenancy), então esta decisão deve ser
  tratada como estável desde o início, não um detalhe fácil de reverter.
- Algumas regiões brasileiras de provedores de nuvem têm paridade de serviço
  ligeiramente menor que regiões "principais" (ex.: disponibilidade de
  determinados tipos de instância/serviço gerenciado) — a ser validado pelo
  DevOps na fase de infraestrutura real, não neste documento.

## Pros and Cons of the Options

### Região de nuvem no Brasil ✅ Chosen

- ✅ Sem complexidade extra de transferência internacional de dado sensível
- ✅ Resposta direta e simples sobre onde o dado está armazenado
- ✅ Latência menor para usuários finais brasileiros
- ❌ Menor opcionalidade futura de provedor/região sem migração de risco
  equivalente ao de ADR-004
- ❌ Paridade de serviço a validar caso a caso pelo DevOps

### Região de nuvem fora do Brasil, com salvaguardas contratuais

- ✅ Maior paridade de serviço/preço em algumas regiões "principais"
- ❌ Introduz complexidade de compliance (base legal de transferência
  internacional) sem benefício de negócio validado hoje (P1/P2 ainda em
  aberto)

## Links

- `SDD.md`, Seções 3 e 7
- `PRD-TECNICO.md`, RNF-15
- `CTO-REVIEW.md`, Gate 1, ressalva 3
