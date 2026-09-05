# Imaging Gateway (DICOM) — BE-07 (`TASK.md`)

Gateway de imagem médica de mercado (Orthanc, self-hosted, ADR-003/`GUARDRAILS.md`
item 12) que recebe DICOM do PACS do hospital piloto via C-STORE, converte para
JPEG/PNG de forma assíncrona (nenhum parser/renderizador DICOM construído pelo
core) e notifica a Anti-Corruption Layer (ACL) do core com `RemoteAET` + UIDs
DICOM + referência ao arquivo já convertido no Object Storage (ADR-012). Escopo
desta tarefa, exatamente como decomposto no `TASK.md`: deploy do Orthanc, endpoint
DICOM C-STORE, plugin de conversão JPEG/PNG assíncrona, integração com Object
Storage (BE-08) e notificação ao core (placeholder — a resolução de `tenant_id`
e a persistência em `EXAM_FILE` são BE-38, tarefa futura).

## Onde o Orthanc roda (rede privada, `SDD.md` §7.5)

Mesmo raciocínio de `integration-engine.md` (BE-06): o deploy real (Terraform) já
está provisionado pelo DevOps, fora do escopo desta tarefa —
`infra/modules/network/main.tf` reserva a porta `4242` (DICOM C-STORE do PACS do
hospital, restrita por CIDR, só quando `var.enable_hospital_channel` estiver
habilitado) na mesma subnet `integration` compartilhada com a Integration Engine;
`infra/environments/{staging,production}/main.tf` já define o serviço ECS
`portalmed-*-imaging-gateway` (porta `8042`, API REST/DICOMweb do Orthanc, sem
listener público) com a variável de ambiente `ORTHANC_CORE_NOTIFY_ENDPOINT`
apontando para `https://<domínio>/api/internal/imaging/notify`. Esta tarefa
(BE-07) não altera nenhum arquivo Terraform.

## Decisão de detalhe: configuração 100% via variável de ambiente, sem `orthanc.json`

Diferente da Integration Engine (NextGen Connect, BE-06), que exige uma chamada à
API administrativa REST do produto para provisionar/implantar um canal (por isso
BE-06 tem um script de deploy, `deploy-channel.mjs`), a imagem oficial
`orthancteam/orthanc` suporta nativamente sobrescrever **qualquer** chave do JSON
de configuração via variável de ambiente `ORTHANC__<CHAVE_EM_SCREAMING_SNAKE>`
(confirmado empiricamente durante esta implementação). Como o próprio módulo
`ecs-service` do DevOps já usa o padrão `environment = {...}` para configurar os
demais serviços de borda (`CORE_INGEST_ENDPOINT` na Integration Engine), a
configuração do Orthanc segue o mesmo padrão — nenhum arquivo `orthanc.json`
versionado é necessário. O único artefato de configuração-como-código desta
tarefa é o script Lua (`backend/imaging-gateway/on-stable-study.lua`), porque
lógica de negócio (mesmo que mínima — montar e enviar a notificação) não é
expressável como valor de configuração.

### Variáveis de ambiente do container Orthanc (documentadas aqui para o DevOps consumir na imagem/task definition)

