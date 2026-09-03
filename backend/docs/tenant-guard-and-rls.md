# Guard de aplicação de `tenant_id` + Row-Level Security — BE-03 (`TASK.md`)

Duas camadas **independentes** de isolamento multi-tenant sobre o schema de
BE-02 (`GUARDRAILS.md` regras A.2/A.3, ADR-004, ADR-006). Nenhuma lógica de
negócio de domínio (BE-10+) está aqui — só a infraestrutura de acesso a
dado que toda tarefa de domínio futura vai reaproveitar.

## Camada de acesso a dado escolhida: Kysely (query builder tipado, não ORM)

BE-02 deliberadamente não escolheu ORM/query builder (`backend/docs/
migrations.md`: "TypeORM, Prisma ou Kysely + node-pg-migrate" eram as
opções em aberto). Esta tarefa escolhe **Kysely**, dentro da autoridade do
Backend:

- **Não** TypeORM/Prisma (ORM completo): ambos assumem que o schema nasce
  de/gera o próprio schema (`schema.prisma`, decorators de entidade) —
  conflitaria com `node-pg-migrate` já escolhido em BE-02 como fonte única
  de verdade do schema (SQL puro via `MigrationBuilder`). Duplicar o schema
  em dois lugares (migrations + entidades ORM) é exatamente o tipo de
  acoplamento prematuro que BE-02 evitou ao não fixar um ORM só para criar
  tabelas.
- **Kysely** é um query builder SQL, não um ORM — tipado (TypeScript puro,
  sem decorators/codegen), funciona sobre o driver `pg` que o projeto já
  usa (BE-02/BE-01), e não impõe nenhum mecanismo próprio de migration
  (continua sendo o `node-pg-migrate` de BE-02). O único acoplamento novo é
  a tipagem do schema (`src/database/schema.ts`), que é só TypeScript — sem
  gerar/sincronizar arquivo nenhum.
- Kysely também permite plugar `set_config('app.tenant_id', ...)` dentro da
  mesma transação da query real (ver guard abaixo) de forma direta via `sql`
  tagged template, sem exigir um hook/middleware específico de ORM.

## Guard de aplicação — estrutural, não convenção

`TenantScopedRepository` (`src/database/tenant-scoped.repository.ts`) é a
única forma sancionada de tocar uma tabela de domínio:

1. **`db` (a conexão Kysely) e `runOnTable` (o único ponto que abre
   transação/aplica o filtro de `tenant_id`) são campos/métodos privados
   nativos do JavaScript (`#db`/`#runOnTable`, ES2022+)** — não a
   palavra-chave `private` do TypeScript. **Correção de `QA-BUG-001`
   (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6, 2026-09-03)**: a versão
   original usava `private readonly db` (TypeScript), que é apagado em
   tempo de compilação e não é uma barreira de runtime — o QA provou
   empiricamente que uma subclasse contornava o guard via
   `(this as unknown as { db: unknown }).db as any`, sem precisar importar
   `kysely`/`pg` (logo sem violar a regra de lint abaixo), executando uma
   query real sem `TenantContext.run()` ativo e sem
   `MissingTenantContextError`. A RLS (camada independente) impediu
   vazamento de dado real nesse teste específico, mas o guard de aplicação
   em si foi contornado. Com `#db`/`#runOnTable`, o mesmo cast acessa uma
   propriedade comum inexistente (`undefined`) e a chamada seguinte lança
   `TypeError` em runtime — nenhuma subclasse (repositório concreto de uma
   tarefa de domínio futura) acessa `this.#db`/`this.#runOnTable`
   diretamente; só os métodos protegidos (`findAll`/`findById`/`insert`/
   `updateById`/`deleteById`), que sempre passam pelo guard. Teste de
   regressão adversarial dedicado (réplica literal do vetor do QA) em
   `test/database/tenant-guard-and-rls.e2e-spec.ts`.
