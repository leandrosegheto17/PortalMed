# Integration Engine (HL7/FHIR) — BE-06 (`TASK.md`)

Motor de interoperabilidade de mercado (ADR-002/`GUARDRAILS.md` item 11) que
recebe mensagens do LIS/RIS/HIS do hospital piloto, normaliza a estrutura
usando recursos nativos do próprio produto (nunca um parser HL7/FHIR
construído pelo monolito core) e publica o resultado para a Anti-Corruption
Layer (ACL) do core via HTTP. Escopo desta tarefa, exatamente como
decomposto no `TASK.md`: engine deployada em rede privada, pelo menos um
canal de teste configurado, ACL normalizando para JSON canônico e publicando
para um endpoint interno do core (placeholder — a lógica real de ingestão é
BE-24).

## Decisão de engine: NextGen Connect

`ADR-002`/`SDD.md` citam "NextGen Connect/Mirth Connect" como o mesmo motor
— NextGen Healthcare adquiriu o produto Mirth Connect e renomeou a edição
open-source para **NextGen Connect** (o nome "Mirth Connect" permanece de
uso comum/histórico, mas o projeto/imagem Docker oficial atual chama-se
NextGen Connect). Esta tarefa usa a imagem oficial
**`nextgenhealthcare/connect:4.5.2`** (versão fixada, mesmo raciocínio de
pin de versão já aplicado a `postgres:16-alpine`/`redis:7-alpine`/
`localstack/localstack:3` em tarefas anteriores) — não há decisão nova de
build-vs-buy aqui, ADR-002 já resolveu isso no Gate 2; esta é só a escolha
de qual dos dois nomes/imagem usar, dentro da autoridade de rotina do
Backend.

## Onde a engine roda (rede privada, `SDD.md` §7.5)

O deploy real (Terraform) já está provisionado pelo DevOps, fora do escopo
desta tarefa: `infra/modules/network/main.tf` reserva a subnet
`integration` (sem rota de saída pública, GUARDRAILS.md item 14) e a porta
`6661` (canal MLLP dedicado ao hospital piloto, hoje desabilitado por
padrão via `var.enable_hospital_channel` até o protocolo real do piloto ser
confirmado — SPK-01); `infra/environments/{staging,production}/main.tf`
já define o serviço ECS `portalmed-*-integration-gateway` (`modules/
ecs-service`, sem listener público, só alcançável pela aplicação core via
rede interna) apontando `CORE_INGEST_ENDPOINT` para
`https://<domínio>/api/internal/ingest`. Esta tarefa (BE-06) não altera
nenhum arquivo Terraform — consome essa topologia já definida e entrega o
que faltava: a imagem/configuração real da engine (canal) e o código NestJS
do lado core (ACL).

