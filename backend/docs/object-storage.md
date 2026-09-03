# Object Storage — BE-08 (`TASK.md`)

Infraestrutura de **consumo** do bucket S3 criptografado SSE-KMS/região
Brasil (ADR-010, `GUARDRAILS.md` itens 16/22/23/24) já **provisionado como
código** pelo DevOps (`infra/modules/object-storage/`, `DEPLOY.md` §3). Esta
tarefa não redefine infraestrutura Terraform — implementa o módulo NestJS
que a aplicação usa para falar com esse bucket: cliente S3 configurado e
geração de URL assinada de leitura (GET) de curta duração.

**Escopo explicitamente fora desta tarefa** (consumidores futuros):

- Convenção de nome/prefixo de `key` por tenant, e a decisão de *quando*
  chamar `putObject`/`getReadSignedUrl` — isso é BE-07 (Imaging Gateway
  grava imagem convertida), BE-21/BE-22 (exibição de laudo/imagem), BE-23
  (download com URL assinada + auditoria).
- Qualquer lógica de negócio (RF-08/RF-09, link de compartilhamento de
  72h/RN-06) — o link de compartilhamento é um token de aplicação
  **separado**, armazenado no PostgreSQL com a própria expiração (ver
  `SDD.md` §2.3, fluxo de compartilhamento); quando esse link é acessado,
  quem gera a URL assinada de leitura do S3 é este módulo, com a duração
  curta de `ObjectStorageConfig.signedUrlTtlSeconds` — nunca as 72h do
  token de compartilhamento em si.

## Módulo de infraestrutura transversal (não bounded context)

Mesma categoria de `src/database/`, `src/redis/`, `src/queue/` (BE-01 a
BE-05) — `src/object-storage/` não é um bounded context de `SDD.md` §2.1, é
infraestrutura compartilhada. A regra de lint de fronteira de módulo
(`no-deep-module-import`) só avalia `src/modules/<nome>/`, então não se
aplica aqui, mas o diretório segue a mesma convenção de barrel único
(`index.ts`) por consistência.

- `object-storage-config.ts` — `loadObjectStorageConfig(env?)`, pura,
  testável sem mutar `process.env` (mesmo padrão de `redis-config.ts`).
  Lê `OBJECT_STORAGE_BUCKET` (obrigatório, sem default — nunca hardcoded),
  `OBJECT_STORAGE_REGION` (default `sa-east-1`), `OBJECT_STORAGE_ENDPOINT`/
  `OBJECT_STORAGE_FORCE_PATH_STYLE` (só para S3-compatível local/teste),
  `OBJECT_STORAGE_ACCESS_KEY_ID`/`OBJECT_STORAGE_SECRET_ACCESS_KEY` (só
  dev/teste — produção usa a cadeia padrão de credenciais do AWS SDK/IAM
  role da task ECS, `DEPLOY.md` §3.1) e
  `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS` (default 300s/5 min).
- `s3-client.ts` — `OBJECT_STORAGE_CLIENT`/`OBJECT_STORAGE_CONFIG` (símbolos
  de DI internos) + `createS3Client(config)`. **Deliberadamente não
  reexportados pelo barrel** (`index.ts`) — mesma disciplina já aplicada a
  `REDIS_CONNECTION` (BE-05) e `KYSELY_CONNECTION` (correção de
  `QA-BUG-002`, BE-03): o Object Storage guarda laudo/imagem de paciente, e
  um cliente S3 de uso geral exposto livremente a qualquer provider do
  NestJS permitiria, numa implementação futura descuidada, ler/escrever
  qualquer objeto do bucket por fora de `ObjectStorageService` — inclusive
  contornando a garantia de "acesso só via URL assinada de curta duração"
  chamando `GetObjectCommand` diretamente sem expiração.
