# ADR-012: Rastreabilidade DICOM em EXAM_FILE e Resolução de tenant_id via AE Title Dedicado no Imaging Gateway

- **Data**: 2026-09-02
- **Status**: Accepted
- **Deciders**: Software Architect (resolução de bloqueio, não requer novo Gate 2 —
  ver `.claude/agents/software-architect.md`, seção "Recebe reabertura de")
- **Tags**: architecture, imaging, dicom, multi-tenancy, data-model, process-gap

> **Origem**: `BLOCKERS.md`, Bloqueio 002 (2026-09-02) — reportado por
> `tech-lead` durante a decomposição do `TASK.md` (BE-07, BE-22), escalado a
> `software-architect`. Este ADR resolve as duas lacunas pontuais sinalizadas
> no modelo de dados/fluxo do Imaging Gateway (ADR-003); não reabre nem
> substitui nenhuma outra decisão já aceita no `SDD.md`.

## Contexto e Problema

ADR-003 estabeleceu o Orthanc como Imaging Gateway (gateway DICOM de mercado),
mas duas lacunas estruturais do modelo de dados/fluxo não foram fechadas
naquela decisão, ambas identificadas pelo Tech Lead ao decompor o `TASK.md`:

1. **Lacuna A — rastreabilidade `EXAM_FILE` ↔ recurso Orthanc**: `EXAM_FILE`
   (`SDD.md` §5) armazena apenas `object_storage_key`/`tipo_arquivo`, sem
   nenhum campo que correlacione o arquivo convertido (JPEG/PNG) ao
   `StudyInstanceUID`/`SeriesInstanceUID`/`SOPInstanceUID` do DICOM original
   mantido no Orthanc. Isso é necessário para: (i) o "monitoramento dedicado
   por exame" já exigido por RF-07/`SDD.md` §6.1 (hoje o pipeline de
   conversão só é monitorável por serviço, não por exame individual); e (ii)
   RF-S02 (Release 2) reaproveitar o DICOM original "sem retrabalho",
   conforme a própria justificativa de ADR-003 — sem essa correlação, a
   Release 2 precisaria reconstruir a associação exame ↔ estudo DICOM do zero.
2. **Lacuna B — atribuição de `tenant_id` a eventos do Imaging Gateway**:
   `INTEGRATION_ENDPOINT_CONFIG` (`SDD.md` §5) modela apenas
   `canal_integration_gateway` (HL7/FHIR), sem campo equivalente para o lado
   DICOM. O Orthanc é agnóstico de tenant por natureza (não tem conceito
   nativo de "cliente"/"hospital"), e o diagrama de sequência do `SDD.md` §2.2
   (`ORT->>CORE: Notifica conclusão da conversão`) não explicitava como
   `tenant_id` chegava a esse ponto — risco real de a implementação resolver
   isso por atribuição implícita/hardcoded (ex.: "único tenant ativo no MVP"
   fixo em código), o que a regra de multi-tenancy do `TASK.md` (Seção 1.3)
   proíbe.

## Decision Drivers

- RF-07/`SDD.md` §6.1 já promete monitoramento por exame do pipeline de
  conversão DICOM — sem correlação estrutural, essa promessa não tem suporte
  no modelo de dados.
- RF-S02 (Release 2) depende de reaproveitar o DICOM original sem retrabalho
  — premissa central da escolha do Orthanc em ADR-003 — o que exige que a
  referência ao recurso DICOM já exista desde o MVP, não seja construída
  depois.
- Multi-tenancy lógica (ADR-004) exige `tenant_id` explícito em toda entidade
  e nenhuma query/atribuição sem contexto de tenant — o Imaging Gateway não
  pode ser uma exceção silenciosa a essa regra só porque o Orthanc, como
  produto, não tem conceito de tenant.
- Solução não pode exigir que o Orthanc passe a ter conhecimento de tenant
  (contrariaria a escolha de um produto de mercado agnóstico, ADR-003, e
  acoplaria um componente de borda a dado de negócio que não é dele).
- MVP atende um único hospital piloto (P1), mas a solução não pode fechar a
  porta para hospital #2+ (Release 2, RF-C02) sem retrabalho estrutural — o
  mesmo princípio já aplicado a ADR-004.

## Considered Options

### Lacuna A — rastreabilidade DICOM

1. **Adicionar `StudyInstanceUID`/`SeriesInstanceUID`/`SOPInstanceUID` como
   campos em `EXAM_FILE`** — identificadores DICOM padrão (protocolo, não
   proprietários do Orthanc), suficientes para correlacionar o arquivo
   convertido ao estudo original e para qualquer consulta futura à API do
   Orthanc (que suporta lookup por UID).
