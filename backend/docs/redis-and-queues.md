# Redis + BullMQ — BE-05 (`TASK.md`)

Infraestrutura de conexão Redis (ADR-007: sessão de usuário final vive em
Redis, revogável, **nunca** JWT stateless — GUARDRAILS.md item 6) e de fila
assíncrona (BullMQ). Nenhuma lógica de negócio está aqui:

- **Criação de sessão em si** (TTL deslizante, expiração por inatividade de
  15 min default, logout invalidando token imediatamente) é **BE-14**,
  tarefa futura — esta tarefa só prepara a conexão e a convenção de chave
  que BE-14 vai consumir.
- **Jobs de negócio reais** (conversão de imagem — BE-07 Imaging Gateway;
  ingestão — BE-24) são tarefas futuras — esta tarefa só deixa a
  infraestrutura de fila operacional e testada com um job de exemplo.

## Duas bibliotecas escolhidas, dentro da autoridade do Backend

- **`ioredis`**: cliente Redis para Node.js mais usado em produção junto
  com NestJS, com suporte nativo a TLS/senha/cluster (útil se o Redis
  gerenciado real exigir TLS, ADR-010/GUARDRAILS.md item 24 — região
  Brasil, mas não necessariamente sem TLS em trânsito) e é **a mesma
  biblioteca que o BullMQ já exige como dependência de fato** (BullMQ
  aceita opções de conexão no formato do `ioredis` ou uma instância real
  dele) — escolher outra lib de cliente Redis só para a parte de sessão
  duplicaria dependência sem ganho.
- **`bullmq`**: fila baseada em Redis madura para Node.js/TypeScript,
  sucessora do `bull` (mesma raiz de projeto), com suporte nativo a
  `Queue`/`Worker`/retries/backoff — não há requisito de ADR que force uma
  fila específica; BullMQ foi escolhido por já assumir Redis como backend
  (mesma instância que a sessão, sem introduzir um segundo sistema de
  mensageria só para os jobs assíncronos citados no critério de aceite).

## Dois módulos de infraestrutura transversal (não bounded context)

Assim como `src/database/` (BE-01 a BE-04), nem `src/redis/` nem
`src/queue/` são bounded contexts do `SDD.md` §2.1 — são infraestrutura
compartilhada, consumida por múltiplos bounded contexts futuros:
Identity & Access (BE-14, sessão), Entrega de Laudo/Imagem (BE-07,
conversão de imagem), Fila de Exceção/Notificação (BE-24, ingestão). A
regra de lint de fronteira de módulo (`no-deep-module-import`,
`src/tooling/eslint-rules/module-boundary-rule.js`) só avalia caminhos sob
`src/modules/<nome>/` — não se aplica aqui, mas os dois diretórios seguem a
mesma convenção de barrel único (`index.ts`) por consistência com
`src/database/`.

`src/redis/` e `src/queue/` são dois módulos **separados** (não um único
`InfraModule`) porque atendem necessidades de conexão diferentes — ver
próxima seção.

## "Conexão Redis compartilhada" — o que isso significa aqui

O critério de aceite de BE-05 pede "fila BullMQ operacional... com conexão
Redis compartilhada". Isso é implementado como **mesma fonte única de
configuração** (`src/redis/redis-config.ts`, `loadRedisConfig()` — host,
porta, senha, TLS, sempre via env, nunca hardcoded), não como um único
objeto de cliente `ioredis` literalmente compartilhado entre sessão e
fila:

- `RedisModule`/`RedisHealthService` (`src/redis/`) usam um cliente
  `ioredis` de uso geral (retry normal).
- `buildBullMqConnectionOptions()` (`src/queue/queue-connection.ts`) usa a
  **mesma** configuração de host/porta/senha/TLS, mas força
  `maxRetriesPerRequest: null` — exigência do BullMQ para os comandos
  bloqueantes (`BRPOPLPUSH`/`BLMOVE` internos) usados por `Worker`;
  incompatível com um cliente de uso geral, que quer retry automático.
  BullMQ também recomenda, na própria documentação, uma conexão dedicada
  por `Queue`/`Worker` em vez de reaproveitar uma única instância — cada
  `Queue`/`Worker` criado via `QueueRegistryService`/`buildBullMqConnectionOptions`
  abre a própria conexão `ioredis` internamente, todas apontando para a
  mesma instância/cluster Redis real.