- `object-storage.service.ts` — `ObjectStorageService`, único ponto de
  acesso exposto:
  - `getReadSignedUrl(key, expirySecondsOverride?)`: gera a URL assinada de
    leitura. Rejeita `key` vazia e expiração inválida (não-inteiro, `<= 0`
    ou acima do teto) **antes** de chamar o SDK. Usa
    `config.signedUrlTtlSeconds` quando nenhum override é informado.
  - `putObject(key, body, contentType?)`: abstração mínima de upload,
    reforçando `ServerSideEncryption: 'aws:kms'` em runtime como defesa em
    profundidade sobre a bucket policy real (`DenyUnEncryptedObjectUploads`,
    `infra/modules/object-storage/main.tf`).
- `object-storage.module.ts` — `ObjectStorageModule`, fornece
  `ObjectStorageService` via `useFactory`/`loadObjectStorageConfig()`;
  `onModuleDestroy` chama `client.destroy()` (libera o agente HTTP interno
  do `S3Client`).

`ObjectStorageModule` não é importado em `AppModule` nesta tarefa — mesmo
padrão de `DatabaseModule`/`RedisModule`/`QueueModule`: nenhum bounded
context ainda o consome; BE-07/BE-21/BE-22/BE-23 importam quando
precisarem.

## `OBJECT_STORAGE_ENDPOINT` é bloqueado em `production`/`staging` (correção pós-revisão)

Achado mais sério de uma revisão pós-implementação: `OBJECT_STORAGE_ENDPOINT`
sobrescreve o endpoint real usado pelo `S3Client` e **ganha prioridade
sobre `region`** quando os dois estão setados — então um `.env` mal
configurado (ex.: copiado de um setup local com LocalStack) aplicado por
engano em `staging`/`production` faria todo o tráfego S3 (upload e geração
de URL assinada) ir para um host fora do Brasil/fora da AWS, **contornando
silenciosamente** a validação de `OBJECT_STORAGE_REGION`
(`KNOWN_BRAZIL_REGIONS`) — essa validação só olha a string da região, não o
destino real do tráfego.

Corrigido em `loadObjectStorageConfig`
(`assertEndpointOverrideAllowed`, `object-storage-config.ts`): qualquer
`OBJECT_STORAGE_ENDPOINT` informado é rejeitado (erro explícito na
inicialização) quando `NODE_ENV` é um de `PRODUCTION_LIKE_NODE_ENVS`
(`"production"`, `"staging"`) — a mesma variável e os mesmos valores
literais que `infra/environments/{staging,production}/main.tf` já define
explicitamente na task definition do ECS (`NODE_ENV = "production"`/
`"staging"`), convenção já existente no projeto para diferenciar ambiente
real de dev/teste local, em vez de inventar uma flag nova. Nenhuma outra
variável de ambiente desativa esta checagem — não existe um "modo de
bypass" configurável.

## Teto de expiração — decisão de detalhe do Backend (`TASK.md` §1.7-style)

Nenhum artefato de origem (`PRD-TECNICO.md`, `SDD.md`, `UX-SPEC.md`) fixa a
duração da URL assinada — só o `GUARDRAILS.md` item 23 exige "curta
duração, nunca URL pública permanente". Decisão adotada, dentro da
autoridade do Backend:

- **Default: 300s (5 min)**, configurável via
  `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS` — suficiente para o navegador
  carregar/exibir um laudo/imagem (RF-06/RF-07) sem reautenticação
  perceptível, sem manter a URL válida por mais tempo do que o necessário.
- **Teto de 900s (15 min), `MAX_SIGNED_URL_TTL_SECONDS`, não configurável
  por env** — tanto o default quanto qualquer `expirySecondsOverride`
  explícito passado por um chamador futuro são validados contra este teto.
  Um teto configurável por variável de ambiente deixaria de ser uma
  garantia estrutural (alguém poderia "configurar" uma URL de 7 dias, o
  teto técnico do próprio SigV4, e isso violaria o espírito de "curta
  duração" do `GUARDRAILS.md` item 23 mesmo não sendo tecnicamente uma URL
  "pública permanente"). Este valor é o teto superior da faixa sugerida
  como razoável (5-15 min) para este tipo de decisão.
- O link de compartilhamento de 72h (RN-06) **não** é implementado
  estendendo este TTL — é um mecanismo de aplicação totalmente diferente
  (token opaco + expiração armazenados no PostgreSQL), fora do escopo desta
  tarefa (ver `SDD.md` §2.3). Quando esse token válido é acessado, a URL
  assinada do S3 gerada para servir o arquivo continua curta (minutos),
  não 72h.