2. O construtor recebe a conexão como **`unknown`**, não como
   `Kysely<Database>` — reforçado pela regra de lint
   `no-raw-kysely-outside-database` (`src/tooling/eslint-rules/`), que
   proíbe qualquer arquivo fora de `src/database/` de importar o pacote
   `kysely`/`pg` — então nem o import necessário para escrever um cast
   indevido está disponível fora deste diretório.
3. **Toda operação exige `TenantContext.requireTenantId()` antes de abrir
   qualquer transação** (`src/database/tenant-context.ts`, baseado em
   `AsyncLocalStorage`) — lança `MissingTenantContextError` e a query nunca
   chega a ser montada, muito menos executada.
4. Toda query aplica `.where('tenant_id', '=', tenantId)` explicitamente
   (filtro de aplicação) **e** roda dentro de uma transação que primeiro
   executa `select set_config('app.tenant_id', tenantId, true)` (equivalente
   a `SET LOCAL`, escopado à transação) — é o que a política RLS (abaixo)
   usa como segunda camada.
5. `insert`/`updateById` sempre descartam um `tenant_id` vindo do chamador
   e usam o do `TenantContext` — impede reatribuir uma linha para outro
   tenant via `UPDATE` (reforçado pela cláusula `WITH CHECK` da política).

Quem popula o `TenantContext` a partir da sessão autenticada real (cookie
`HttpOnly`/Redis, ADR-007) é responsabilidade de uma tarefa futura de
Identity & Access (BE-14 sessão / BE-16 RBAC) — não há wiring de middleware
HTTP nesta tarefa porque não existe sessão/autenticação implementada ainda.
O critério de aceite de BE-03 é "o guard existe e é testado", não "a sessão
popula o guard".

## Registro de repositório concreto de domínio — `provideTenantScopedRepository` (correção de `QA-BUG-002`)

**Correção de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1,
2026-09-03)**: até esta correção, o token de injeção `KYSELY_CONNECTION`
(`src/database/kysely-connection.ts`) era reexportado pelo barrel público
`src/database/index.ts` para que um repositório concreto de domínio
(BE-10+) pudesse `@Inject(KYSELY_CONNECTION)` no próprio construtor e
repassar a `super(...)`. O QA provou empiricamente, contra Postgres real via
`@nestjs/testing` + testcontainers, que isso também permitia que
**qualquer** provider comum do NestJS — sem estender
`TenantScopedRepository`, sem importar `kysely`/`pg` (logo sem violar
`no-raw-kysely-outside-database`) e sem `TenantContext.run()` ativo —
injetasse a mesma conexão real e executasse uma query. RLS conteve o
impacto real (0 linhas, falha fechada), mas o guard de aplicação foi
genuinamente contornado — o mesmo padrão estrutural de `QA-BUG-001`.

Correção: `KYSELY_CONNECTION` deixou de ser reexportado por `index.ts`.
Módulos de domínio agora registram seu repositório concreto usando a função
fábrica `provideTenantScopedRepository` (`src/database/
provide-tenant-scoped-repository.ts`), sem nunca referenciar
`KYSELY_CONNECTION`:

```ts
// src/modules/catalogo-exames/exams.repository.ts
export class ExamsRepository extends TenantScopedRepository<'exams'> {
  constructor(connection: unknown) {
    super(connection, 'exams');
  }
}

// src/modules/catalogo-exames/catalogo-exames.module.ts
@Module({
  imports: [DatabaseModule],
  providers: [provideTenantScopedRepository(ExamsRepository)],
  exports: [ExamsRepository],
})
export class CatalogoExamesModule {}
```

A injeção do token continua acontecendo (`useFactory` + `inject:
[KYSELY_CONNECTION]`) — mas inteiramente dentro de `src/database/`; o
módulo de domínio só repassa a classe do próprio repositório, nunca o
token.