2. **Adicionar o ID interno de recurso do Orthanc** (`orthanc_study_id`,
   próprio da API REST do Orthanc, não é um UID DICOM padrão) em vez dos UIDs
   DICOM.
3. **Nenhuma correlação nova** (status quo) — rejeitada, deixa RF-07/§6.1 e
   RF-S02 sem suporte estrutural, exatamente a lacuna reportada.

### Lacuna B — atribuição de tenant_id

1. **Orthanc com múltiplos AE Titles locais, um por tenant** (Called AE
   Title distinto por hospital) — exigiria que uma única instância Orthanc
   escutasse com múltiplos AE Titles simultâneos, o que não é o modelo nativo
   de operação de uma instância Orthanc (haveria apenas um `DicomAet` local
   por instância).
2. **AE Title de origem (Calling AE Title/`RemoteAET`) dedicado por tenant,
   configurado no PACS de cada hospital** — o Orthanc já registra nativamente
   o `RemoteAET` (AE Title de quem enviou o C-STORE) como metadado de todo
   estudo/instância recebida, sem exigir plugin novo. A Aplicação Core
   resolve `tenant_id` casando esse `RemoteAET` contra um novo campo em
   `INTEGRATION_ENDPOINT_CONFIG`.
3. **Uma instância Orthanc por tenant** (isolamento físico) — resolveria a
   ambiguidade de origem sem depender de metadado de associação DICOM, mas
   contradiz a escolha de multi-tenancy **lógica** já decidida e aprovada em
   ADR-004/Gate 2 para o restante da arquitetura, introduzindo inconsistência
   de padrão e custo operacional (uma instância a mais por hospital) sem
   necessidade demonstrada.
4. **Atribuição implícita/hardcoded** (status quo/dívida provisória do
   `TASK.md`) — rejeitada como solução definitiva; é exatamente o risco que
   este ADR fecha (viola a regra de multi-tenancy do `TASK.md` Seção 1.3).

## Decision Outcome

**Lacuna A**: Opção 1 — `EXAM_FILE` ganha `dicom_study_instance_uid`,
`dicom_series_instance_uid`, `dicom_sop_instance_uid`, todos nullable (só
aplicáveis a arquivos de origem DICOM). Optou-se pelos UIDs DICOM padrão do
protocolo (não pelo ID interno proprietário do Orthanc), porque são a
referência de mais longo prazo — sobrevivem a uma eventual troca de gateway
DICOM no futuro, e a API REST do Orthanc já suporta consulta por esses UIDs
quando o Backend Developer precisar buscar o recurso original (ex.: para
RF-S02 na Release 2). Cada instância DICOM convertida gera um `EXAM_FILE`,
por isso o SOP Instance UID (granularidade de instância) é o identificador
mais específico; Study/Series UID acompanham para permitir agrupamento sem
nova consulta ao Orthanc.

