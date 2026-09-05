# Credencial de serviço (API key) — BE-09 (`TASK.md`)

Fecha a lacuna de segurança deixada deliberadamente aberta por BE-06/BE-07:
`GUARDRAILS.md` item 13 exige que a comunicação Integration Gateway/Imaging
Gateway → Core seja "autenticada por credencial de serviço dedicada — nunca
credencial de usuário final". Critério de aceite (`TASK.md` §3, linha
`BE-09`): "Endpoint interno `/internal/ingest` e endpoint de notificação de
conversão só aceitam requisição autenticada por API key de serviço [...];
canal não exposto à internet pública (§7.5)".

## Decisão de detalhe: os 4 endpoints internos recebem o guard, não só 2

O texto do critério de aceite nomeia literalmente dois endpoints
(`/internal/ingest` e "o endpoint de notificação de conversão"). Existem,
na prática, **4** endpoints internos que hoje aceitam este tráfego, em dois
hops por integração:

| Integração | Hop 1 (ACL, recebe do sistema externo) | Hop 2 (placeholder do core) |
|---|---|---|
| Integration Engine (BE-06) | `POST /internal/integration-engine/messages` (`IntegrationEngineController`) | `POST /internal/ingest` (`CoreIngestPlaceholderController`) |
| Imaging Gateway (BE-07) | `POST /internal/imaging-gateway/notifications` (`ImagingGatewayController`) | `POST /internal/imaging-ingest` (`CoreImagingIngestPlaceholderController`) |

Decisão tomada nesta tarefa: **os 4 recebem o mesmo guard
(`@UseGuards(ServiceApiKeyGuard)`)**, não só os dois hop-1 (ACL) ou só os
dois hop-2 (placeholder nomeados literalmente pelo critério de aceite).
Motivo, documentado explicitamente (não uma generalização silenciosa além
do critério de aceite, `TASK.md` §1.1):

1. **O próprio código de BE-06/BE-07 já registrava o risco concreto**: o
   comentário de segurança de `IntegrationEngineController` (antes desta
   tarefa) dizia textualmente que "o próprio endpoint do core, por estar
   atrás do mesmo domínio/ALB que a SPA, tecnicamente aceita requisição de
   qualquer origem até BE-09 fechar essa lacuna" — ou seja, `/internal/ingest`
   e `/internal/imaging-ingest` **não têm isolamento de rede próprio**
   diferente dos endpoints hop-1: são servidos pelo mesmo processo/ALB que
   atende a SPA pública. Proteger só os dois hop-1 deixaria os dois hop-2
   alcançáveis publicamente sem nenhuma autenticação, contornando a ACL
   (normalização/validação de forma) por completo — exatamente o risco que
   `GUARDRAILS.md` item 13 pede para fechar.
2. **Leitura literal do critério de aceite também aponta para os hop-2**:
   `/internal/ingest` é nomeado explicitamente; "o endpoint de notificação
   de conversão" descreve com mais precisão `/internal/imaging-ingest`
   (que carrega `CanonicalImagingNotificationMessage`, com
   `convertedFile`/`convertedAt` — a notificação **de que a conversão
   aconteceu**) do que `/internal/imaging-gateway/notifications` (que
   recebe o aviso de instância **estável**, anterior à conversão, e apenas
   enfileira o job).
3. **Defesa em profundidade barata**: mesmo se o isolamento de rede dos
   hop-2 fosse reforçado futuramente (ex.: um listener interno separado),
   não há custo relevante em manter os 4 endpoints com o mesmo padrão de
   autenticação — divergir security posture entre hop 1 e hop 2 da mesma
   integração seria uma inconsistência sem benefício.

Consequência prática: `IntegrationEngineAclService.publishToCore` e
`ImagingGatewayAclService.publishToCore` (que chamam os dois hop-2, hoje
dentro do mesmo processo) passam a anexar o mesmo header de saída — ver
"Como cada emissor se autentica", abaixo.