| Variável | Valor usado nesta implementação | Efeito |
|---|---|---|
| `ORTHANC__AUTHENTICATION_ENABLED` | `false` | Sem usuário/senha na API REST — aceitável porque o Orthanc nunca é exposto publicamente (`SDD.md` §7.5/GUARDRAILS.md item 14); acesso mediado pela aplicação core. |
| `ORTHANC__DICOM_AET` | `PORTALMED` | AE Title local do Orthanc (Called AE Title) — o hospital configura o PACS para enviar C-STORE a este AET. |
| `ORTHANC__DICOM_ALWAYS_ALLOW_STORE` | `true` | Aceita C-STORE de qualquer `RemoteAET` sem pré-cadastro de modalidade no Orthanc — a resolução/validação de tenant a partir do `RemoteAET` acontece inteiramente na Aplicação Core (ADR-012, BE-38), nunca no Orthanc. |
| `ORTHANC__STABLE_AGE` | Produção: default do produto (60s); testes: `1` (rápido) | Segundos sem nova instância antes de `OnStableStudy` disparar — o "assíncrono" do pipeline de conversão (RF-07). |
| `ORTHANC__LUA_SCRIPTS` | `["/etc/orthanc/scripts/on-stable-study.lua"]` | Registra o script desta tarefa. |
| `ORTHANC_CORE_NOTIFY_ENDPOINT` | URL do `ImagingGatewayController` (`.../internal/imaging-gateway/notifications`) | **Não** é uma chave nativa do Orthanc (não tem prefixo `ORTHANC__`) — é lida pelo próprio script Lua via `os.getenv` (confirmado: o sandbox Lua do Orthanc expõe a biblioteca `os` padrão). Mesmo nome de variável já reservado por `infra/environments/{staging,production}/main.tf`. |

Plugin **GDCM** (decodificação DICOM estendida — JPEG2000/JPEG-LS/etc., além dos
transfer syntaxes já suportados nativamente) já vem habilitado na imagem
`orthancteam/orthanc:*-full` usada por esta tarefa — nenhuma configuração adicional
necessária; é o mecanismo de "plugin de conversão" do critério de aceite.

## O script Lua (`backend/imaging-gateway/on-stable-study.lua`)

`OnStableStudy(studyId, tags, metadata)` — gatilho assíncrono nativo do Orthanc,
desacoplado da associação DICOM do C-STORE original (RF-07: falha de conversão de
um exame não bloqueia o restante da lista do paciente). Para cada instância do
estudo estável: lê o `RemoteAET` nativo (metadado que o Orthanc já registra em
toda associação C-STORE, sem plugin/customização — ADR-012) e os três UIDs DICOM
padrão via a própria API REST do Orthanc, monta um envelope JSON e faz
`HttpPost` para `ORTHANC_CORE_NOTIFY_ENDPOINT`.

**Achado desta implementação**: o `HttpPost` nativo do Orthanc envia sempre
`Content-Type: application/x-www-form-urlencoded`, mesmo com corpo de texto
JSON — comportamento do produto, não configurável (confirmado empiricamente,
inclusive testando um terceiro argumento na tentativa de forçar
`application/json`, que não é suportado dessa forma e chegou a derrubar o
processo do Orthanc em teste manual isolado). Por isso `ImagingGatewayController`
não usa `@Body()` (que dependeria do parser de content-type padrão do
Express/Nest) — lê `req.rawBody` (habilitado globalmente via
`NestFactory.create(AppModule, { rawBody: true })`, `src/main.ts`) e faz o
próprio `JSON.parse`. Opção inofensiva para o restante das rotas (só adiciona o
buffer bruto, não muda nenhum `@Body()` já em uso).

## A Anti-Corruption Layer (`backend/src/imaging-gateway/`)

Módulo NestJS novo, mesma categoria arquitetural de `src/integration-engine/`
(BE-06): não é um bounded context do `SDD.md` §2.1, mas expõe rotas HTTP reais
que precisam estar ativas desde já — por isso `ImagingGatewayModule` **é**
importado em `AppModule` (mesma exceção documentada lá).

Dois hops HTTP + processamento assíncrono via fila (diferente de BE-06, que só
tinha dois hops síncronos, porque BE-07 precisa isolar a falha de conversão por
instância — RF-07 — e a infraestrutura de fila já existia, preparada por BE-05
especificamente para este consumo):

1. `POST /internal/imaging-gateway/notifications`
   (`ImagingGatewayController`) — recebe a notificação do Lua, valida a forma
   (`parseOrthancStableInstanceNotification`) e **enfileira** um job na fila
   BullMQ `imaging-conversion` (`QueueRegistryService`, BE-05) — responde `202`
   imediatamente, sem esperar a conversão terminar.