**Defesa complementar (fecha a lacuna residual do import "por fora" do
barrel)**: remover a reexportação do barrel não impede, por si só, um
import relativo profundo apontando direto para `kysely-connection.ts`
(nada no sistema de módulos do Node/TypeScript bloqueia isso). A nova regra
de lint `boundary/no-kysely-connection-token-outside-database`
(`src/tooling/eslint-rules/`, mesmo estilo de
`no-raw-kysely-outside-database`) proíbe qualquer referência ao
identificador `KYSELY_CONNECTION` fora de `src/database/` — import direto,
renomeado, re-export ou desestruturação de import dinâmico —, tornando esse
caminho residual visível em CI (`npm run lint:boundaries`,
`--max-warnings=0`), mesmo que a capacidade técnica de resolver o mesmo
`Symbol` por identidade (não por nome de export) não possa ser eliminada só
por análise estática.

Teste de regressão adversarial dedicado (réplica literal do
`NotARepositoryService` do relato do QA) em
`test/database/tenant-guard-and-rls.e2e-spec.ts` (descrição
`[QA-BUG-002]`) e em
`src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.spec.ts`.

## Row-Level Security — segunda camada independente

Migration `enable-row-level-security` (`backend/migrations/
..._enable-row-level-security.ts`), uma política por tabela de
`DOMAIN_TABLES` (mesma lista de BE-02):

- `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` (a política vale
  mesmo para o dono da tabela).
- Política `tenant_isolation_policy`, restrita à role `portalmed_app`
  (não `PUBLIC`), `USING`/`WITH CHECK` com
  `tenant_id = current_setting('app.tenant_id', true)::uuid` — o segundo
  argumento (`missing_ok = true`) faz a variável ausente devolver `NULL`
  em vez de erro, e `tenant_id = NULL` nunca é verdadeiro: a política
  **falha fechada** se o guard esquecer de popular `app.tenant_id`.

### Por que existe uma role de runtime dedicada (`portalmed_app`)

Migration `create-app-database-role`
(`backend/migrations/..._create-app-database-role.ts`). Row-Level Security
**não tem efeito sobre o dono da tabela nem sobre superusuário** — nem com
`FORCE` (a exceção de superusuário nunca é afastada). Sem uma role dedicada
e sem privilégio de DDL:

- Testar RLS conectando com a mesma role que rodou as migrations validaria
  uma política que nunca é realmente aplicada em produção — o "falso senso
  de segurança" que ADR-006 nomeia como risco.
- `DatabaseModule` (`src/database/database.module.ts`) só conecta via
  `APP_DATABASE_URL` (role `portalmed_app`) — nunca `DATABASE_URL` (role de
  migration/admin, só usada por `node-pg-migrate`). Ver `.env.example`.
- Privilégio de `portalmed_app`: `SELECT` em `tenants` (leitura, sem
  onboarding de hospital em runtime); `SELECT/INSERT/UPDATE/DELETE` nas 11
  tabelas "normais" de `DOMAIN_TABLES`; `SELECT/INSERT` (nunca
  `UPDATE`/`DELETE`) em `audit_events`/`consent_records` — restrição
  append-only exigida por ADR-009/`GUARDRAILS.md` itens 18/28, em vigor
  desde a própria migration que concede o privilégio à role
  (`create-app-database-role.ts`), não deferida para BE-19/BE-29. **Correção
  de `SEC-BUG-001` (`SECURITY-REVIEW.md` "Lote 3"/`BLOCKERS.md` Bloqueio
  004, 2026-09-03)**: a versão original desta migration concedia o
  privilégio completo (incluindo `UPDATE`/`DELETE`) também a estas duas
  tabelas, deferindo a restrição para BE-19/BE-29 sem seguir o processo de
  exceção de `GUARDRAILS.md` regras 37-39 e sem nenhuma camada compensatória
  ativa (a política RLS só restringe *quais linhas* são visíveis/alteráveis
  por tenant, nunca *o tipo de operação*) — achado de severidade Alta do
  DevSecOps, corrigido nesta migration; hash chain (`hash_evento_anterior`)
  e a lógica de negócio de consentimento continuam escopo de BE-29/BE-19,
  só a restrição de privilégio de banco foi antecipada. Teste de regressão
  permanente em `test/database/tenant-guard-and-rls.e2e-spec.ts`
  (`[SEC-BUG-001]`), consultando `has_table_privilege` diretamente.

