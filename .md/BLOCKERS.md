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

---

## Bloqueio 005 — 2026-09-04

- Reportado por: devsecops (auditoria completa de segurança do Lote 2 —
  Integração com Sistemas do Hospital, `SECURITY-REVIEW.md` "Lote 2")
- Escalado para: backend (correção de código); cto (registro em paralelo,
  Seção 7 de `SECURITY-REVIEW.md` "Lote 2" — sugestão de reforço de
  processo/`GUARDRAILS.md` para log de dado sensível, não pré-requisito do
  bloqueio já aplicado por este agente)
- Artefato/trecho afetado: `backend/src/integration-engine/
  core-ingest-placeholder.controller.ts` (linhas 43-45)
- Descrição: o endpoint `POST /internal/ingest`
  (`CoreIngestPlaceholderController.receive`, deliverável de BE-06) loga
  via `this.logger.log(...JSON.stringify(body))` o `CanonicalExamResultMessage`
  inteiro — `patient.identifier`/`patient.name` (identificação direta do
  titular) + `exam.code`/`exam.name`/`result.value`/`result.unit`
  (resultado clínico, dado sensível de saúde, LGPD Art. 11) — em nível
  `log` (não `debug`), em todo request real a este endpoint. O caminho já
  é exercitado de ponta a ponta pela própria suíte do projeto
  (`hl7v2-channel.e2e-spec.ts`, engine real via `testcontainers`), não é
  uma hipótese teórica. Nenhuma camada compensatória equivalente à do
  banco protege este log: `infra/modules/ecs-service/main.tf` cria o
  `aws_cloudwatch_log_group` sem `kms_key_id` dedicado (só criptografia
  gerenciada padrão da AWS) e com retenção padrão de 30 dias; nenhum
  controle de acesso equivalente ao escopo restrito da role de banco
  `portalmed_app`. O restante do próprio módulo já demonstra a disciplina
  correta (loga só identificador técnico, nunca dado do paciente:
  `IntegrationEngineController`, `ImagingGatewayController`,
  `ImagingConversionProcessor`) — esta é a única exceção, sem
  justificativa registrada. Nenhum teste cobre/impede o conteúdo deste
  log. Detalhamento completo, incluindo trecho de código e análise de
  severidade, em `SECURITY-REVIEW.md` "Lote 2", Seção 4 (`SEC-BUG-002`).
- Impacto se não resolvido: bloqueia o deploy deste lote (achado de
  severidade Alta, compliance obrigatório de LGPD — Art. 6º, III,
  minimização de dado, aplicado à categoria de dado sensível de saúde,
  Art. 11). Qualquer deploy real com tráfego HL7 do hospital piloto antes
  da correção grava nome, identificador e resultado clínico do paciente
  em texto plano no CloudWatch Logs, acessível a um escopo de pessoas mais
  amplo do que o já restrito à role de aplicação do banco, sem
  criptografia de coluna nem RLS equivalentes às garantias já validadas
  para o PostgreSQL (Lotes 1/3).
- Sugestão (não prescritiva): em `core-ingest-placeholder.controller.ts`,
  trocar o log de `JSON.stringify(body)` por um log que cite apenas campos
  não-identificáveis (`schemaVersion`, `sourceSystem`, `messageType`,
  `messageControlId`) — mesmo nível de detalhe já usado por
  `IntegrationEngineController` para o mesmo fluxo. Se observabilidade do
  conteúdo completo for genuinamente necessária, considerar nível `debug`
  e mascaramento de `patient.identifier`/`patient.name`, com decisão
  registrada explicitamente. Recomenda-se teste de regressão (spy no
  logger, assertando que `patient`/`result` não aparecem na mensagem
  logada). Correção isolada, não depende de BE-24.
- Status: **Resolvido**

### Nota factual (backend, 2026-09-05) — correção aplicada, aguardando revalidação do DevSecOps