2. `ImagingConversionProcessor` (`Worker` BullMQ, ciclo de vida gerenciado via
   `OnModuleInit`/`OnModuleDestroy` — `QueueRegistryService` só gerencia
   `Queue`/produtor, mesma nota já deixada por BE-05) processa cada job: busca a
   prévia JPEG/PNG já convertida pelo Orthanc
   (`GET /instances/{id}/preview`, `ImagingGatewayAclService.fetchConvertedPreview`),
   grava no Object Storage via `ObjectStorageService.putObject` (BE-08,
   consumida sem mudança de assinatura) e publica a notificação canônica (hop 2)
   via `ImagingGatewayAclService.publishToCore` para
   `POST /internal/imaging-ingest` (`CoreImagingIngestPlaceholderController`,
   placeholder — BE-38 substitui este controller inteiro).

### Convenção de chave do Object Storage

`imagens-convertidas/{SOPInstanceUID}.png` — decisão de detalhe do Backend
(nenhum artefato de origem fixa este valor): `SOPInstanceUID` é garantidamente
único em todo o universo DICOM (mesma garantia já aplicada ao índice único
parcial `exam_files_dicom_sop_instance_uid_unique`, BE-02/ADR-012) e 1 instância
DICOM convertida = 1 `EXAM_FILE` — chave natural, sem precisar de nenhum
identificador adicional gerado por esta tarefa.

### JSON canônico de domínio (`CanonicalImagingNotificationMessage`)

```json
{
  "schemaVersion": "1.0",
  "remoteAet": "HOSP_PACS_01",
  "dicom": {
    "studyInstanceUid": "1.2.826.0.1.3680043.8.498.1",
    "seriesInstanceUid": "1.2.826.0.1.3680043.8.498.2",
    "sopInstanceUid": "1.2.826.0.1.3680043.8.498.3"
  },
  "convertedFile": {
    "objectStorageKey": "imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png",
    "contentType": "image/png"
  },
  "convertedAt": "2026-09-04T12:00:00.000Z"
}
```

O ID interno do Orthanc (`orthancInstanceId`) nunca aparece neste payload — só é
usado internamente pela ACL para buscar a prévia (ADR-012 já decidiu que o
modelo de dados de domínio usa UIDs DICOM padrão, não o ID proprietário do
Orthanc).

### Achado corrigido durante esta implementação — `Worker.close()` pode travar o shutdown

`ImagingConversionProcessor.onModuleInit()` cria um `Worker` BullMQ real, que
tenta conectar ao Redis imediatamente. Se o Redis estiver indisponível no
momento do shutdown da aplicação (`app.close()`), `Worker.close()` (sem
argumento) pode aguardar indefinidamente a conexão terminar de tentar
reconectar, travando o encerramento do processo core inteiro — reproduzido
durante esta implementação contra `test/app.e2e-spec.ts` (sem Redis real
disponível). Corrigido chamando `this.worker.close(true)` (`force: true`) em
`onModuleDestroy` — fecha imediatamente mesmo com a conexão presa. Regressão
coberta por `imaging-conversion.processor.spec.ts`.

### Segurança — BE-09 (implementada, `backend/docs/service-api-key-auth.md`)

Mesma nota de `IntegrationEngineController` (BE-06): `GUARDRAILS.md` item 13
exigia credencial de serviço dedicada para o tráfego Imaging Gateway → Core.
BE-09 implementou `@UseGuards(ServiceApiKeyGuard)` (`src/security/`) em
**ambos** os endpoints desta tarefa (`ImagingGatewayController` e
`CoreImagingIngestPlaceholderController`) — o script Lua
(`on-stable-study.lua`) passou a enviar o header `X-Service-Api-Key` via o
terceiro argumento de `HttpPost` (suportado pelo Orthanc desde a versão
1.2.1). Ver `backend/docs/service-api-key-auth.md` para a decisão completa.

