# ADR-001: Adotar Monolito Modular com Serviços de Borda Especializados como Padrão Arquitetural

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect
- **Tags**: architecture, mvp, scalability

## Contexto e Problema

O `PRD-TECNICO.md` define um MVP com 1 hospital piloto (RF-01 a RF-16), mas o
`PRD.md` (Seção 4.2, R4/P9/P10) exige que a arquitetura **não force retrabalho
estrutural** ao escalar para hospital #2+ (Release 2 — RF-C01/RF-C02, motor de
integração genérico, escalabilidade horizontal). A hipótese de squad do PM
(`PRD.md` Seção 1.4/P3) é enxuta: 1 tech lead, 2 backend, 1-2 frontend, 1 QA,
suporte parcial de DevSecOps/DevOps — não uma squad de porte enterprise capaz de
operar uma malha de microsserviços desde o dia 1. Ao mesmo tempo, dois
subdomínios têm natureza claramente diferente do domínio de negócio principal e
já são candidatos a `build-vs-buy-analysis` (integração HL7/FHIR e pipeline
DICOM, ver ADR-002 e ADR-003) — não fazem sentido como módulos internos do
mesmo processo.

## Decision Drivers

- Squad pequena (hipótese P3 do PRD.md) não suporta o overhead operacional de
  uma arquitetura de microsserviços completa desde o MVP.
- RNF-11/RN-09 exigem isolamento de dados entre hospitais desde já, mesmo com 1
  hospital piloto — a arquitetura precisa comportar múltiplos tenants sem
  reescrita (ver ADR-004).
- Dois subcomponentes (motor de interoperabilidade HL7/FHIR e pipeline de
  imagens DICOM) são candidatos naturais a produto de mercado, não a módulo de
  domínio de negócio construído do zero.
- Prazo-alvo de 16-20 semanas para o MVP (hipótese P3, PRD.md Seção 1.4) não
  comporta o custo de setup de uma malha de serviços distribuída.

## Considered Options

- **Microsserviços completos** (um serviço por bounded context: identidade,
  cadastro, catálogo de exames, compartilhamento, auditoria, etc.)
- **Monolito clássico** (uma única aplicação, sem fronteiras internas
  explícitas entre domínios)
- **Monolito modular com serviços de borda especializados** (aplicação core
  única, organizada em módulos com fronteira de domínio clara — DDD tático via
  `modular-design-principles` — mais dois serviços de borda comprados/operados
  separadamente: motor de integração HL7/FHIR e gateway de imagens DICOM)

## Decision Outcome

Opção escolhida: **"Monolito modular com serviços de borda especializados"**,
porque equilibra a velocidade de entrega exigida pelo MVP (squad pequena, prazo
apertado) com a necessidade de não travar a evolução para múltiplos hospitais —
os módulos internos já nascem com fronteira de bounded context definida
(Identity & Access, Cadastro & Consentimento, Catálogo de Exames, Entrega de
Laudo/Imagem, Compartilhamento, Auditoria, Config de Tenant/Branding, Gestão de
Usuários, Ajuda/Suporte, Notificação, Fila de Exceção — ver Seção 2 do
`SDD.md`), prontos para serem extraídos como serviços independentes no futuro
sem redesenho de domínio. Os dois subdomínios de interoperabilidade em saúde
(HL7/FHIR e DICOM) já nascem como serviços de borda separados, comprados de
mercado (ver ADR-002, ADR-003), porque são complexidade especializada que não
compensa reconstruir dentro do monolito.

### Positive Consequences

- Deploy único da aplicação core simplifica operação para uma squad pequena
  (menos infraestrutura para o DevOps gerenciar no MVP).
- Fronteiras de módulo internas (bounded contexts) preparam extração futura de
  qualquer módulo como serviço independente sem redesenho de domínio, quando
  hospital #2+ justificar (RF-C01/RF-C02).
- Isola a complexidade específica de interoperabilidade em saúde (protocolos
  legados, formatos DICOM) em serviços de borda dedicados, sem contaminar o
  domínio de negócio principal com detalhes de protocolo.

### Negative Consequences

- Monolito modular ainda compartilha processo/deploy — um bug em um módulo
  pode, em tese, afetar a disponibilidade de outro módulo dentro do mesmo
  processo (mitigado por testes e isolamento de módulo via `modular-design-
  principles`, não por isolamento de processo).
- Escalar módulos individualmente (ex.: só o módulo de Entrega de Laudo/Imagem
  sob mais carga) não é possível sem antes extrair o módulo como serviço
  próprio — dívida técnica aceita conscientemente (ver Seção 6 do `SDD.md`),
  revisitada quando o volume de hospital #2+ justificar.
- Disciplina de fronteira entre módulos depende de convenção de código
  (enforced por lint/arquitetura), não por isolamento físico de processo —
  exige rigor do Tech Lead/Backend na decomposição do `TASK.md`.

## Pros and Cons of the Options

### Monolito modular com serviços de borda especializados ✅ Chosen

- ✅ Compatível com squad pequena e prazo do MVP
- ✅ Fronteiras de domínio prontas para extração futura
- ✅ Isola complexidade de interoperabilidade em saúde em serviços de borda comprados
- ❌ Escala módulo a módulo só depois de extração futura

### Microsserviços completos

- ✅ Escalabilidade e deploy independentes desde o dia 1
- ❌ Overhead operacional incompatível com squad pequena/prazo do MVP
- ❌ Custo de infraestrutura (orquestração, observabilidade distribuída) não
  justificado para 1 hospital piloto

### Monolito clássico (sem fronteira de módulo)

- ✅ Mais simples de iniciar
- ❌ Sem fronteira de domínio, qualquer evolução futura para múltiplos
  hospitais exige redesenho estrutural — contraria diretamente a exigência do
  `PRD.md` (Seção 4.2/R4) de não gerar retrabalho ao escalar

## Links

- Relacionado: ADR-002 (motor de integração HL7/FHIR), ADR-003 (pipeline
  DICOM), ADR-004 (multi-tenancy lógica)
- `SDD.md`, Seções 1-2
