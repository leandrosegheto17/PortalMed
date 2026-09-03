# BLOCKERS.md

Log de inconsistências/bloqueios entre agentes, conforme
`.claude/PIPELINE-CONVENTIONS.md` §4.

---

## Bloqueio 001 — 2026-09-02

- Reportado por: ux-ui
- Escalado para: software-architect
- Artefato/trecho afetado: `SDD.md` §5 (`BRANDING_CONFIG`) e §7 (Segurança) /
  `PRD-TECNICO.md` RF-11, RN-10
- Descrição: `RF-11`/`RN-10` estabelecem que a identidade visual do hospital
  (logo, paleta de cores) é aplicada via `BRANDING_CONFIG`, configurada pela
  equipe interna do projeto, sem painel self-service nesta release. O `SDD.md`
  não define, em nenhum ponto (§5 ou §7), uma etapa de validação de que a
  paleta/logo configurados para um hospital atendam ao contraste mínimo exigido
  por `RNF-06` (WCAG 2.1 AA, Must-have, inegociável) antes de ir para produção.
  O `UX-SPEC.md` (Seção 3.3) já mitiga parte do risco no nível de componente —
  toda cor de marca usada como fundo de texto tem contraste de texto calculado
  dinamicamente (nunca hardcoded) — mas isso não cobre todos os cenários (ex.:
  logo fornecido pelo hospital com texto de baixo contraste embutido na própria
  imagem), que dependem de uma checagem de contraste no processo de
  configuração, não de um componente de UI.
- Impacto se não resolvido: hospital piloto pode ir a produção com identidade
  visual que viola WCAG 2.1 AA em algum ponto não coberto pela regra de token de
  design, sem que exista um processo formal (manual ou automatizado) que capture
  isso antes do go-live — risco de não conformidade com requisito Must-have já
  confirmado (`RNF-06`).
- Sugestão (opcional): incluir, no processo operacional de configuração de
  `BRANDING_CONFIG` pela equipe interna (ou no próprio `SDD.md`, se o Software
  Architect preferir formalizar como etapa técnica), uma checagem de contraste
  (manual ou automatizada, ex.: ferramenta de verificação de contraste sobre
  logo/paleta) como pré-requisito de aceite daquela configuração antes do
  go-live do piloto.
- Status: **Resolvido em `SDD.md`, 2026-09-02**

### Resolução (software-architect, 2026-09-02)

Formalizada como etapa técnica no `SDD.md` (decisão híbrida: automatizada +
manual), não deixada apenas como processo operacional informal — registrada
em **ADR-011** (`.md/adr/011-validacao-de-contraste-wcag-no-fluxo-de-configuracao-de-branding.md`).

- **`SDD.md` §4** — ADR-011 adicionado ao índice de ADRs.
- **`SDD.md` §5** — entidade `BRANDING_CONFIG` ganhou os campos
  `status_validacao_contraste` (`pendente`/`aprovado`/`reprovado`),
  `metodo_validacao` (`automatizado`/`manual`/`ambos`), `validado_por`,
  `validado_em`, `observacoes_validacao`.
- **`SDD.md` §7.7 (nova)** — gate obrigatório: nenhuma configuração de
  `BRANDING_CONFIG` vai a go-live com `status_validacao_contraste !=
  'aprovado'`. Checagem automatizada (fórmula de contraste WCAG 2.1) cobre a
  `paleta_cores` contra os tokens fixos do sistema (`UX-SPEC.md` §3.3);
  checklist manual obrigatório cobre o `logo_url`, já que validar texto
  embutido em imagem arbitrária por automação foi considerado
  desproporcional ao volume do MVP (1 hospital piloto) — decisão e
  alternativas descartadas em ADR-011.
- **`SDD.md`** — Log de Alterações Pós-Gate 2 (final do documento) registra
  esta mudança pontual; o restante do documento, já aprovado no Gate 2, não
  foi reaberto.
- Não foi necessário reabrir o Gate 2 do CTO para esta resolução — é reabertura
  de bloqueio via `ux-ui`, não reprovação do CTO (ver
  `.claude/agents/software-architect.md`, "Recebe reabertura de").

---

## Bloqueio 002 — 2026-09-02

- Reportado por: tech-lead
- Escalado para: software-architect
- Artefato/trecho afetado: `SDD.md` §5 (modelo de dados — `EXAM_FILE`,
  `INTEGRATION_ENDPOINT_CONFIG`) e §2.2 (diagrama de sequência de ingestão)
