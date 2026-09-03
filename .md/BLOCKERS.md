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

---

## Bloqueio 003 — 2026-09-02

- Reportado por: qa (durante validação de BE-02, fase de execução)
- Escalado para: cto
- Artefato/trecho afetado: `GUARDRAILS.md` regra A.5 (Seção A, "regra de
  maior severidade deste projeto") e `TASK.md` BE-02 / `backend/migrations/
  1788336780000_create-integration-endpoint-configs-table.ts`
- Descrição: o critério de aceite de BE-02 (`TASK.md`) e a redação literal de
  `GUARDRAILS.md` regra A.5 exigem constraint `UNIQUE` **por tenant** para
  `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`. Ao implementar, o
  Backend identificou que essa leitura literal não cumpre o próprio objetivo
  de segurança da regra: `ADR-012` nomeia explicitamente, nas suas "Negative
  Consequences", o risco de colisão de AE Title **entre** tenants — uma
  constraint composta `(tenant_id, dicom_remote_ae_title)` não previne essa
  colisão (dois tenants diferentes poderiam cadastrar o mesmo AE Title, cada
  um "único" dentro do próprio tenant, e a notificação do Orthanc seria
  então ambígua). O Backend implementou unicidade **global** (índice único
  parcial sem `tenant_id` na chave) — tecnicamente correta e confirmada pelo
  QA (`QA-DEBT-006`, `.md/QA-REPORT.md` Seção 2) — mas **sem seguir o
  processo formal de exceção que a própria `GUARDRAILS.md` regras 37-39
  exige**: nenhuma entrada foi aberta aqui antes da implementação, e nenhuma
  aprovação do CTO foi registrada no "Log de Alterações" de `GUARDRAILS.md`
  antes da mudança de comportamento em relação à regra A.5. A decisão ficou
  documentada só em comentário de migration e em `backend/docs/migrations.md`
  — nenhum dos dois é o mecanismo de governança formal do projeto.
- Impacto se não resolvido: `GUARDRAILS.md` regra A.5 e `TASK.md` BE-02
  continuam com uma redação ("UNIQUE por tenant") que diverge do que está
  realmente implementado e é o comportamento correto — qualquer leitor futuro
  (incluindo quem implementar BE-38, que consome diretamente esta mesma
  coluna) pode presumir a leitura literal errada e reintroduzir o problema
  que ADR-012 already endereçou. Mais amplamente, deixa um precedente de
  exceção a uma "regra de maior severidade" sem rastro formal de aprovação.
- Sugestão (do QA, registrada em `QA-DEBT-006`): formalizar a correção de
  redação em `TASK.md` (BE-02) e `GUARDRAILS.md` (regra A.5) para "UNIQUE
  global, não composta com `tenant_id`", com entrada no Log de Alterações de
  `GUARDRAILS.md` — antes de BE-38 (Fase 2 do backlog) ser implementada, já
  que essa tarefa consome diretamente `dicom_remote_ae_title`.
- Status: **Resolvido em `GUARDRAILS.md`, 2026-09-02**

### Resolução (cto, 2026-09-02)

**Correção técnica avaliada e confirmada.** Reli `ADR-012` (seção "Negative
Consequences") e `backend/docs/migrations.md` (seção "Decisões de detalhe
tomadas nesta tarefa"). Concordo com a análise do Backend, já confirmada
pelo QA em `.md/QA-REPORT.md` Seção 1.4/`QA-DEBT-006`: `ADR-012` nomeia
explicitamente, nas suas "Negative Consequences", o risco de colisão de AE
Title **entre** tenants ("se dois hospitais, por erro de configuração
externa ao sistema, usarem o mesmo AE Title de origem, a resolução de
tenant falha silenciosamente atribuindo ao tenant errado"). Uma constraint
composta `(tenant_id, dicom_remote_ae_title)` não mitiga esse risco — só
impediria um único tenant de cadastrar o mesmo AE Title duas vezes, cenário
que a tabela `INTEGRATION_ENDPOINT_CONFIG` (1:1 com `TENANT`) já torna
essencialmente impossível por outra via. A unicidade **precisa** ser sobre
o valor da coluna através de todos os tenants para de fato prevenir a
colisão — a implementação do Backend (índice único parcial global, ignora
`NULL`, coberta por teste positivo e negativo) é a leitura correta do
objetivo real da regra, não um desvio dele.

**Ações tomadas**:

1. `GUARDRAILS.md` regra **A.5** corrigida de "constraint `UNIQUE` por
   tenant" para "constraint `UNIQUE` **global**, não composta com
   `tenant_id`", com a razão completa registrada no corpo da própria regra.
2. Nova linha adicionada ao **Log de Alterações** de `GUARDRAILS.md`
   (2026-09-02), com aprovação formal do CTO, conforme regras 37-38 —
   formaliza retroativamente a exceção/correção, encerrando a lacuna de
   governança apontada pelo QA.
3. Nota de processo (não penalidade) registrada no mesmo Log de Alterações:
   a implementação não deveria ter avançado sem passar por `BLOCKERS.md` e
   por esta aprovação antes da mudança de comportamento em relação a uma
   regra da Seção A — vale como lembrete para qualquer tarefa futura que
   colida com uma regra de maior severidade, não como penalidade sobre esta
   entrega (a decisão técnica em si estava certa e nenhum risco de segurança
   foi introduzido).
4. `TASK.md` BE-02 **avaliado, sem necessidade de alteração de redação**: a
   tarefa já está `Concluído` e a coluna "Status" já documenta a
   implementação correta com a justificativa completa; a coluna "Critério de
   aceite" é registro histórico do que foi solicitado, não a fonte de
   verdade vigente do projeto (essa é `GUARDRAILS.md`, agora corrigida).
   `TASK.md` BE-38 (próxima tarefa a consumir `dicom_remote_ae_title`) não
   referencia a constraint de unicidade em seu próprio critério de aceite —
   não há risco de um leitor futuro herdar a leitura literal errada por essa
   via.

**Veredito**: correção técnica aprovada; processo de exceção formalizado
retroativamente. Nenhuma ação adicional pendente sobre este bloqueio.

- Escalado por: `qa` (durante validação de BE-02).
- Resolvido por: `cto`, via `guardrails-governance`.
- Artefatos alterados por esta resolução: `.md/GUARDRAILS.md` (regra A.5 +
  Log de Alterações), `.md/BLOCKERS.md` (este registro).
- Artefato avaliado e **não** alterado: `.md/TASK.md` (ver item 4 acima).