Correção de código aplicada em `backend/src/integration-engine/
core-ingest-placeholder.controller.ts` (BE-06): o log deixou de serializar
`JSON.stringify(body)` inteiro e agora cita só metadado técnico
não-identificável (`schemaVersion`, `sourceSystem`, `messageType`,
`messageControlId`), mesmo nível de detalhe já usado por
`IntegrationEngineController`. `lastReceivedMessage` (estado interno,
nunca escrito em log) permanece inalterado — continua guardando a
mensagem completa só para a suíte de teste inspecionar
(`getLastReceivedMessage()`). Teste de regressão novo (spy em
`Logger.prototype.log`) adicionado a
`test/integration-engine/integration-engine.e2e-spec.ts`.

Verificado também `CoreImagingIngestPlaceholderController` (BE-07, mesmo
padrão de placeholder), conforme pedido: `CanonicalImagingNotificationMessage`
não carrega dado pessoal identificável (confirmado pelo próprio DevSecOps
nesta auditoria, Seção 3/4 de `SECURITY-REVIEW.md` "Lote 2"), então BE-07
não gerava o mesmo achado de compliance — mas tinha o mesmo anti-padrão de
`JSON.stringify(body)` irrestrito, corrigido junto por ser a mesma causa
raiz (log só com `schemaVersion`, `remoteAet`, `dicom.sopInstanceUid`,
`convertedFile.contentType`, `convertedAt`), com teste de regressão
equivalente em `test/imaging-gateway/imaging-gateway.e2e-spec.ts`.

Suíte completa reexecutada após a correção: `npm run build` (limpo),
`npm run lint` (limpo), `npm test` (192 passando), `npm run test:e2e` (291
passando, inclui os 2 testes de regressão novos), `npm run test:tenant-isolation`
(158 passando, sem alteração).

Detalhe completo da correção em `TASK.md` §3, coluna Status de BE-06 e
BE-07 (nota de correção pós-implementação, 2026-09-05).

**Este registro permanece com Status `Aberto`** — cabe ao DevSecOps
revalidar a correção (leitura de código + reexecução independente da
suíte, mesmo padrão já usado para `SEC-BUG-001`/Bloqueio 004 no Lote 3)
antes de marcar como `Resolvido`. Nenhuma alteração de status feita pelo
Backend.

### Resolução (devsecops, 2026-09-05)

**Correção verificada e confirmada, sem regressão.** Revalidação pontual e
independente (não uma reauditoria completa do lote — as demais 3 skills já
haviam rodado na auditoria original sem outro achado bloqueante, só os
débitos não bloqueantes já registrados `SEC-DEBT-003`/`QA-DEBT-017`, que
continuam válidos e não foram reavaliados) sobre a correção que o Backend
aplicou em 2026-09-05.

**Verificação por leitura direta de código**:

1. `core-ingest-placeholder.controller.ts` (BE-06) lido linha a linha: o
   único `this.logger.log(...)` cita só `schemaVersion`, `sourceSystem`,
   `messageType`, `messageControlId` — nenhum PII/dado clínico. `patient`/
   `exam`/`result` não aparecem fora da atribuição a `lastReceivedMessage`.
2. `core-imaging-ingest-placeholder.controller.ts` (BE-07) lido linha a
   linha: mesmo padrão — log cita só `schemaVersion`, `remoteAet`,
   `dicom?.sopInstanceUid`, `convertedFile?.contentType`, `convertedAt`,
   igualmente não-PII.
3. Grep por `Logger.log(JSON.stringify`/`console.*(JSON.stringify` em todo
   `backend/src/`: nenhuma outra ocorrência do anti-padrão.
4. `lastReceivedMessage`/`getLastReceivedMessage()`: uso restrito aos dois
   controllers e aos arquivos de teste e2e via `app.get(...)` do módulo
   Nest de teste — nenhum `@Get`/endpoint de debug expõe esse estado por
   HTTP.
5. Os dois testes de regressão `[SEC-BUG-002]` lidos por completo: ambos
   espionam `Logger.prototype.log`, disparam request HTTP real, e afirmam
   ausência de `patientIdentifier`/`patientName`/`resultValue`/`examName`
   (BE-06) e de `"dicom"`/`"convertedFile"` serializados (BE-07) —
   regressão ao `JSON.stringify(body)` faria essas asserções falharem.

**Reexecução independente da suíte** (Docker disponível neste ambiente):

- `npx vitest run --config ./vitest.config.e2e.ts
  test/integration-engine/integration-engine.e2e-spec.ts
  test/imaging-gateway/imaging-gateway.e2e-spec.ts` → **25/25 testes
  passando**, incluindo os dois blocos `[SEC-BUG-002]`.

