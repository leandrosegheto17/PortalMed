# ADR-002: Usar Motor de Interoperabilidade HL7/FHIR de Mercado, com Anti-Corruption Layer, em vez de Construir Parser Próprio

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (submeter a `build-vs-buy-analysis` do CTO no Gate 2)
- **Tags**: architecture, integration, build-vs-buy, gate-2

> **Marcação para o Gate 2**: esta decisão é candidata obrigatória a
> `build-vs-buy-analysis` (`CTO-REVIEW.md`, Gate 1, ressalva 4; `PRD.md` Seção
> 4.2/R4, Premissa P10) — registrada aqui como proposta do Software Architect,
> não considerada final até revisão do CTO.

## Contexto e Problema

RF-14 exige receber laudo/dado cadastral do LIS/PACS/RIS/HIS do hospital
piloto. O hospital piloto real ainda não está identificado (Premissa P1) — o
BA registrou HL7 v2.x e FHIR R4 como padrões-alvo de trabalho (`PRD-TECNICO.md`
Seção 7.1), sem confirmação real de protocolo/versão/fabricante. O `PRD.md`
(Seção 4.2, item 1) já sinaliza que a decisão de construir a integração do zero
vs. usar motor de mercado afeta diretamente a hipótese de prazo (P3, 16-20
semanas) e que a arquitetura precisa suportar heterogeneidade entre hospitais
sem retrabalho ao escalar (RF-C02, Release 2+). O `CTO-REVIEW.md` (Gate 1) já
identificou que nem `backend.md` nem `software-architect.md` declaram
conhecimento prévio de interoperabilidade em saúde — gap de especialização, não
de papel.

## Decision Drivers

- Protocolo real do hospital piloto ainda não confirmado (P1) — a arquitetura
  precisa ser resiliente a essa incerteza, não hard-coded para um único
  protocolo.
- Prazo-alvo apertado (hipótese P3) não comporta o custo de construir e validar
  um parser HL7 v2.x/FHIR R4 completo do zero, incluindo tratamento de
  variações de segmento por fabricante (extremamente comuns em HL7 v2.x real).
- Squad sem especialização declarada em interoperabilidade em saúde
  (`CTO-REVIEW.md`, Gate 1).
- RF-C02 (Release 2+, motor de integração genérico multi-LIS/PACS) não pode
  exigir reescrita da integração do MVP — precisa ser extensão, não
  substituição.
- RF-14 exige resiliência a indisponibilidade da fonte (exame já sincronizado
  continua disponível) e fila de exceção para paciente não localizado — a
  engine escolhida precisa suportar esses padrões (retry, dead-letter/exception
  queue) nativamente.

## Considered Options

- **Construir parser HL7 v2.x/FHIR R4 próprio** dentro do monolito core
  (Node.js/TypeScript, ver ADR-005)
- **Usar motor de interoperabilidade de mercado** (ex.: NextGen Connect/Mirth
  Connect, open-source, motor de canais HL7 v2.x MLLP + suporte a FHIR R4) como
  serviço de borda dedicado, com uma Anti-Corruption Layer (ACL) traduzindo
  para um formato canônico interno antes de entrar no domínio core
- **Contratar plataforma de interoperabilidade em saúde como serviço (SaaS
  de integração)** de terceiro (ex.: fornecedor especializado em
  interoperabilidade hospitalar)

## Decision Outcome

Opção escolhida: **"Usar motor de interoperabilidade de mercado (ex.: NextGen
Connect/Mirth Connect) com Anti-Corruption Layer"**, porque resolve a
combinação dos três drivers centrais — protocolo real ainda incerto, prazo
apertado, e squad sem especialização prévia — sem introduzir dependência de
vendor SaaS crítico de terceiro (evita lock-in mais severo de uma plataforma
comercial fechada) nem o custo/risco de construir tratamento de HL7 v2.x do
zero (protocolo notoriamente inconsistente entre fabricantes na prática).

A engine roda como **serviço de borda separado** (não módulo do monolito core,
ver ADR-001), recebendo mensagens HL7 v2.x (MLLP) e/ou requisições FHIR R4 do
sistema do hospital, normalizando para um **formato canônico interno em JSON**,
e publicando esse evento normalizado para a aplicação core via API interna
(ver Seção 2 do `SDD.md`). A aplicação core nunca lida com HL7/FHIR
diretamente — só com o formato canônico da ACL. Isso significa que, ao integrar
o hospital #2 (Release 2, RF-C02) com um protocolo/fabricante diferente, a
mudança fica isolada em um novo canal/configuração da engine, sem tocar o
domínio de negócio do monolito core.

### Positive Consequences

- Reduz drasticamente o esforço de construção comparado a um parser HL7 v2.x
  próprio (mitiga risco de estourar a hipótese de prazo P3).
- ACL isola o domínio de negócio de detalhes de protocolo — extensão para
  hospital #2+ (RF-C02) é configuração de novo canal na engine, não reescrita
  de domínio.
- Suporta nativamente padrões de resiliência (retry, fila de mensagens não
  processadas) exigidos por RF-14 (exame já sincronizado permanece disponível
  se a fonte cair; fila de exceção para paciente não localizado).
- Open-source reduz custo de licenciamento comparado a SaaS de terceiro,
  evitando lock-in comercial crítico.

### Negative Consequences

- Introduz um componente de infraestrutura adicional (a engine em si) que o
  DevOps precisa operar, monitorar e manter atualizado — não é "zero custo
  operacional".
- Equipe ainda precisa desenvolver competência mínima de configuração de
  canais HL7/FHIR na engine (curva de aprendizado real, ainda que menor que
  construir o parser do zero).
- Como o hospital piloto real não está confirmado (P1), o canal específico só
  pode ser configurado/validado quando P1 for resolvida — risco residual de
  que o protocolo real do piloto exija um adapter não coberto de forma trivial
  pela engine escolhida (mitigação: revisitar esta decisão assim que P1 for
  resolvida, antes de configurar o canal real).
- Ponto único de falha adicional na cadeia de ingestão se não operado com
  redundância (ver Seção 6 do `SDD.md`, Riscos Técnicos).

## Pros and Cons of the Options

### Motor de mercado com ACL ✅ Chosen

- ✅ Menor esforço/risco de prazo que construir do zero
- ✅ Extensível a hospital #2+ sem retrabalho de domínio
- ✅ Suporta resiliência/exception handling nativamente
- ❌ Componente de infraestrutura adicional a operar
- ❌ Curva de aprendizado de configuração de canais

### Construir parser próprio

- ✅ Controle total sobre o comportamento exato
- ❌ Alto risco de estourar a hipótese de prazo (P3) dado o esforço de tratar
  variações de HL7 v2.x por fabricante
- ❌ Exige especialização que o squad hoje não declara ter (`CTO-REVIEW.md`,
  Gate 1)

### SaaS de interoperabilidade de terceiro

- ✅ Menor esforço de operação de infraestrutura própria
- ❌ Vendor lock-in crítico sobre um componente inegociável (RF-14) — risco
  alto de custo/dependência estratégica, incompatível com decidir isso fora do
  Gate 2
- ❌ Custo recorrente de licenciamento não avaliado/orçado (P2/P3)

## Links

- Relacionado: ADR-001 (padrão arquitetural), ADR-003 (pipeline DICOM, mesmo
  racional de build-vs-buy)
- `SDD.md`, Seções 2, 3 e 6
- `CTO-REVIEW.md`, Gate 1, ressalva 4
- `PRD.md`, Seção 4.2 (R4), Premissas P9/P10