## Como os testes validam as duas camadas

`test/database/tenant-guard-and-rls.e2e-spec.ts` — PostgreSQL real e
efêmero via `testcontainers` (mesmo padrão de BE-02); nenhum mock de
`pg`/Kysely, exigido pelo critério de aceite ("a validação de RLS/guard
exige banco real, não pode ser mockada"):

1. **RLS estrutural, em toda tabela de domínio**: `pg_class.relrowsecurity`/
   `relforcerowsecurity` + `pg_policies` — as 13 tabelas de `DOMAIN_TABLES`.
2. **RLS como camada independente do guard**: `pg.Client` cru conectado
   como `portalmed_app`, sem nenhum uso de Kysely/`TenantScopedRepository`
   — prova que a política em si isola (sem `app.tenant_id` → 0 linhas;
   tenant A → só linhas do tenant A; tenant B → só linhas do tenant B; em
   duas tabelas de formato diferente, `exception_queue_items` e
   `branding_configs`), e que `INSERT`/`UPDATE` cross-tenant são rejeitados
   pelo `WITH CHECK`. Um teste de contraste demonstra que a role de
   migration/superusuário **não** é restringida pela mesma política — é o
   motivo pelo qual `DatabaseModule` nunca conecta com ela.
3. **Guard de aplicação estrutural**: via uma subclasse de teste de
   `TenantScopedRepository` — sem `TenantContext.run(...)` ativo, a chamada
   lança `MissingTenantContextError` **antes** de qualquer linha ser
   escrita (verificado contando linhas antes/depois); com contexto, um
   round-trip básico entre 2 tenants prova que o guard nunca vaza (inclusive
   um caso básico de "ID guessing" via `findById` do id de outro tenant —
   a suíte adversarial exaustiva, exigida pelo Gate 2 do CTO, é **BE-04**,
   tarefa separada); `insert()` descarta um `tenant_id` forjado pelo
   chamador; e um teste de regressão adversarial dedicado (`[QA-BUG-001]`)
   replica literalmente o cast que o QA usou para contornar o guard
   original (`(this as unknown as { db: unknown }).db as any`, e o
   equivalente contra `runOnTable`) e confirma que agora lança `TypeError`
   em runtime, sem tocar o banco — não só que o caminho feliz funciona.
4. **Reversibilidade**: `down` das duas migrations novas remove a role e as
   políticas sem deixar resíduo (mesmo padrão de BE-02).
5. **`[QA-BUG-002]` — token de DI não alcançável fora de `src/database/`**:
   import dinâmico do barrel público confirma, em runtime, que
   `KYSELY_CONNECTION` não é mais uma propriedade exportada de
   `src/database/index.ts`; réplica literal do `NotARepositoryService` do
   relato do QA prova que o `@Inject(KYSELY_CONNECTION)` obtido dessa forma
   agora falha na própria montagem do módulo de teste do NestJS (erro de
   injeção, `undefined` não corresponde a nenhum provider), sem tocar o
   banco; e um teste end-to-end separado prova que o padrão sancionado
   (`provideTenantScopedRepository`) continua funcionando integralmente —
   resolve o repositório concreto via DI real, e o guard de aplicação
   (`MissingTenantContextError`) continua ativo mesmo através do novo
   caminho de registro.
6. **`[SEC-BUG-001]` — privilégio de banco da role `portalmed_app` em
   `audit_events`/`consent_records`**: consulta direta a
   `has_table_privilege('portalmed_app', '<tabela>', 'UPDATE'/'DELETE')`
   confirma `false` para as duas tabelas append-only (e que `INSERT`/
   `UPDATE`/`DELETE` real via `pg.Client` cru, role `portalmed_app`,
   resultam em erro de permissão do Postgres — `SELECT`/`INSERT` continuam
   funcionando), e o mesmo teste confirma `has_table_privilege(...,
   'UPDATE'/'DELETE') = true` para as demais 11 tabelas de `DOMAIN_TABLES`
   (nenhuma regressão de escopo oposto). Regressão permanente para que uma
   futura reescrita desta migration (por BE-19/BE-29) não reintroduza o
   privilégio por descuido.

`src/database/tenant-context.spec.ts` (unitário, sem banco) cobre só o
mecanismo puro de `AsyncLocalStorage` (isolamento entre execuções
concorrentes, ausência de contexto, etc.) — o comportamento contra o banco
fica só no e2e acima, por exigência explícita do critério de aceite.

`src/tooling/eslint-rules/no-raw-kysely-outside-database-rule.spec.ts`
(`RuleTester`, mesmo padrão de BE-01) cobre a regra de lint que impede
import direto de `kysely`/`pg` fora de `src/database/`.
`src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.spec.ts`
(mesmo padrão `RuleTester`, correção de `QA-BUG-002`) cobre a regra que
impede qualquer referência ao identificador `KYSELY_CONNECTION` fora de
`src/database/` — incluindo a réplica literal do vetor do QA (import do
barrel e, adicionalmente, import "por fora" apontando direto para
`kysely-connection.ts`).

## BE-04 — suíte exaustiva de vazamento cruzado entre tenants (condição do Gate 2 do CTO)

`test/database/tenant-cross-leak-exhaustive.e2e-spec.ts` — PostgreSQL real e
efêmero via `testcontainers` (mesmo padrão de BE-02/BE-03). Diferença
deliberada em relação à suíte de BE-03 acima: aquela prova que a
infraestrutura *existe* e funciona numa amostra de 2 tabelas de formato
diferente; esta é a prova **exaustiva**, tabela por tabela, das 13 tabelas de
`DOMAIN_TABLES` (mesma fonte única de verdade — nenhuma tabela nova fica de
fora por divergência de lista), exigida por `GUARDRAILS.md` regra A.4.

Três tenants (2+, conforme o critério de aceite) com dados equivalentes em
toda tabela de domínio (`seedTenantFixture`, respeitando a cadeia real de
FKs do schema). Para cada uma das 13 tabelas, sob o contexto do tenant A e
usando o id de uma linha do tenant B (ID guessing), a suíte comprova que
`findAll`/`findById`/`updateById`/`deleteById` (via `TenantScopedRepository`)
nunca retornam/afetam o dado do tenant B — em **três camadas testadas de
forma independente** (cada uma isola qual defesa está de fato em ação, sem
depender do estado da outra):

1. **Guard + RLS juntas** (caminho real da aplicação): `TenantScopedRepository`
   sobre a conexão da role de runtime (`portalmed_app`).
2. **Guard sozinho**: mesma classe de repositório, mas sobre uma conexão do
   **superusuário** do container — que sempre ignora RLS, mesmo com `FORCE
   ROW LEVEL SECURITY` (a exceção de superusuário nunca é afastada por
   `FORCE`). Qualquer isolamento observado aqui só pode vir do filtro
   `.where('tenant_id', ...)` explícito do guard.
3. **RLS sozinha**: `pg.Client` cru, conectado como `portalmed_app`, sem
   nenhum uso de Kysely/`TenantScopedRepository`/filtro explícito — inclui
   `SELECT`/`UPDATE`/`DELETE` visando diretamente o id do tenant B, sem
   filtro de `tenant_id` na própria query, provando que só a política RLS
   já impede o acesso.

`[QA-DEBT-012]` (`QA-REPORT.md` Seção 1.6.2): a suíte também inclui um caso
de regressão **permanente** para o vetor residual de deep-import de
`KYSELY_CONNECTION` (o QA caracterizou esse vetor como fechado só por uma
barreira de CI/lint, não por barreira estrutural de compilador/runtime, e
recomendou que BE-04 o cobrisse para não depender só do job de lint
isolado). Dois arquivos reais são escritos temporariamente em
`src/modules/catalogo-exames/` (removidos ao final, defensivamente também no
início) — um com deep-import direto para `kysely-connection.ts`, outro com
import renomeado — e o `ESLint` real (API Node, mesma config de `npm run
lint:boundaries`) é executado contra eles, confirmando que a regra
`boundary/no-kysely-connection-token-outside-database` continua reportando
os dois. Um segundo teste injeta o `Symbol` real obtido pelo deep-import num
provider comum do NestJS (réplica do vetor original, mas via caminho
"por fora" do barrel, que efetivamente resolve um provider real — diferente
de `QA-BUG-002`, hoje fechado em tempo de compilação) e confirma que, mesmo
que o lint fosse ignorado, uma query sem `TenantContext.run()` ativo não
retorna nenhuma linha — a RLS (Camada 3 acima) permanece como contenção
final.

Script dedicado (`package.json`): `npm run test:tenant-isolation` — roda só
este arquivo (não a suíte e2e inteira), consumido pelo job
`tenant-isolation-test` de `.github/workflows/backend-ci.yml`
(`GUARDRAILS.md` regra A.4: bloqueante em todo PR que toque `backend/**`,
job separado do `lint-and-test` para o motivo da falha ficar inequívoco no
Checks do PR). Este mesmo arquivo também roda como parte de `npm run
test:e2e` (glob `**/*.e2e-spec.ts`), sem duplicar lógica — só o alvo do
script muda.

## Decisões de detalhe tomadas nesta tarefa (dentro da autoridade do Backend)

- **Tipagem do schema Kysely (`src/database/schema.ts`) é deliberadamente
  mínima**: só `id`/`tenant_id`/`created_at`/`updated_at` (quando existe) —
  as colunas de negócio de cada tabela (ex.: `exams.categoria`) ainda não
  têm nenhum consumidor de código real (nenhuma tarefa de domínio, BE-10+,
  foi implementada). Tipá-las agora seria generalizar tipagem para código
  que não existe (`TASK.md` §1.1, "Simplicidade"). BE-10+ estende este
  arquivo tabela por tabela, à medida que cada entidade real é
  implementada — decisão documentada para não ser lida como omissão.
- **Escape de tipo isolado dentro de `TenantScopedRepository.runOnTable`**:
  como o nome da tabela é um parâmetro de tipo genérico (`Table extends
  DomainTable`), o Kysely não resolve os overloads de `.where()`/`.set()`/
  `.values()` em tempo de compilação (limitação conhecida de query builders
  fortemente tipados com repositório genérico sobre schema heterogêneo) —
  o método privado escapa para um tipo `any` nomeado
  (`KyselyQueryEscapeHatch`), isolado nesta única função; a segurança de
  tipo permanece real para quem chama os métodos protegidos (assinaturas
  tipadas), e a segurança de runtime (o que este critério de aceite exige)
  não depende de tipagem estática — vem do `tenant_id` do `TenantContext` +
  filtro explícito + política RLS.
- **`portalmed_app` não recebe `bypassrls`** (fica `NOBYPASSRLS`, o
  default) — comentado explicitamente na migration para que uma edição
  futura não adicione o atributo sem perceber a implicação de segurança.
- **Senha de `portalmed_app` via `APP_DB_ROLE_PASSWORD`** (env, nunca
  hardcoded na migration), com default de desenvolvimento/teste explícito
  em `.env.example` — mesmo padrão de "valor provisório em configuração"
  já usado por `TASK.md` §1.7; produção usa o secret manager real
  (`SDD.md` §7.5).
