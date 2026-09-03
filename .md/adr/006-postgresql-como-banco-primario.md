# ADR-006: Usar PostgreSQL como Banco de Dados Primário

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, stack, database, security

## Contexto e Problema

A aplicação core precisa de um banco relacional que suporte: (a) integridade
referencial forte entre entidades de negócio (paciente, exame, consentimento,
auditoria — Seção 5 do `SDD.md`), (b) isolamento multi-tenant lógico reforçado
no nível do banco (ADR-004), (c) criptografia em repouso (RNF-02) e (d)
armazenamento flexível de payloads normalizados vindos da Integration Engine
(ADR-002), que podem variar em estrutura entre hospitais/fabricantes.

## Decision Drivers

- ADR-004 exige um banco com suporte nativo a Row-Level Security (RLS) para
  reforçar isolamento de tenant como segunda camada de defesa.
- RF-10/RN-08 exigem log de auditoria imutável, append-only — o banco precisa
  suportar controle de privilégio granular (revogar UPDATE/DELETE em nível de
  tabela) para reforçar essa garantia (ver ADR-009).
- RNF-02 exige criptografia em repouso de dado de saúde — o banco escolhido
  precisa suportar isso nativamente ou via extensão madura, sem depender de
  criptografia só na camada de aplicação.
- Payload normalizado da Integration Engine (ADR-002) pode variar em campos
  opcionais entre fabricantes — útil ter suporte a coluna semiestruturada
  (JSONB) sem abrir mão de integridade relacional no restante do schema.

## Considered Options

- **PostgreSQL** (relacional, RLS nativo, JSONB, extensões de criptografia
  maduras como `pgcrypto`, amplamente suportado por provedores gerenciados
  com região no Brasil)
- **MySQL/MariaDB** (relacional, mais popular historicamente, mas suporte a
  RLS não é nativo — precisaria ser simulado na camada de aplicação)
- **MongoDB** (schema flexível nativo para o payload variável de integração,
  mas sem RLS nativo e com garantias de integridade referencial mais fracas
  para o núcleo de RBAC/auditoria/consentimento)

## Decision Outcome

Opção escolhida: **"PostgreSQL"**, porque é o único candidato que atende os
quatro drivers simultaneamente sem exigir workaround de aplicação para o mais
crítico deles — RLS nativo, que é a segunda camada de defesa da decisão de
multi-tenancy já tomada em ADR-004. JSONB cobre a necessidade de flexibilidade
para o payload de integração sem abrir mão de integridade relacional no
restante do schema (paciente, exame, consentimento, auditoria — todas
entidades com relacionamento forte, mais bem servidas por um modelo
relacional).

### Positive Consequences

- RLS nativo reforça o isolamento de tenant (ADR-004) diretamente no banco,
  independente de bug de aplicação.
- `pgcrypto`/criptografia em nível de coluna cobre RNF-02 para os campos mais
  sensíveis (ex.: identificadores de paciente), somada à criptografia de disco
  gerenciada pelo provedor de nuvem.
- Suporte amplo por provedores de nuvem gerenciados com região no Brasil,
  compatível com a decisão de residência de dado (ADR-010).
- Controle de privilégio granular por tabela/role suporta o requisito de log
  de auditoria append-only (ADR-009) sem exigir uma segunda tecnologia
  dedicada só para isso no MVP.

### Negative Consequences

- RLS mal configurado gera falso senso de segurança — precisa de teste
  automatizado dedicado (cenário de vazamento cruzado entre tenants), não é
  "configurar e esquecer" (mesmo ponto já registrado como risco em ADR-004).
- JSONB para o payload de integração sacrifica validação de schema em nível de
  banco — validação estrutural precisa ficar na aplicação (Integration
  Gateway/ACL, ADR-002), não no banco.

## Pros and Cons of the Options

### PostgreSQL ✅ Chosen

- ✅ RLS nativo (reforça ADR-004)
- ✅ JSONB + integridade relacional combinados
- ✅ Extensões de criptografia maduras
- ✅ Ampla oferta gerenciada com região no Brasil
- ❌ RLS exige disciplina de teste dedicado

### MySQL/MariaDB

- ✅ Popular, ampla familiaridade de mercado
- ❌ Sem RLS nativo — isolamento de tenant dependeria inteiramente da camada
  de aplicação, enfraquecendo a defesa em profundidade de ADR-004

### MongoDB

- ✅ Schema flexível nativo para payload de integração
- ❌ Sem RLS nativo, garantias de integridade mais fracas para o núcleo de
  RBAC/consentimento/auditoria, que são o coração do requisito de segurança
  deste produto

## Links

- Relacionado: ADR-004 (multi-tenancy), ADR-009 (log de auditoria imutável)
- `SDD.md`, Seções 3, 5 e 7
