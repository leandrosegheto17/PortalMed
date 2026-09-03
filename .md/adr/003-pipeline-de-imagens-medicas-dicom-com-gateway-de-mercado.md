# ADR-003: Usar Gateway DICOM de Mercado (Orthanc) para Conversão JPEG/PNG do MVP, como Base para Visualizador Nativo na Release 2

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (submeter a `build-vs-buy-analysis` do CTO no Gate 2)
- **Tags**: architecture, imaging, build-vs-buy, gate-2

> **Marcação para o Gate 2**: candidata obrigatória a `build-vs-buy-analysis`
> (`CTO-REVIEW.md`, Gate 1, ressalva 4; `PRD.md` Seção 4.2/R4, Premissa P10).

## Contexto e Problema

RF-07 exige exibir exame de imagem convertido de DICOM para JPEG/PNG no MVP.
RF-S02 (Should/Release 2) exige visualizador DICOM nativo (zoom/pan/window-
level) sobre a imagem original — decisão de biblioteca/serviço deve ser
avaliada com antecedência para não virar decisão de última hora (`PRD.md`
Seção 4.2, item 2). DICOM é um formato complexo (metadados de estudo/série/
instância, múltiplos transfer syntaxes, window-level dependente de dados do
próprio arquivo) — construir um parser/renderizador DICOM do zero é
significativamente mais caro que HL7/FHIR (ADR-002) e o risco de subestimar o
esforço é alto dado o gap de especialização já registrado no Gate 1.

## Decision Drivers

- MVP corta para JPEG/PNG (RF-07), mas a decisão de hoje não pode obrigar
  reescrita da camada de imagem quando o visualizador nativo DICOM (RF-S02)
  entrar em Release 2.
- Squad sem especialização declarada em renderização de imagens médicas
  (`CTO-REVIEW.md`, Gate 1).
- RF-07 exige tratamento de falha de conversão sem bloquear o restante da
  lista de exames do paciente — a solução precisa suportar processamento
  assíncrono e isolado por exame.
- Premissa P8 (`PRD.md`) registra risco de que o hospital piloto real tenha
  alto volume de imagem como caso de uso principal — decisão de hoje não pode
  fechar a porta para evolução rápida do visualizador nativo se isso se
  confirmar.

## Considered Options

- **Construir conversão DICOM → JPEG/PNG do zero**, usando biblioteca de baixo
  nível (ex.: `dcmjs`/`dcm4che` embutida diretamente no monolito core)
- **Usar Orthanc (servidor DICOM open-source) como gateway/PACS proxy
  dedicado**, com plugin de conversão para JPEG/PNG no MVP, expondo também
  endpoint DICOMweb (WADO-RS) já pronto para consumo futuro por visualizador
  web (ex.: OHIF Viewer/Cornerstone.js) na Release 2
- **Contratar serviço SaaS de visualização/conversão DICOM** de terceiro
  (ex.: plataforma comercial de PACS na nuvem)

## Decision Outcome

Opção escolhida: **"Orthanc como gateway/PACS proxy dedicado"**, porque separa
claramente duas preocupações que o `PRD.md` já tratou como release diferentes
— conversão simples para JPEG/PNG (MVP, RF-07) e visualização nativa avançada
(Release 2, RF-S02) — sem forçar retrabalho entre uma e outra. O Orthanc recebe
o DICOM original do PACS do hospital (mantendo o arquivo original armazenado,
sem descartá-lo), gera a conversão JPEG/PNG consumida pelo MVP (RF-07), e já
expõe nativamente um endpoint DICOMweb (WADO-RS) que um visualizador web
padrão de mercado (OHIF Viewer, baseado em Cornerstone.js) pode consumir
diretamente na Release 2 — sem exigir nova integração com o PACS do hospital
nesse momento futuro.

### Positive Consequences

- Evita reconstruir a integração com o PACS do hospital quando o visualizador
  DICOM nativo (RF-S02) for priorizado — o Orthanc já guarda o DICOM original
  e expõe o endpoint padrão que o visualizador vai consumir.
- Reduz risco de subestimar o esforço de parsing DICOM, dado que o squad não
  declara especialização prévia nessa área (`CTO-REVIEW.md`, Gate 1).
- Open-source, sem lock-in de SaaS comercial crítico sobre um componente que
  ainda não teve seu ROI de imagem validado (Premissa P8, hospital piloto não
  identificado).
- Isola a complexidade de DICOM em um serviço de borda dedicado, mesmo padrão
  arquitetural do ADR-001/ADR-002 — o monolito core só lida com a URL/
  referência da imagem já convertida.

### Negative Consequences

- Mais um componente de infraestrutura a operar, monitorar e manter (mesmo
  trade-off do ADR-002) — soma-se ao custo operacional total do MVP.
- Armazenar o DICOM original (não só o JPEG/PNG convertido) desde o MVP
  aumenta o volume de armazenamento necessário mais cedo do que o estritamente
  exigido por RF-07 — aceito conscientemente como custo do "preparar terreno"
  para RF-S02 (ver Seção 6 do `SDD.md`, dívida técnica/decisão consciente,
  registrada aqui como o oposto — investimento consciente, não dívida).
- Pipeline de conversão assíncrona (Orthanc → JPEG/PNG → Object Storage)
  introduz mais uma etapa que pode falhar isoladamente — precisa de
  monitoramento dedicado (RNF-10), já mapeado como requisito de RF-07.

## Pros and Cons of the Options

### Orthanc como gateway dedicado ✅ Chosen

- ✅ Base pronta para visualizador nativo na Release 2, sem retrabalho
- ✅ Reduz risco de subestimar esforço de parsing DICOM
- ✅ Sem lock-in de SaaS comercial crítico
- ❌ Mais um componente de infraestrutura a operar
- ❌ Armazena DICOM original desde já (custo de storage antecipado)

### Construir conversão do zero

- ✅ Sem dependência de componente externo
- ❌ Alto risco de subestimar esforço (gap de especialização declarado no
  Gate 1)
- ❌ Sem preparo nenhum para RF-S02 — geraria retrabalho garantido na Release 2

### SaaS de visualização/conversão DICOM de terceiro

- ✅ Menor esforço de operação própria
- ❌ Vendor lock-in sobre um dado sensível (imagem médica) sem ROI validado
  ainda (Premissa P8) — risco alto de custo recorrente não orçado

## Links

- Relacionado: ADR-001 (padrão arquitetural), ADR-002 (mesmo racional de
  build-vs-buy para HL7/FHIR)
- `SDD.md`, Seções 2, 3 e 6
- `CTO-REVIEW.md`, Gate 1, ressalva 4
- `PRD.md`, Seção 4.2 (R4), Premissa P8/P10
- `PRD-TECNICO.md`, RF-07, RF-S02