Decisão de detalhe registrada aqui para não ser lida como "duas conexões
não compartilhadas por descuido" — é deliberado.

## `src/redis/` — conexão + estrutura de chave de sessão

- `redis-config.ts` — `loadRedisConfig(env?)`, pura, testável sem mutar
  `process.env`. Lê `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`,
  `REDIS_TLS`, `REDIS_KEY_PREFIX`, `SESSION_INACTIVITY_TTL_SECONDS`,
  `BULLMQ_PREFIX` — todos com default de desenvolvimento documentado,
  nenhum hardcoded no código de produção (`TASK.md` §1.1). `REDIS_PORT`/
  `SESSION_INACTIVITY_TTL_SECONDS` inválidos (não-inteiro, `<= 0`) lançam
  erro explícito na inicialização — nunca falham silenciosamente.
- `session-key.ts` — `buildSessionRedisKey(keyPrefix, { tenantId,
  sessionId })`, pura. Formato:
  **`{keyPrefix}:session:{tenantId}:{sessionId}`**. `tenantId` é sempre
  obrigatório (nunca opcional) — multi-tenancy é a "regra de maior
  severidade" do projeto (`TASK.md` §1.3/ADR-004); incluir `tenantId` na
  própria chave garante que uma mesma string de `sessionId` nunca colide
  entre tenants diferentes, mesmo antes de qualquer lógica de sessão (BE-14)
  existir. Isso **não substitui** a exigência de `sessionId` ser um valor
  opaco de alta entropia (decisão de BE-14) — é uma camada adicional
  barata, não a única defesa.
- `redis-connection.ts` — `REDIS_CONNECTION` (símbolo de DI) +
  `createRedisConnection(config)`. **Deliberadamente não reexportado pelo
  barrel** (`index.ts`) — mesma disciplina já aplicada a
  `KYSELY_CONNECTION` (`src/database/kysely-connection.ts`) depois da
  correção de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1):
  Redis guarda dado de sessão de usuário final: se qualquer provider comum
  do NestJS pudesse `@Inject(REDIS_CONNECTION)` livremente, um bug de
  implementação futura (BE-14) poderia ler/escrever qualquer chave por
  fora do repositório de sessão dedicado que essa tarefa vai construir —
  inclusive por adivinhação cross-tenant de `sessionId`. Como esta tarefa
  (BE-05) não introduz nenhum consumidor de sessão real ainda, aplicar essa
  disciplina desde já evita reabrir, em BE-14, o mesmo tipo de vetor que
  BE-03 só fechou depois de um achado do QA. Diferente de
  `KYSELY_CONNECTION`, nenhuma regra de lint dedicada foi criada nesta
  tarefa para reforçar isso em CI (proporcional ao escopo de 3 dp e à
  ausência de qualquer consumidor real hoje) — recomendação registrada
  aqui para quando BE-14 introduzir o primeiro consumidor: se um caminho de
  bypass real for encontrado (import "por fora" do barrel, como aconteceu
  com `KYSELY_CONNECTION`), o mesmo padrão de regra ESLint
  (`no-kysely-connection-token-outside-database-rule.js`) pode ser
  replicado para `REDIS_CONNECTION`.
- `redis-health.service.ts` — `RedisHealthService.ping()`, único ponto de
  acesso à conectividade real exposto pelo barrel (não expõe `get`/`set`
  genérico de propósito).
- `redis.module.ts` — `RedisModule`, fornece `REDIS_CONNECTION` via
  `useFactory` (lendo `loadRedisConfig()`) e `RedisHealthService`;
  `onModuleDestroy` desconecta o cliente.

