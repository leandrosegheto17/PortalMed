# ADR-005: Usar Node.js + TypeScript + NestJS como Stack da Aplicação Core

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, stack, backend

## Contexto e Problema

A aplicação core (monolito modular, ADR-001) precisa de uma linguagem/
framework que suporte organização por módulos de domínio (DDD tático leve),
tenha ecossistema maduro para REST API, RBAC, filas assíncronas (conversão de
imagem, ingestão de integração) e integração com PostgreSQL — dentro da
hipótese de prazo apertado (P3, 16-20 semanas) e squad pequena (1 tech lead, 2
backend, 1-2 frontend).

## Decision Drivers

- Prazo-alvo apertado (hipótese P3) favorece uma stack com curva de
  aprendizado baixa para uma squad pequena, não necessariamente a de maior
  ecossistema de nicho.
- Compartilhar linguagem entre frontend (React/TypeScript, decisão de rotina
  registrada na Seção 3 do `SDD.md`) e backend reduz custo de onboarding e
  permite reuso de tipos/contratos (ex.: DTOs compartilhados).
- Módulos de domínio (Identity & Access, Cadastro, Catálogo, Entrega,
  Compartilhamento, Auditoria, etc. — Seção 2 do `SDD.md`) precisam de
  fronteira clara dentro do monolito — framework precisa suportar organização
  modular nativamente, não só rotas soltas.
- Protocolo HL7/FHIR já foi isolado em serviço de borda separado (ADR-002),
  então a stack core **não** precisa de suporte nativo a HL7/FHIR — isso
  remove a pressão que favoreceria Java/HAPI FHIR como escolha default.

## Considered Options

- **Node.js + TypeScript + NestJS** (framework opinativo, módulos/decorators,
  suporte nativo a DI, guards para RBAC, integração madura com filas/Redis)
- **Java + Spring Boot** (ecossistema enterprise maduro, suporte nativo a HAPI
  FHIR caso a integração fosse feita in-process — não é mais o caso após
  ADR-002)
- **Python + Django/FastAPI** (produtividade alta, ecossistema maduro, mas
  menor alinhamento natural com um frontend React/TypeScript compartilhando
  tipos)

## Decision Outcome

Opção escolhida: **"Node.js + TypeScript + NestJS"**, porque, com a
integração HL7/FHIR já isolada como serviço de borda comprado (ADR-002) e o
pipeline DICOM também isolado (ADR-003), a stack core não precisa mais
carregar a pressão de escolher Java só por causa de HAPI FHIR — a decisão pode
priorizar velocidade de entrega e alinhamento de linguagem full-stack para uma
squad pequena. NestJS fornece estrutura modular nativa (módulos, providers,
guards) que mapeia diretamente para os bounded contexts definidos em ADR-001,
reduzindo o risco de o monolito modular degradar em "monolito espaguete" por
falta de convenção imposta pelo framework.

### Positive Consequences

- Onboarding mais rápido para squad pequena com TypeScript compartilhado entre
  frontend e backend.
- Estrutura modular do NestJS (módulos/guards/interceptors) mapeia diretamente
  para os bounded contexts do monolito modular (ADR-001), reduzindo risco de
  erosão de fronteira entre módulos.
- Ecossistema maduro para os requisitos transversais do MVP: RBAC via guards
  (RNF-03), validação de DTO, integração com filas (BullMQ/Redis) para
  processamento assíncrono de conversão de imagem e ingestão de integração.

### Negative Consequences

- Ecossistema de bibliotecas de interoperabilidade em saúde nativas em
  Node.js é menos maduro que em Java (mitigado por ADR-002/ADR-003 — a stack
  core não lida diretamente com HL7/FHIR/DICOM cru).
- Node.js é single-threaded por padrão para código CPU-bound — processamento
  pesado (ex.: geração de PDF, se feito in-process) precisa ser delegado a
  workers/filas explicitamente, não pode ser assumido como paralelo por
  padrão (mitigação: BullMQ + workers dedicados para tarefas pesadas).

## Pros and Cons of the Options

### Node.js + TypeScript + NestJS ✅ Chosen

- ✅ Curva de aprendizado baixa para squad pequena
- ✅ TypeScript compartilhado com frontend
- ✅ Estrutura modular nativa alinhada a ADR-001
- ❌ Ecossistema de interoperabilidade em saúde nativo mais fraco (mitigado)
- ❌ CPU-bound exige delegação explícita a workers

### Java + Spring Boot

- ✅ Ecossistema enterprise maduro, HAPI FHIR nativo
- ❌ Vantagem de HAPI FHIR nativo perde relevância após ADR-002 (integração já
  isolada em serviço de borda)
- ❌ Curva de aprendizado/boilerplate maior para squad pequena e prazo
  apertado

### Python + Django/FastAPI

- ✅ Produtividade alta, ecossistema maduro
- ❌ Menor alinhamento de tipos compartilhados com frontend React/TypeScript
- ❌ Sem vantagem decisiva sobre Node.js dado que HL7/FHIR/DICOM já estão
  isolados como serviços de borda

## Links

- Relacionado: ADR-001 (padrão arquitetural), ADR-002/ADR-003 (justificam por
  que a stack core não precisa de suporte nativo a HL7/FHIR/DICOM)
- `SDD.md`, Seção 3