## O guard (`backend/src/security/`)

Infraestrutura transversal nova, mesma categoria de `src/database/`/
`src/redis/`/`src/queue/`/`src/object-storage/` (sem rota HTTP própria, não
importada em `AppModule`, consumida via `imports: [SecurityModule]` pelos
módulos que precisam) — não é um bounded context do `SDD.md` §2.1.

- `service-api-key-config.ts` — `loadServiceApiKeyConfig(env)`, mesmo
  padrão de `loadRedisConfig`/`loadIntegrationEngineConfig`: env
  `INTERNAL_SERVICE_API_KEY`, default de desenvolvimento **explicitamente
  provisório** (`portalmed_service_api_key_dev_only_change_me`, mesmo
  padrão já aceito de `APP_DB_ROLE_PASSWORD`) — em produção o valor real
  vem do secret manager (`SDD.md` §7.5). Ver "Nota de correção
  pós-implementação" abaixo sobre o nome desta variável.
- `service-api-key.tokens.ts` — `SERVICE_API_KEY_CONFIG` (símbolo de DI) e
  `SERVICE_API_KEY_HEADER = 'x-service-api-key'` (nome do header, constante
  única compartilhada entre quem valida e quem envia).
- `service-api-key.guard.ts` — `ServiceApiKeyGuard implements CanActivate`:
  lê `request.headers[SERVICE_API_KEY_HEADER]`; ausente/vazio/incorreto →
  `UnauthorizedException` (401), mensagem genérica ("Credencial de serviço
  ausente ou inválida."), **sem distinguir o motivo** — não vaza nenhuma
  informação sobre o valor esperado.
- `security.module.ts` — `SecurityModule`, exporta `ServiceApiKeyGuard`
  (para `@UseGuards(ServiceApiKeyGuard)` resolver via DI no módulo
  importador) e `SERVICE_API_KEY_CONFIG` (para os dois `AclService`
  injetarem a mesma credencial ao montar o header de saída).

### Comparação resistente a timing attack

Nunca `===`/comparação direta de string — a comparação nativa do
JavaScript retorna no primeiro caractere divergente, vazando o prefixo
correto via diferença mensurável de tempo de execução. `crypto.timingSafeEqual`
diretamente sobre os dois buffers também não basta sozinho: a função lança
se os tamanhos diferirem, o que por si só vazaria informação sobre o
tamanho da chave esperada via exceção/branch observável. Este guard
compara o **hash SHA-256** (tamanho fixo, 32 bytes, dos dois lados) via
`timingSafeEqual` — elimina tanto o vazamento de conteúdo quanto o de
tamanho, mesmo rigor de segurança já demonstrado no restante do projeto
(`pgcrypto`/RLS, `TASK.md` §1.2/1.3).

## Como cada emissor se autentica

Quatro emissores distintos passam a enviar `X-Service-Api-Key`:

1. **`IntegrationEngineAclService.publishToCore`** (hop 2, mesmo processo)
   — injeta `SERVICE_API_KEY_CONFIG` e anexa o header ao `fetch` para
   `/internal/ingest`.
2. **`ImagingGatewayAclService.publishToCore`** (hop 2, mesmo processo) —
   mesmo padrão, para `/internal/imaging-ingest`. (`fetchConvertedPreview`,
   que busca a prévia **no** Orthanc — direção oposta — não recebe este
   header; fora do escopo de BE-09, que trata só do tráfego gateway → core.)
3. **`HTTP Sender` do canal da Integration Engine** (hop 1, processo
   externo) — `hl7v2-oru-canonical-test-channel.xml` ganhou uma entrada de
   header estática com o placeholder `__SERVICE_API_KEY__` (nome interno do
   placeholder do template XML, não o nome da variável de ambiente),
   substituído em tempo de deploy por `deploy-channel.mjs` (mesmo mecanismo
   já usado por `__CORE_INGEST_ACL_URL__`) a partir da env
   `INTERNAL_SERVICE_API_KEY`.
4. **Script Lua do Orthanc** (hop 1, processo externo) — `on-stable-study.lua`
   lê `os.getenv('INTERNAL_SERVICE_API_KEY')` (mesma disciplina de falha
   explícita já usada para `ORTHANC_CORE_NOTIFY_ENDPOINT` ausente) e passa
   `{ ['X-Service-Api-Key'] = serviceApiKey }` como terceiro argumento de
   `HttpPost` — parâmetro de headers suportado pelo Orthanc desde a versão
   1.2.1 (bem anterior à imagem fixada, `26.8.2`).

**Credencial única, não uma por-serviço**: os 4 lugares usam o mesmo valor
de `INTERNAL_SERVICE_API_KEY` por ambiente (não uma chave diferente por gateway) —
suficiente para o requisito do piloto ("credencial de serviço dedicada",
`GUARDRAILS.md` item 13, no sentido de "dedicada a este tráfego", distinta
de credencial de usuário final); segregar por-gateway ficaria como melhoria
futura se DevSecOps priorizar, mesmo raciocínio já aplicado a mTLS em
`TASK.md` §1.7.

## Nota de correção pós-implementação (fix-loop, revisão de spec-compliance/qualidade de código, mesmo dia)

1 achado real corrigido, encontrado ao confirmar a lacuna que a
implementação original desta tarefa havia sinalizado para o DevOps (abaixo,
texto original preservado como histórico).

**Achado**: a implementação original leu a credencial da variável de
ambiente `SERVICE_API_KEY` (em `service-api-key-config.ts`,
`deploy-channel.mjs` e `on-stable-study.lua`) e concluiu, sem checar o
Terraform existente, que `infra/environments/{staging,production}/main.tf`
"ainda não expõe" esta credencial — registrando isso como acompanhamento
pendente e não-bloqueante para o DevOps. Na revisão pós-implementação,
`infra/modules/secrets/main.tf` (`resource "aws_secretsmanager_secret"
"internal_service_api_key"`, comentário original: "API key de serviço
dedicada (BE-09) - Integration Gateway/Imaging Gateway -> Aplicacao Core")
e `infra/environments/{staging,production}/main.tf` já provisionavam e
injetavam **este exato secret**, com **este exato propósito**, nos 3
serviços ECS relevantes (`core`, `integration_gateway_service`,
`imaging_gateway_service`) desde a fundação de infraestrutura — sob o nome
`INTERNAL_SERVICE_API_KEY`, não `SERVICE_API_KEY`. O DevOps já havia
antecipado esta tarefa; a implementação original simplesmente não conferiu
o Terraform antes de escolher o nome da variável.

**Impacto se não corrigido**: em qualquer deploy real (staging/produção),
o container do Core receberia `INTERNAL_SERVICE_API_KEY` (o secret real,
gerado por `random_password`) mas o código leria `SERVICE_API_KEY`
(inexistente no ambiente) — `loadServiceApiKeyConfig` cairia
silenciosamente no default de desenvolvimento
(`portalmed_service_api_key_dev_only_change_me`, valor público neste
repositório), fazendo o `ServiceApiKeyGuard` validar contra uma senha
conhecida em produção (autenticação de fato inexistente, apesar de
aparentar estar ativa). No container do Orthanc, o mesmo mismatch faria o
script Lua encontrar `os.getenv('INTERNAL_SERVICE_API_KEY')` no ambiente
real mas checar `os.getenv('SERVICE_API_KEY')` — falharia explicitamente
(log, não silencioso, mesma disciplina já usada para
`ORTHANC_CORE_NOTIFY_ENDPOINT`) e nunca notificaria o core, quebrando a
funcionalidade (não só a segurança) do pipeline de conversão em produção.

**Correção aplicada**: renomeada a variável de ambiente lida em
`service-api-key-config.ts`, `deploy-channel.mjs` e `on-stable-study.lua`
de `SERVICE_API_KEY` para `INTERNAL_SERVICE_API_KEY`, casando com o nome já
provisionado pelo Terraform. Atualizados: `.env.example`,
`service-api-key-config.spec.ts`,
`test/imaging-gateway/orthanc-imaging-gateway.e2e-spec.ts` (env injetada no
container Orthanc do teste) e o comentário de
`integration-engine.controller.ts` que citava o nome antigo. Nenhuma
mudança de nome nos identificadores internos (`SERVICE_API_KEY_CONFIG`,
`SERVICE_API_KEY_HEADER`, `ServiceApiKeyGuard`) — só o nome da variável de
ambiente lida via `process.env`/`os.getenv`. Nenhuma mudança de
comportamento/contrato público (header HTTP, guard, testes de guard
continuam idênticos — só a fonte da credencial). Suíte completa
reexecutada de forma independente após a correção (ver `TASK.md`, célula
de status de BE-09, nota de correção).

**Conclusão sobre o acompanhamento do DevOps**: deixa de existir. O
Terraform já injeta a credencial correta nos 3 serviços desde a fundação de
infraestrutura; com o nome do código agora alinhado, BE-09 fecha de ponta a
ponta sem nenhum follow-up pendente de infraestrutura.

### Texto original desta seção (histórico, preservado por transparência)

> ## Acompanhamento para o DevOps (não implementado nesta tarefa, fora da autoridade do Backend)
>
> O script Lua do Orthanc roda **dentro do container do gateway**, não no
> processo NestJS — a variável `SERVICE_API_KEY` documentada em
> `.env.example` precisa ser injetada na task definition real do serviço
> `imaging-gateway` (`infra/environments/{staging,production}/main.tf`), mesmo
> padrão já usado para `ORTHANC_CORE_NOTIFY_ENDPOINT`. Sem isso em produção, o
> Lua falha explicitamente (log, não notificação silenciosa — mesma
> disciplina já aplicada à ausência de `ORTHANC_CORE_NOTIFY_ENDPOINT`) em vez
> de notificar sem autenticação. Esta tarefa (BE-09) não altera nenhum
> arquivo Terraform — mesmo escopo já assumido por BE-06/BE-07.

## Como os testes validam esta tarefa

- `backend/src/security/service-api-key-config.spec.ts` — defaults, leitura
  de env, string vazia tratada como ausente.
- `backend/src/security/service-api-key.guard.spec.ts` — `canActivate`
  (aceita/rejeita, header ausente/vazio/incorreto/case-sensitive/duplicado)
  com um `ExecutionContext` dublê, mensagem de erro não vaza a credencial
  esperada; `isServiceApiKeyValid` (função pura extraída) testada
  isoladamente, incluindo tamanhos diferentes sem lançar exceção.
- `backend/src/integration-engine/integration-engine-acl.service.spec.ts` /
  `backend/src/imaging-gateway/imaging-gateway-acl.service.spec.ts` —
  atualizados para confirmar que `publishToCore` anexa o header correto.
- `backend/test/integration-engine/integration-engine.e2e-spec.ts` /
  `backend/test/imaging-gateway/imaging-gateway.e2e-spec.ts` — bateria
  positivo/negativo (`describe.each`) do guard nos 4 endpoints, dentro de
  um app NestJS real via `supertest` (`SERVICE_API_KEY_CONFIG` sobrescrito
  com um valor de teste conhecido).
- `backend/test/integration-engine/hl7v2-channel.e2e-spec.ts` /
  `backend/test/imaging-gateway/orthanc-imaging-gateway.e2e-spec.ts` —
  provam que os emissores **reais** (o `HTTP Sender` da engine e o script
  Lua do Orthanc, não só os dublês usados nos testes anteriores) conseguem
  de fato se autenticar de ponta a ponta.

Nenhuma mudança foi necessária em `.github/workflows/backend-ci.yml`.