## `src/queue/` — infraestrutura de fila BullMQ

- `queue-connection.ts` — `buildBullMqConnectionOptions(env?)`, pura,
  reaproveita `loadRedisConfig()` e sempre define
  `maxRetriesPerRequest: null` (ver seção acima).
- `queue-registry.service.ts` — `QueueRegistryService.getQueue(name)`:
  cria (ou devolve, se já existir) uma `Queue` BullMQ com as opções de
  conexão compartilhadas + `prefix` (`BULLMQ_PREFIX`). `onModuleDestroy`
  fecha todas as filas criadas. **Não gerencia `Worker`** — cada módulo de
  domínio futuro (BE-07, BE-24) conhece o próprio processor de negócio, que
  esta infraestrutura não deve assumir; esses módulos instanciam o próprio
  `Worker` usando `buildBullMqConnectionOptions()`/`loadRedisConfig().
  bullmqPrefix` (ambos exportados pelo barrel de `src/queue/`) para manter
  a mesma configuração de conexão/prefixo.
- `queue.module.ts` — `QueueModule`, fornece/exporta `QueueRegistryService`.

**Nenhum nome de fila de negócio é definido nesta tarefa** (ex.:
"conversao-imagem", "ingestao-hl7") — isso é decisão de BE-07/BE-24, cada
um dono do próprio contrato de job. Os testes de BE-05 usam nomes de fila
gerados dinamicamente (`infra-smoke-test-<uuid>`) só para provar que a
infraestrutura funciona, sem reservar/hardcodar um nome real.

## Módulos não são importados em `AppModule` nesta tarefa

Mesmo padrão de `DatabaseModule` (BE-01 a BE-04): `RedisModule`/
`QueueModule` não são importados em `src/app.module.ts` porque nenhum
módulo de domínio (bounded context) tem hoje um provider que os consuma —
os 11 módulos de `SDD.md` §2.1 continuam vazios (ver `TASK.md` BE-01). Uma
tarefa futura que precise de sessão (BE-14) ou fila (BE-07/BE-24) importa
`RedisModule`/`QueueModule` no próprio módulo de bounded context, do mesmo
jeito que um repositório concreto futuro importaria `DatabaseModule`.

## Como os testes validam a infraestrutura

**Redis real e efêmero via `testcontainers`** (`@testcontainers/redis`,
imagem `redis:7-alpine`) — mesmo padrão de BE-02/BE-03/BE-04 para
PostgreSQL, nenhum mock de `ioredis`/BullMQ, exigido pelo critério de
aceite ("Instância Redis acessível pela aplicação").

`test/redis/redis-infrastructure.e2e-spec.ts` (4 testes):

1. `createRedisConnection` conecta e responde `PONG` contra Redis real.
2. `RedisModule` (via `@nestjs/testing`, configurado **só por variável de
   ambiente**, nunca hardcoded) fornece `RedisHealthService` funcional —
   `ping()` confirma conectividade real de ponta a ponta através do NestJS
   DI.
3. O barrel público (`src/redis/index.ts`) não exporta `REDIS_CONNECTION`
   (import dinâmico + `hasOwnProperty`) — mesma verificação de regressão já
   usada para `KYSELY_CONNECTION` em `QA-BUG-002`.
4. `buildSessionRedisKey` é utilizável de ponta a ponta contra Redis real:
   grava um valor com TTL sob a chave montada, lê de volta, confirma o TTL
   aplicado e confirma que a mesma `sessionId` sob um `tenantId` diferente
   nunca resolve para o mesmo valor (chave física diferente).

`test/queue/bullmq-infrastructure.e2e-spec.ts` (2 testes):

1. Fila BullMQ operacional de ponta a ponta, sem NestJS: `Queue.add(...)` +
   `Worker` real processam um job de exemplo contra Redis real do
   container — confirmado via poll do estado do job (`completed`), não só
   pelo callback do processor.