**Lacuna B**: Opção 2 — `INTEGRATION_ENDPOINT_CONFIG` ganha
`dicom_remote_ae_title`, o AE Title que o PACS de cada hospital é configurado
para usar como origem ao enviar DICOM ao Imaging Gateway. O Orthanc **não**
ganha nenhum conceito de tenant — continua um produto de mercado genérico,
consistente com ADR-003. É a **Aplicação Core** que resolve `tenant_id`,
casando o `RemoteAET` (metadado nativo que o Orthanc já registra em toda
associação DICOM recebida, sem exigir plugin/customização do produto) contra
`INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, no momento em que recebe
a notificação de conclusão de conversão (`SDD.md` §2.2, atualizado). Essa
resolução é explícita no diagrama de sequência — nunca mais um ponto
implícito do fluxo.

### Mudanças de arquitetura decorrentes

- **`EXAM_FILE` (`SDD.md` §5)** ganha os três campos DICOM (nullable),
  descritos acima.
- **`INTEGRATION_ENDPOINT_CONFIG` (`SDD.md` §5)** ganha `dicom_remote_ae_title`.
- **`SDD.md` §2.2 (diagrama de sequência)** explicitado: Orthanc propaga
  `RemoteAET` + UIDs DICOM na notificação a `CORE`; `CORE` resolve
  `tenant_id` a partir desse `RemoteAET`, antes de persistir/atualizar o
  status do exame.
- **`SDD.md` §6.1**: risco "pipeline de conversão DICOM falha isoladamente"
  atualizado — a correlação agora viabiliza estruturalmente o monitoramento
  por exame que já era prometido.
- **`SDD.md` §7.1**: bullet de autenticação de integração externa
  (Integration Gateway/Imaging Gateway) detalhado com o mecanismo concreto do
  lado DICOM.

### Positive Consequences

- Fecha as duas lacunas apontadas pelo Tech Lead sem exigir mudança em
  ADR-003 (Orthanc continua a escolha correta) nem em ADR-004 (multi-tenancy
  continua lógica, sem exceção para o Imaging Gateway).
- Usa exclusivamente identificadores/metadados que o protocolo DICOM e o
  Orthanc já produzem nativamente (UIDs padrão, `RemoteAET`) — nenhum plugin
  novo, nenhuma customização de produto de mercado, consistente com a
  premissa "sem retrabalho" de ADR-003 e com o `build-vs-buy` já aprovado no
  Gate 2.
- `tenant_id` deixa de ser um ponto implícito do fluxo — passa a ser sempre
  resolvido de forma explícita e auditável (o mesmo padrão de rigor já
  aplicado ao restante da arquitetura, ADR-004), removendo a dívida técnica
  provisória sinalizada no `TASK.md` (BE-07, BE-22).
- Generaliza corretamente para hospital #2+ (Release 2, RF-C02): basta uma
  nova linha em `INTEGRATION_ENDPOINT_CONFIG` com o `dicom_remote_ae_title`
  do novo hospital — nenhuma mudança estrutural adicional.

### Negative Consequences

- Depende de disciplina operacional na configuração do PACS de cada hospital
  (garantir que o AE Title de origem configurado no lado do hospital
  corresponda exatamente ao `dicom_remote_ae_title` cadastrado) — mesmo tipo
  de dependência operacional já aceito para o canal HL7/FHIR
  (`canal_integration_gateway`), não é um risco novo de categoria.
- Se dois hospitais, por erro de configuração externa ao sistema, usarem o
  mesmo AE Title de origem, a resolução de tenant falha silenciosamente
  atribuindo ao tenant errado — mitigação: validação de unicidade de
  `dicom_remote_ae_title` por tenant fica registrada aqui como requisito não
  funcional para o Backend Developer (constraint `UNIQUE`), e detecção de
  `RemoteAET` desconhecido deve cair em fila de exceção/alerta, nunca em
  atribuição best-effort — detalhamento tático fica para o Backend
  Developer/DevSecOps.
- Os três campos DICOM em `EXAM_FILE` ficam nulos para arquivos de origem não
  DICOM (laboratorial/anatomopatológico) — aceito conscientemente, mesmo
  padrão já usado em outras entidades do `SDD.md` (ex.: campos opcionais em
  `AUDIT_EVENT`).

## Pros and Cons of the Options

### Lacuna A — UIDs DICOM padrão em EXAM_FILE ✅ Chosen

- ✅ Identificador de protocolo, sobrevive a troca futura de gateway
- ✅ Suficiente para consulta à API do Orthanc quando necessário
- ❌ Não é o ID interno mais rápido de usar diretamente na API REST do
  Orthanc (mitigado: Backend Developer pode cachear o ID interno como
  otimização, sem mudança de modelo)

### Lacuna A — ID interno do Orthanc

- ✅ Acesso direto mais rápido via API REST do Orthanc
- ❌ Proprietário do produto — amarra o modelo de dados a um gateway
  específico, contrariando o racional de portabilidade que já motivou o uso
  de UIDs padrão em outras integrações (ADR-002, ACL)

### Lacuna B — Calling AE Title (RemoteAET) por tenant ✅ Chosen

- ✅ Usa metadado nativo do Orthanc, sem plugin/customização
- ✅ Orthanc permanece agnóstico de tenant (consistente com ADR-003)
- ✅ Generaliza para múltiplos hospitais sem mudança estrutural
- ❌ Depende de configuração correta do lado do PACS do hospital (mitigado
  por constraint de unicidade + alerta em `RemoteAET` desconhecido)

### Lacuna B — múltiplos AE Titles locais no Orthanc

- ❌ Não é o modelo nativo de operação de uma instância Orthanc

### Lacuna B — uma instância Orthanc por tenant

- ❌ Contradiz o padrão de multi-tenancy lógica já aprovado (ADR-004),
  introduz custo operacional por hospital sem necessidade demonstrada

## Links

- Relacionado: ADR-003 (Orthanc como Imaging Gateway), ADR-004
  (multi-tenancy lógica)
- `SDD.md`, Seções 2.2, 5, 6.1, 7.1
- `BLOCKERS.md`, Bloqueio 002
- `PRD-TECNICO.md`, RF-07, RF-S02
- `TASK.md`, BE-07, BE-22, Seção 1.3 (regra de multi-tenancy), Seção 6