- Descrição: durante a decomposição do `TASK.md`, duas lacunas estruturais do
  modelo de dados foram identificadas, ambas ligadas ao Imaging Gateway
  (Orthanc, ADR-003):
  1. **Lacuna A — rastreabilidade `EXAM_FILE` ↔ recurso Orthanc**: `EXAM_FILE`
     armazena apenas `object_storage_key`/`tipo_arquivo`, sem campo que
     correlacione o exame ao `StudyInstanceUID`/`SeriesInstanceUID`/
     `SOPInstanceUID` original no Orthanc — necessário para o "monitoramento
     dedicado por exame" já exigido por RF-07/`SDD.md` §6.1, e para que a
     Release 2 (RF-S02) reaproveite o DICOM original "sem retrabalho", conforme
     a própria justificativa de ADR-003.
  2. **Lacuna B — atribuição de `tenant_id` a eventos do Imaging Gateway**:
     `INTEGRATION_ENDPOINT_CONFIG` modela apenas `canal_integration_gateway`
     (HL7/FHIR), sem equivalente para o lado DICOM (ex.: AE Title por tenant).
     O Orthanc é agnóstico de tenant por natureza; o diagrama de sequência do
     `SDD.md` §2.2 (`ORT->CORE: Notifica conclusão da conversão`) não explicita
     como o `tenant_id` chega nesse ponto — risco de virar atribuição
     implícita/hardcoded, que a própria regra de multi-tenancy do `TASK.md`
     (Seção 1.3) proíbe.
- Impacto se não resolvido: BE-07/BE-22 (`TASK.md`) seguem com correlação
  ad hoc entre exame e recurso Orthanc, fragilizando o monitoramento por exame
  já prometido pelo `SDD.md`; atribuição de `tenant_id` para o Imaging Gateway
  permanece implícita, risco de dívida técnica silenciosa a ser descoberta
  tarde, no momento de integrar o hospital #2 (Release 2, RF-C02).
- Sugestão (opcional): (a) adicionar campo(s) de referência ao recurso Orthanc
  em `EXAM_FILE` (ex.: `orthanc_study_id`); (b) estender
  `INTEGRATION_ENDPOINT_CONFIG` com um campo equivalente ao `canal_integration_
  gateway` para o lado DICOM (ex.: AE Title por tenant), ou desenhar solução
  alternativa a critério do Software Architect.
- Status: **Resolvido em `SDD.md`, 2026-09-02**

### Resolução (software-architect, 2026-09-02)

Ambas as lacunas fechadas com um único ADR novo — **ADR-012**
(`.md/adr/012-rastreabilidade-dicom-em-exam-file-e-resolucao-de-tenant-via-ae-title.md`),
por serem estruturalmente relacionadas (mesma origem, Imaging Gateway/
Orthanc, ADR-003) e não implicarem revisão de nenhuma decisão já aceita —
apenas fecham lacuna que ADR-003 não havia coberto.

- **`SDD.md` §4** — ADR-012 adicionado ao índice de ADRs.
- **`SDD.md` §5** — `EXAM_FILE` ganhou `dicom_study_instance_uid`,
  `dicom_series_instance_uid`, `dicom_sop_instance_uid` (nullable, UIDs DICOM
  padrão do protocolo, não ID proprietário do Orthanc — escolha justificada
  em ADR-012 por sobreviver a eventual troca futura de gateway).
  `INTEGRATION_ENDPOINT_CONFIG` ganhou `dicom_remote_ae_title` (AE Title de
  origem do PACS de cada hospital), equivalente a `canal_integration_gateway`
  para o lado DICOM.
- **`SDD.md` §2.2 (diagrama de sequência)** — tornado explícito: o Orthanc
  permanece agnóstico de tenant (nenhuma customização de produto de mercado
  introduzida) e apenas propaga o `RemoteAET` — metadado nativo que já
  registra em toda associação DICOM recebida, sem exigir plugin — junto com
  os UIDs DICOM na notificação a `CORE`; é a Aplicação Core quem resolve
  `tenant_id`, casando esse `RemoteAET` contra
  `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`. Deixa de existir
  qualquer ponto implícito de atribuição de tenant no fluxo do Imaging
  Gateway.
- **`SDD.md` §6.1** — risco do pipeline de conversão DICOM atualizado: a
  correlação agora viabiliza estruturalmente o monitoramento por exame já
  prometido por RF-07.
- **`SDD.md` §7.1** — bullet de autenticação de integração externa detalhado
  com o mecanismo concreto do lado DICOM (AE Title dedicado por tenant).
- **`SDD.md`** — Log de Alterações Pós-Gate 2 (final do documento) registra
  esta mudança pontual; o restante do documento, já aprovado no Gate 2, não
  foi reaberto.
- A decisão provisória do `TASK.md` (BE-07, BE-22, campo ad hoc +
  configuração estática de "tenant único ativo") fica superada por este
  modelo definitivo — cabe ao Tech Lead reestimar as tarefas afetadas à luz
  do modelo agora formalizado em ADR-012, conforme já previsto no registro
  original deste bloqueio.
- Não foi necessário reabrir o Gate 2 do CTO para esta resolução — é
  reabertura de bloqueio via `tech-lead` (lacuna estrutural encontrada na
  decomposição), não reprovação do CTO (ver
  `.claude/agents/software-architect.md`, "Recebe reabertura de").