2. `QueueRegistryService` (via `@nestjs/testing`) fornece uma fila
   funcional pelo mesmo caminho de DI que um módulo de domínio futuro
   usaria; `getQueue` com o mesmo nome devolve a mesma instância (cache);
   `app.close()` aciona `onModuleDestroy` e fecha a fila sem erro, sem
   precisar fechar manualmente.

Nenhuma mudança foi necessária em `.github/workflows/backend-ci.yml` —
`testcontainers` gerencia o próprio container Redis via o Docker do host,
o mesmo Docker que já roda os containers PostgreSQL de BE-02/BE-03/BE-04
no runner `ubuntu-latest` (mesmo raciocínio documentado em
`backend/docs/migrations.md`).

## Configuração (`.env.example`)

Todos os valores abaixo têm default de desenvolvimento/teste explícito,
nunca hardcoded no código de produção (`TASK.md` §1.1); em produção os
valores reais vêm do secret manager (`SDD.md` §7.5):

| Variável | Default (dev) | Uso |
|---|---|---|
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `REDIS_PASSWORD` | (vazio) | Senha do Redis gerenciado (produção sempre define) |
| `REDIS_TLS` | `false` | Só `"true"`/`"false"` literal (validação estrita, `parseStrictBoolean`) habilita/desabilita TLS no cliente `ioredis` |
| `REDIS_KEY_PREFIX` | `portalmed:dev` | Prefixo de chave própria da aplicação (sessão, BE-14) |
| `SESSION_INACTIVITY_TTL_SECONDS` | `900` (15 min) | RF-04/`TASK.md` §1.7 — TTL de inatividade da sessão (consumido por BE-14) |
| `BULLMQ_PREFIX` | `portalmed:bullmq:dev` | Prefixo de chave (`prefix`) do BullMQ, independente do prefixo de sessão |

## `REDIS_TLS` — validação estrita (correção pós-revisão de BE-08, fix-loop tentativa 2 de 2)

`REDIS_TLS` era lido com `env.REDIS_TLS === 'true'`: qualquer valor não
reconhecido (`"True"`, `"1"`, `"yes"`) caía silenciosamente em `false`,
estabelecendo uma conexão Redis **não criptografada** carregando dado de
sessão (ADR-007) sem nenhum erro no startup — mesmo anti-padrão apontado
em `OBJECT_STORAGE_FORCE_PATH_STYLE` (`backend/docs/object-storage.md`).
Corrigido para usar `parseStrictBoolean` (`src/config/parse-env.ts`,
compartilhado com `object-storage-config.ts`): só aceita literalmente
`"true"`/`"false"`; qualquer outro valor lança erro explícito na
inicialização, citando `REDIS_TLS`.

## Decisões de detalhe tomadas nesta tarefa (dentro da autoridade do Backend)

- **`REDIS_KEY_PREFIX` distinto de `BULLMQ_PREFIX`**: são convenções de
  namespacing independentes (chave de sessão própria da aplicação vs.
  convenção interna do BullMQ) — unificá-las acoplaria decisões que podem
  evoluir separadamente (ex.: girar o prefixo de sessão numa migração de
  formato de chave, sem afetar filas já em voo).
- **`RedisHealthService.ping()` como única operação exposta pelo barrel**:
  suficiente para o critério de aceite ("instância Redis acessível pela
  aplicação"); um `get`/`set` genérico exposto amplamente reabriria o
  mesmo risco documentado para `REDIS_CONNECTION` acima, sem nenhum
  consumidor real que justifique o risco nesta tarefa.
- **`QueueRegistryService` não gerencia `Worker`, só `Queue`**: um
  `Worker` precisa de um processor de negócio (função real de
  processamento), que nenhuma tarefa de domínio ainda define — assumir um
  formato de processor genérico agora seria generalizar para código que
  não existe (`TASK.md` §1.1, "Simplicidade"), o mesmo raciocínio já usado
  por BE-02 para não tipar colunas de negócio antes de terem consumidor.
- **Nenhum nome de fila de negócio reservado nesta tarefa** — ver seção
  acima.