**Veredito**: `SEC-BUG-002` corrigido nos dois controllers (BE-06 e BE-07,
mesma causa raiz), com teste de regressão permanente e funcional, sem
exposição indireta via estado interno em memória. Detalhe completo em
`SECURITY-REVIEW.md` "Lote 2", Seção 9. Veredito final do Lote 2:
**Aprovado com débito registrado** (`SEC-DEBT-003`, `QA-DEBT-017`, ambos
com dono e prazo, nenhum bloqueante).

## Bloqueio 004 — 2026-09-03

- Reportado por: devsecops (auditoria completa de segurança do Lote 3 —
  Segurança de Multi-tenancy, `SECURITY-REVIEW.md` "Lote 3")
- Escalado para: backend (correção de código); cto (registro em paralelo,
  Seção 7 de `SECURITY-REVIEW.md` "Lote 3" — relevância estratégica de
  processo, não pré-requisito do bloqueio já aplicado por este agente)
- Artefato/trecho afetado: `backend/migrations/1788336900000_create-app-
  database-role.ts` (linhas 64-68), `backend/docs/tenant-guard-and-rls.md`
  (linhas 177-183) / `GUARDRAILS.md` regras D.18 e F.28 (ADR-009)
- Descrição: a migration que concede privilégio de banco à role de runtime
  `portalmed_app` (`grantOnTables`, `[...DOMAIN_TABLES]`,
  `['SELECT', 'INSERT', 'UPDATE', 'DELETE']`) inclui `audit_events` e
  `consent_records` sem nenhuma exclusão — violando diretamente
  `GUARDRAILS.md` D.18 ("a role de banco usada pela aplicação nunca recebe
  `GRANT` de `UPDATE`/`DELETE` [em `AUDIT_EVENT`], apenas `INSERT`/`SELECT`,
  ADR-009") e F.28 ("`CONSENT_RECORD` e o log de auditoria são registros
  append-only por design — PROIBIDO qualquer... operação de UPDATE/DELETE").
  As migrations que criam as duas tabelas já documentavam a exigência e
  deferiam a correção para BE-29/BE-19 respectivamente, mas nenhuma das duas
  tarefas foi concluída até o fechamento deste lote, e o deferimento não
  seguiu o processo de exceção de `GUARDRAILS.md` regras 37-39 (nenhuma
  entrada em `BLOCKERS.md` antes desta, nenhuma aprovação do CTO no Log de
  Alterações). Agravante: `backend/docs/tenant-guard-and-rls.md` afirma que
  a exceção de `audit_events` já está em vigor — afirmação factualmente
  incorreta contra o estado atual da migration. Nenhuma camada compensatória
  existe hoje (RLS só restringe linhas por tenant, não tipo de operação; o
  hash chain de ADR-009 não está implementado); nenhum teste cobre a
  restrição de privilégio. Fundamento de compliance obrigatório: RN-08
  (`AUDIT_EVENT`, evidência para fiscalização LGPD) e RN-02 (`CONSENT_RECORD`,
  consentimento específico de dado de saúde, Art. 11, I). Detalhamento
  completo, incluindo trecho de código e análise de severidade, em
  `SECURITY-REVIEW.md` "Lote 3", Seção 2 (`SEC-BUG-001`).
- Impacto se não resolvido: bloqueia o deploy deste lote (achado de
  severidade Alta, dentro da autoridade de bloqueio do DevSecOps). Se a
  migration rodar contra qualquer ambiente real antes da correção, a role de
  runtime da aplicação já nasce com privilégio que permite alterar/apagar
  eventos de auditoria e registros de consentimento dentro do próprio
  tenant — exatamente o cenário que ADR-009/RN-08/RN-02 exigem impedir no
  nível de banco, não só de aplicação.
- Sugestão (não prescritiva): em `1788336900000_create-app-database-role.ts`,
  excluir `audit_events`/`consent_records` do `grantOnTables` genérico de
  `UPDATE`/`DELETE` (conceder `SELECT`/`INSERT` a essas duas tabelas
  separadamente) ou adicionar `revokeOnTables` subsequente restrito a
  `['UPDATE', 'DELETE']` para as duas — não depende de BE-19/BE-29 completas
  (hash chain/lógica de consentimento seguem escopo dessas tarefas; só a
  restrição de privilégio precisa acompanhar a migration que já concede
  privilégio à role, BE-03). Adicionar teste de regressão permanente
  (`has_table_privilege('portalmed_app', 'audit_events'/'consent_records',
  'UPDATE'/'DELETE')` = `false`) e corrigir a redação de
  `tenant-guard-and-rls.md`.
- Status: **Resolvido**

### Resolução (devsecops, 2026-09-04)

**Correção verificada e confirmada, sem regressão.** Revalidação pontual e
independente (não uma reauditoria completa do lote — as demais 4 skills já
haviam rodado na auditoria original sem outro achado) sobre a correção que
o Backend aplicou em 2026-09-03 (nota de correção pós-implementação em
`TASK.md`, BE-03/BE-04).

**Verificação por leitura direta de código**:

1. `backend/migrations/1788336900000_create-app-database-role.ts` lida
   linha a linha: `DOMAIN_TABLES` particionada em `APPEND_ONLY_TABLES`
   (`audit_events`, `consent_records` — recebem só `SELECT`/`INSERT`) e
   `FULL_PRIVILEGE_DOMAIN_TABLES` (as 11 tabelas restantes, mantêm
   `SELECT`/`INSERT`/`UPDATE`/`DELETE`). `up()`/`down()` simétricos e
   corretos. Nenhuma regressão de escopo oposto.
2. `backend/docs/tenant-guard-and-rls.md` corrigido — não afirma mais uma
   exceção que não existia.
3. `backend/test/database/tenant-guard-and-rls.e2e-spec.ts`, bloco
   `[SEC-BUG-001]`: `has_table_privilege` confirma `UPDATE`/`DELETE` =
   `false` nas 2 tabelas append-only e privilégio completo mantido nas 11
   demais; tentativa real de `UPDATE`/`DELETE`/`INSERT`/`SELECT` via
   `pg.Client` cru como `portalmed_app` — `UPDATE`/`DELETE` rejeitados com
   `permission denied` do próprio Postgres (não RLS, não validação de
   aplicação).
4. `backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts`:
   reparticionamento em `MUTATION_CAPABLE_TABLES`/`APPEND_ONLY_TABLES`
   coerente nas Camadas 1 e 3; Camada 2 (superusuário) corretamente
   inalterada (superusuário sempre ignora `GRANT`, do mesmo jeito que já
   ignora RLS).
5. Grep por `audit_events`/`consent_records` em `backend/migrations/` e
   `backend/src/database/`: nenhum outro caminho concede privilégio
   equivalente a essas tabelas.

**Reexecução independente da suíte** (ambiente com Docker disponível, não
apenas leitura de código nem confiança no relato do Backend):

- `tenant-guard-and-rls.e2e-spec.ts` → 48/48 testes passando (inclui o
  bloco `[SEC-BUG-001]`).
- `npm run test:tenant-isolation` → 158/158 testes passando (mesma
  contagem reportada pelo Backend).
- `npm run test:e2e` (suíte completa) → 268/268 testes passando (Backend
  reportou 264; diferença de 4 não indica falha — suíte inteira verde, sem
  regressão).

**Veredito**: `SEC-BUG-001` corrigido no nível de banco (não apenas de
aplicação), com teste de regressão permanente em duas suítes
independentes, sem regressão de escopo nas 11 tabelas restantes. Detalhe
completo em `SECURITY-REVIEW.md` "Lote 3", Seção 9 (revalidação). Veredito
final de DevSecOps para o Lote 3: **Aprovado**.

- Escalado por: `devsecops` (auditoria completa de segurança do Lote 3).
- Resolvido por: `devsecops`, via revalidação pontual (leitura de código +
  reexecução independente das suítes e2e/tenant-isolation).
- Artefatos alterados por esta resolução: `.md/SECURITY-REVIEW.md` (Lote 3,
  Seção 9), `.md/BLOCKERS.md` (este registro). Nenhum código alterado por
  este agente — a correção de código já havia sido feita pelo Backend em
  2026-09-03.