Para desenvolvimento/teste local, a engine roda via Docker
(`nextgenhealthcare/connect:4.5.2`) da mesma forma que Postgres/Redis/
LocalStack já rodam nas suítes de teste anteriores — nenhum arquivo
`docker-compose.yml` novo foi necessário: a suíte e2e (ver "Como os testes
validam", abaixo) sobe o container via `testcontainers`, igual às tarefas
anteriores.

## Canal de teste — HL7 v2.x MLLP (ORU^R01)

`backend/integration-engine/channels/hl7v2-oru-canonical-test-channel.xml` —
canal exportado/versionado (config-as-code para a engine, equivalente aos
módulos Terraform para o resto da infraestrutura):

- **Origem (source)**: `TCP Listener` em modo servidor (`serverMode=true`),
  modo de transmissão MLLP (plugin nativo `mllpmode`, `startOfMessageBytes
  = 0B`, `endOfMessageBytes = 1C0D` — VT/FS+CR padrão MLLP), porta `6661`
  (mesma porta já reservada em `infra/modules/network/main.tf`).
- **Normalização estrutural**: um *transformer step* JavaScript nativo do
  motor (recurso do produto, não um parser HL7 escrito pelo core — ADR-002)
  lê a árvore HL7 já interpretada pelo motor (`msg['PID']['PID.3']['PID.3.1']`,
  etc., sintaxe E4X padrão do Mirth/NextGen Connect) e monta um envelope
  JSON de primeiro nível (`messageType`, `patientIdentifier`, `examCode`,
  `resultValue`, ...), publicado em `channelMap`.
- **Destino (destination)**: `HTTP Sender` faz `POST` desse envelope para
  `__CORE_INGEST_ACL_URL__` — placeholder substituído em tempo de deploy
  por `deploy-channel.mjs` (nunca um endpoint de ambiente específico
  hardcoded no XML versionado, `TASK.md` §1.1).

Só HL7 v2.x foi implementado nesta tarefa (o critério de aceite pede "ao
menos 1 canal de teste HL7 v2.x/FHIR R4" — HL7 v2.x MLLP foi escolhido por
já ter a porta reservada na infraestrutura existente, `6661`/
`hospital_vpn_cidr`). Um canal FHIR R4 seguiria o mesmo padrão (origem `HTTP
Listener` em vez de `TCP Listener`, sem transmissão MLLP, corpo já JSON) —
não implementado aqui para não generalizar além do que o critério de
aceite exige (`TASK.md` §1.1, "Simplicidade"); fica como extensão natural
quando um segundo canal for necessário (RF-C02/Release 2, ou quando SPK-01
confirmar o protocolo real do piloto).

## `backend/integration-engine/` — por que fica fora de `src/`/`test/`

Não é código de runtime da aplicação (não entra em `nest build`, não é
importado por nenhum módulo NestJS) — é configuração/operação da engine
como código, mesma categoria de `infra/*.tf` (Terraform também não é lint/
buildado pelo pipeline do backend). Dois arquivos:

- `channels/hl7v2-oru-canonical-test-channel.xml` — o canal em si.
- `deploy-channel.mjs` — script (JavaScript ESM puro, sem necessidade de
  compilação) que provisiona (cria/substitui, idempotente) e implanta o
  canal via a API REST administrativa da engine. Reexecutável em pipeline
  de deploy real (`npm run deploy:integration-engine-channel`, variáveis
  de ambiente documentadas em `.env.example`) e importado diretamente pela
  suíte e2e (`backend/test/integration-engine/hl7v2-channel.e2e-spec.ts`).

## A Anti-Corruption Layer (`backend/src/integration-engine/`)

Módulo NestJS novo, **não** um bounded context do `SDD.md` §2.1 — mas,
diferente de `src/database/`/`src/redis/`/`src/queue/`/`src/object-storage/`
(infraestrutura transversal sem rota HTTP própria, só consumida via DI por
um módulo de domínio futuro, nunca importada em `AppModule`), este módulo
**expõe rotas HTTP reais** que precisam estar ativas desde já — são o
próprio objeto de teste do critério de aceite desta tarefa. Por isso é a
única exceção ao padrão anterior: `IntegrationEngineModule` **é** importado
em `AppModule` (comentário dedicado lá explicando a exceção).

Dois hops HTTP deliberados, mesmo os dois lados vivendo hoje no mesmo
processo:

1. `POST /internal/integration-engine/messages`
   (`IntegrationEngineController`) — recebe o envelope normalizado pela
   engine, valida a forma (`parseEngineNormalizedMessage`, falha explícita
   via `BadRequestException` para qualquer campo ausente/vazio, mesma
   filosofia de `parsePositiveInt`/`parseStrictBoolean`), traduz para o
   JSON canônico de domínio (`toCanonicalExamResultMessage`) e publica via
   `IntegrationEngineAclService.publishToCore`.
2. `POST /internal/ingest` (`CoreIngestPlaceholderController`) — recebe o
   JSON canônico. **Placeholder deliberadamente simples**: só loga e
   guarda a última mensagem recebida (`getLastReceivedMessage()`, usado
   pela suíte de teste) — nenhuma lógica de negócio de ingestão (match por
   CPF, resiliência, fila de exceção) é implementada aqui. BE-24 substitui
   este controller inteiro.

Por que dois hops HTTP reais em vez de uma chamada de método direta: mantém
a fronteira entre a ACL (tradução de formato) e o módulo de domínio que vai
possuir a lógica real de ingestão (BE-24, provavelmente Fila de Exceção —
RF-14) explícita e testável isoladamente, e espelha a topologia real do
`SDD.md` §2.2 ("IE->>CORE: POST /internal/ingest") sem exigir nenhuma
mudança de contrato quando BE-24 substituir o placeholder por lógica de
negócio de verdade.

### JSON canônico de domínio (`CanonicalExamResultMessage`)

```json
{
  "schemaVersion": "1.0",
  "sourceSystem": "LIS",
  "messageType": "ORU^R01",
  "messageControlId": "MSG00001",
  "patient": { "identifier": "123456789", "name": "SILVA JOAO" },
  "exam": { "code": "GLU", "name": "GLICOSE" },
  "result": { "value": "95", "unit": "mg/dL" },
  "receivedAt": "2026-09-03T20:55:09.362Z"
}
```

`schemaVersion` fixo desde já (mesmo raciocínio de versionamento de payload
já aplicado ao hash chain de auditoria, `TASK.md` §1.4/SPK-05) — evita que
uma mudança futura de formato quebre silenciosamente BE-24.

### Sem `class-validator`

Nenhum outro módulo do projeto usa a biblioteca ainda — validar um único
DTO de 10 campos string à mão (`parseEngineNormalizedMessage`) evita
introduzir uma dependência nova só para isso (`TASK.md` §1.1,
"Simplicidade"). Reavaliar se um módulo de domínio futuro precisar de
validação de DTO mais rica.

### Segurança — nota para BE-09 (tarefa futura, não implementada aqui)

`GUARDRAILS.md` item 13 exige que a comunicação Integration Gateway → Core
seja "autenticada por credencial de serviço dedicada". BE-09 (3 dp,
`TASK.md` §3.1) é a tarefa dedicada a essa credencial (API key de serviço)
— `IntegrationEngineController` é deixado pronto para receber um guard
(`@UseGuards(ServiceApiKeyGuard)`, a ser criado por BE-09) sem precisar de
nenhuma outra mudança estrutural. Até lá, o isolamento é só de rede (a
engine não é exposta publicamente) — o próprio `/internal/ingest`, por
estar atrás do mesmo domínio/ALB que a SPA, tecnicamente aceita requisição
de qualquer origem até BE-09 fechar essa lacuna. Não é uma omissão
silenciosa: é o escopo exato que esta tarefa recebeu do Tech Lead, com
BE-09 já decomposta separadamente para fechá-la antes de qualquer tráfego
real de produção.

## Achados desta implementação (spike-like — SPK-02 já havia sinalizado o
## risco de curva de aprendizado de configuração de canal)

A API REST administrativa da engine (`https://<host>:8443/api`) aceita
`POST /api/channels` mesmo com XML estruturalmente incompatível com as
classes de conector/plugin realmente instaladas — sem retornar erro HTTP;
em vez disso, marca o canal como inválido silenciosamente (`GET
/api/channels/{id}` devolve `<description>This channel is invalid. Verify
all required extensions are loaded correctly.</description>`), sem nenhum
log de erro por padrão (`rootLogger = ERROR` no `log4j2.properties` da
imagem, mas a falha de deserialização não é logada nem nesse nível).
`deploy-channel.mjs` (`upsertChannel`) confirma explicitamente, depois de
criar o canal, que ele **não** foi marcado como inválido — sem essa
checagem, um XML quebrado passaria despercebido tanto em CI quanto em um
deploy real.

Descoberta do formato correto do XML: a API expõe `GET /api/openapi.json`
(especificação OpenAPI 3 completa do produto) e, para vários modelos,
exemplos reais em `GET /apiexamples/{nome}` (ex.: `channel_xml`,
`http_dispatcher_properties_xml`) — usados para validar campo a campo
contra a própria engine rodando, em vez de adivinhar o schema às cegas.
Três erros reais encontrados e corrigidos durante essa validação empírica
(documentados aqui para não se repetirem numa tarefa futura que edite este
canal):

1. O conector "MLLP Listener" **não existe** como classe própria — é o
   conector genérico `com.mirth.connect.connectors.tcp.TcpReceiverProperties`
   ("TCP Listener") com um `transmissionModeProperties` do plugin
   `mllpmode` (`MLLPModeProperties`) selecionando o modo de enquadramento
   MLLP. Usar a classe MLLP inexistente faz o canal ser aceito e
   silenciosamente marcado como inválido.
2. `TcpReceiverProperties.serverMode` precisa ser **`true`** para o
   conector efetivamente escutar (`ServerSocket`/`accept`) — com `false`
   (valor inicialmente assumido por engano), o conector tenta **conectar
   como cliente** em `remoteAddress:remotePort`, falhando repetidamente
   com `ConnectException: Connection refused` nos logs (`docker logs`),
   sem nunca abrir a porta de escuta.
3. `JSONBatchProperties.splitType` só aceita o valor de enum
   **`JavaScript`** — o valor `JSON_Array` (usado por engano, por analogia
   com o enum real do HL7 v2.x, `MSH_Segment`) não existe para o tipo JSON
   e quebra a deserialização do canal inteiro silenciosamente.
4. Um `preprocessingScript` **vazio** (`<preprocessingScript></preprocessingScript>`)
   retorna `undefined` (ausência de `return message;` explícito) — a
   engine usa esse retorno como o próprio conteúdo da mensagem daí em
   diante, fazendo o parser HL7 processar a string literal `"undefined"`
   em vez da mensagem real (todos os campos extraídos ficavam vazios). Todo
   `preprocessingScript`/`postprocessingScript`/`deployScript`/
   `undeployScript` deste canal termina com `return;`/`return message;`
   explícito por causa deste achado.

## Como os testes validam esta tarefa

Mesma disciplina de infraestrutura real via `testcontainers` já usada por
BE-02/BE-03/BE-04 (PostgreSQL), BE-05 (Redis) e BE-08 (LocalStack) — nenhum
mock da engine.

- `backend/src/integration-engine/*.spec.ts` (unitário, sem rede real) —
  `parseEngineNormalizedMessage` (validação de campo ausente/vazio/tipo
  errado), `toCanonicalExamResultMessage` (tradução), `loadIntegrationEngineConfig`
  (env), `IntegrationEngineAclService` (com `fetch` global substituído por
  dublê, mesmo padrão de `object-storage.service.spec.ts`).
- `backend/test/integration-engine/integration-engine.e2e-spec.ts` — app
  NestJS real (`@nestjs/testing` + `supertest`), prova o caminho **dentro
  do processo do core** (ACL → `/internal/ingest`) de ponta a ponta, sem
  Docker.
- `backend/test/integration-engine/hl7v2-channel.e2e-spec.ts` — a engine
  **real** (`nextgenhealthcare/connect:4.5.2`) via `testcontainers`:
  mensagem HL7 v2.x ORU^R01 enviada por socket TCP bruto com enquadramento
  MLLP (sem nenhuma biblioteca HL7) → canal real → transformer step real →
  `HTTP Sender` real chamando um app NestJS real (porta efêmera do
  processo de teste) → ACL real → `/internal/ingest`. Container alcança o
  processo de teste via `host.docker.internal`, com o mapeamento explícito
  `host-gateway` (`GenericContainer.withExtraHosts`) — necessário para
  portabilidade em runner Linux de CI (`ubuntu-latest`), já que
  `host.docker.internal` só resolve nativamente em Docker Desktop
  (Windows/Mac); `host-gateway` funciona nos dois ambientes (suportado
  desde Docker Engine 20.10).

Nenhuma mudança foi necessária em `.github/workflows/backend-ci.yml` — o
job `lint-and-test` já roda `npm run test:e2e` sobre o mesmo runner
`ubuntu-latest` com Docker disponível (mesmo raciocínio de
`redis-and-queues.md`/`object-storage.md`); o tempo do job aumenta em
função do pull/boot da imagem Java da engine (~730MB, ~15-20s de boot),
aceito pelo mesmo motivo que a introdução do LocalStack em BE-08 foi aceita.

## TLS autoassinado da API administrativa — decisão de detalhe

A imagem `nextgenhealthcare/connect` usa certificado autoassinado por
padrão na API administrativa HTTPS (porta 8443) — tráfego que nunca sai da
rede privada (`SDD.md` §7.5). `deploy-channel.mjs` aceita esse certificado
por padrão (`INTEGRATION_ENGINE_ADMIN_ALLOW_INSECURE_TLS=true`), via a
flag global do Node `NODE_TLS_REJECT_UNAUTHORIZED` **restaurada
imediatamente após cada chamada** (nunca vaza o bypass para nenhum outro
tráfego do processo, em particular nunca para chamadas feitas pela
aplicação core em si). Acompanhamento explícito para DevOps/DevSecOps:
provisionar um certificado de CA interna para a API administrativa da
engine antes de produção real e então definir
`INTEGRATION_ENGINE_ADMIN_ALLOW_INSECURE_TLS=false`.

## Escopo deliberadamente não incluído (tarefas futuras)

- **BE-09** — credencial de serviço (API key) para autenticar a chamada
  Integration Gateway → Core. Endpoint deixado pronto para receber o
  guard, não implementado aqui.
- **BE-18** — match de CPF/validação de maioridade no cadastro.
- **BE-24** — lógica real de ingestão (`/internal/ingest`): associação por
  CPF, resiliência a indisponibilidade da fonte, roteamento para a fila de
  exceção quando o paciente não é localizado. `CoreIngestPlaceholderController`
  existe só para provar que a ACL publica de ponta a ponta.
- Canal FHIR R4 (só HL7 v2.x MLLP implementado — ver seção "Canal de
  teste", acima).
- Qualquer redundância/HA operacional da engine em produção (fora do
  escopo de código desta tarefa — `SDD.md` §6 já nomeia esse risco
  técnico, mitigação de responsabilidade do DevOps).