## Como os testes validam esta tarefa

Mesma disciplina de infraestrutura real via `testcontainers` já usada por BE-02 a
BE-06/BE-08 — nenhum mock de Redis/S3/Orthanc real quando viável.

- `backend/src/imaging-gateway/*.spec.ts` (unitário, sem rede real) — parsing/
  validação da notificação, tradução para canônico, config, `ImagingGatewayAclService`
  (com `fetch` global como dublê), orquestração do `ImagingConversionProcessor.process`
  (com `ImagingGatewayAclService`/`ObjectStorageService` como dublês) e a
  regressão de `onModuleDestroy`/`close(true)`.
- `backend/test/imaging-gateway/imaging-gateway.e2e-spec.ts` — app NestJS real,
  Redis real (`testcontainers`/BE-05) e S3 real (LocalStack/BE-08); o Orthanc é
  substituído por um stub HTTP mínimo (só o endpoint `/instances/{id}/preview`
  que a ACL consome) — prova o caminho **dentro do processo do core** de ponta a
  ponta (webhook → fila → worker → Object Storage → `/internal/imaging-ingest`),
  incluindo o caso `Content-Type: application/x-www-form-urlencoded` (mesmo
  comportamento do Orthanc real) e, desde BE-09, a bateria positivo/negativo
  do `ServiceApiKeyGuard` (header ausente/vazio/incorreto/correto) para os
  dois endpoints.
- `backend/test/imaging-gateway/orthanc-imaging-gateway.e2e-spec.ts` — o
  Orthanc **real** (`orthancteam/orthanc:26.8.2-full`) via `testcontainers`,
  numa rede Docker dedicada (`testcontainers` `Network`): um arquivo DICOM
  sintético (porém válido, `dicom-test-fixture.ts`) é enviado via **C-STORE
  real** usando o toolkit de mercado `dcm4che` (`storescu`/`json2dcm`,
  `dcm4che/dcm4che-tools:5.35.1` — mesmo racional de ADR-002/ADR-003 de usar
  ferramental de mercado em vez de implementar o protocolo DICOM à mão, agora
  aplicado ao ferramental de teste) → Orthanc real aceita, registra o
  `RemoteAET`, fica estável → o script Lua **real** (o mesmo arquivo versionado)
  dispara e notifica o app de teste via `host.docker.internal`/`host-gateway`
  (mesmo mecanismo de `hl7v2-channel.e2e-spec.ts`, BE-06) → fila real → worker
  busca a prévia **de fato convertida pelo Orthanc** → S3 real → placeholder.
  Verifica inclusive a assinatura de bytes PNG do arquivo gravado, provando que
  a conversão de fato aconteceu (não é um stub).

Nenhuma mudança foi necessária em `.github/workflows/backend-ci.yml` — mesmo
raciocínio de `integration-engine.md`/`object-storage.md` (Docker já disponível
no runner `ubuntu-latest`); o tempo do job aumenta em função do pull das imagens
do Orthanc (`-full`, ~890MB) e do `dcm4che-tools` (~310MB).

## Escopo deliberadamente não incluído (tarefas futuras)

- **BE-38** — resolução de `tenant_id` a partir do `RemoteAET` (casando contra
  `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, ADR-012) e persistência
  dos UIDs DICOM + chave do Object Storage em `EXAM_FILE`.
  `CoreImagingIngestPlaceholderController` existe só para provar que a ACL
  publica de ponta a ponta.
- Canal FHIR/DICOMweb (WADO-RS) para o visualizador nativo da Release 2
  (RF-S02) — o Orthanc já guarda o DICOM original e expõe DICOMweb nativamente
  (ADR-003), mas nenhum endpoint foi exposto para consumo externo nesta tarefa.
- Qualquer redundância/HA operacional do Orthanc em produção (fora do escopo de
  código desta tarefa — responsabilidade do DevOps).