## Validação de região em código (defesa em profundidade)

`loadObjectStorageConfig` rejeita qualquer `OBJECT_STORAGE_REGION` fora de
`KNOWN_BRAZIL_REGIONS` (hoje só `sa-east-1`, a região que `DEPLOY.md` §2
efetivamente escolheu). Isso não substitui a garantia real (a
infraestrutura só existe onde o Terraform a provisionou) — é uma camada de
aplicação adicional e barata, mesmo raciocínio já aplicado à RLS
(ADR-006/SPK-04: "RLS mal configurado gera falso senso de segurança —
nunca a única camada"). Se uma nova região Brasil legítima precisar ser
suportada no futuro (ex.: mudança de provedor), isso é uma alteração de
uma linha nesta constante, não um mecanismo de bypass — deliberadamente
**não** existe nenhuma variável de ambiente para desativar esta validação.

## Como os testes validam a infraestrutura

**Unitário** (`src/object-storage/*.spec.ts`, sem rede real):

- `object-storage-config.spec.ts` (23 testes): defaults, obrigatoriedade de
  `OBJECT_STORAGE_BUCKET`, validação de região (allow-list), parsing de
  `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS` (inválido e acima do teto),
  endpoint/credenciais customizados, o gate de `OBJECT_STORAGE_ENDPOINT`
  em `production`/`staging` (correção pós-revisão, seção acima) e a
  validação estrita de `OBJECT_STORAGE_FORCE_PATH_STYLE` (correção
  pós-revisão, só aceita literalmente `"true"`/`"false"`).
- `../config/parse-env.spec.ts` (15 testes): `parsePositiveInt`/
  `parseStrictBoolean` — helpers compartilhados com `redis-config.ts`
  (extraídos nesta correção para eliminar duplicação, ver seção abaixo).
- `object-storage.service.spec.ts` (11 testes): `getSignedUrl`
  (`@aws-sdk/s3-request-presigner`) e o `S3Client` são dublês —
  valida que `key`/expiração inválidos nunca chegam a chamar o SDK, que o
  TTL default é usado quando nenhum override é informado, que um override
  válido é repassado corretamente, e que `putObject` sempre define
  `ServerSideEncryption: 'aws:kms'`.

**Integração** (`test/object-storage/object-storage-infrastructure.e2e-spec.ts`,
6 testes) — **LocalStack via `@testcontainers/localstack`**
(`localstack/localstack:3`), não mock do AWS SDK. Docker já está
disponível no ambiente de execução (mesmo Docker usado pelos containers
PostgreSQL/Redis de BE-02/BE-03/BE-04/BE-05) — LocalStack provou-se viável
(imagem baixada e container inicializado com sucesso), então não há
necessidade de recorrer a um mock de SDK para o teste de integração, que
teria menor confiança (nunca exercitaria a assinatura SigV4 real):

1. `putObject` grava um objeto real e `getReadSignedUrl` gera uma URL que
   **de fato funciona** via `fetch` HTTP real (GET 200, corpo idêntico).
2. A URL sempre contém `X-Amz-Signature`/`X-Amz-Expires` (prova de que é
   assinada, nunca uma URL pública nua) — removendo a assinatura da query
   string, a mesma URL passa a falhar (`>= 400`).
3. TTL default (300s) aparece corretamente em `X-Amz-Expires` quando
   nenhum override é passado.
4. Um override curto (1s) é embutido corretamente em `X-Amz-Expires=1` e
   funciona dentro do prazo. **Limitação conhecida documentada**: este
   teste não afirma que a URL deixa de funcionar depois do prazo contra o
   LocalStack — o S3 do LocalStack tem um bug de longa data, não corrigido
   até a versão usada aqui, em que `X-Amz-Expires` não é de fato
   enforced (issues públicas: `localstack/localstack#7840`, `#9538`,
   `#2493`, `#1685`). A geração/validação de assinatura SigV4 em si é
   inteiramente delegada a `@aws-sdk/s3-request-presigner` — a mesma
   biblioteca usada contra o S3 real da AWS em produção — então a garantia
   de expiração real depende da implementação SigV4 do provedor real, não
   reimplementada por este projeto. Testar a aplicação de verdade contra a
   AWS real ficaria fora do escopo de um teste automatizado de CI (custo,
   credenciais reais, rede externa).
5. `ObjectStorageModule` (via `@nestjs/testing`, configurado só por env)
   fornece um `ObjectStorageService` funcional de ponta a ponta.
6. O barrel público (`src/object-storage/index.ts`) não exporta
   `OBJECT_STORAGE_CLIENT`/`OBJECT_STORAGE_CONFIG` — mesma verificação de
   regressão já usada para `REDIS_CONNECTION`/`KYSELY_CONNECTION`.

Nenhuma mudança foi necessária em `.github/workflows/backend-ci.yml` —
`testcontainers` gerencia o próprio container LocalStack via o Docker do
host, o mesmo Docker que já roda os containers PostgreSQL/Redis das
tarefas anteriores no runner `ubuntu-latest`.

## `parsePositiveInt`/`parseStrictBoolean` compartilhados (`src/config/parse-env.ts`)

Achado de revisão pós-implementação: `parsePositiveInt` estava duplicado
literalmente (mesmo corpo, mesma mensagem de erro) em
`redis-config.ts` (BE-05) e `object-storage-config.ts` (BE-08) — dois
arquivos novos da mesma leva de tarefas. Extraído para
`src/config/parse-env.ts` (funções puras, sem estado, sem dependência de
NestJS — não é um bounded context nem precisa de módulo de DI) e
reutilizado nos dois lugares, eliminando o risco de os dois validadores
divergirem silenciosamente ao longo do tempo. `parseStrictBoolean` (novo,
mesmo arquivo) substitui o `parseBoolean` lenient que existia só em
`object-storage-config.ts` — ver seção seguinte.

## `OBJECT_STORAGE_FORCE_PATH_STYLE` — validação estrita (correção pós-revisão)

O `parseBoolean` original retornava `false` silenciosamente para qualquer
valor não reconhecido (ex.: `"True"`, `"1"`), inconsistente com a filosofia
de falha explícita já aplicada a `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS`
(`parsePositiveInt`) — um valor de configuração provavelmente errado
resolveria para `false` sem aviso, causando uma falha confusa do SDK
contra um provedor path-style-only (ex.: LocalStack) em vez de um erro de
configuração claro na inicialização. Substituído por
`parseStrictBoolean` (`src/config/parse-env.ts`): só aceita literalmente
`"true"`/`"false"`; qualquer outro valor lança erro explícito citando o
nome da variável.

## Configuração (`.env.example`)

| Variável | Default (dev) | Uso |
|---|---|---|
| `OBJECT_STORAGE_BUCKET` | (obrigatório, sem default) | Nome do bucket S3 (provisionado pelo DevOps, `infra/modules/object-storage/`) |
| `OBJECT_STORAGE_REGION` | `sa-east-1` | Região de nuvem — só regiões Brasil conhecidas são aceitas (ADR-010/GUARDRAILS.md item 24) |
| `OBJECT_STORAGE_ENDPOINT` | (vazio → endpoint padrão da AWS) | Só para S3-compatível local/teste (ex.: LocalStack) — **rejeitado na inicialização se `NODE_ENV` for `production`/`staging`** |
| `OBJECT_STORAGE_FORCE_PATH_STYLE` | `false` | Só `"true"`/`"false"` literal (validação estrita); exigido por provedores S3-compatíveis sem virtual-hosted-style (ex.: LocalStack) |
| `OBJECT_STORAGE_ACCESS_KEY_ID` / `OBJECT_STORAGE_SECRET_ACCESS_KEY` | (vazio → cadeia padrão do SDK) | Só dev/teste; produção usa IAM role da task ECS (`DEPLOY.md` §3.1), nunca secret literal |
| `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS` | `300` (5 min) | Duração da URL assinada de leitura quando nenhum override é informado; teto de 900s (15 min) não configurável |
