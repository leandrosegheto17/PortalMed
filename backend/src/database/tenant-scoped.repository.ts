import { Injectable } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { DOMAIN_TABLES, type DomainTable } from './domain-tables.js';
import type { Database } from './schema.js';
import { TenantContext } from './tenant-context.js';

/**
 * Linha genérica de tabela de domínio devolvida pelos métodos abaixo — as
 * colunas de negócio de cada tabela ainda não são tipadas (ver `schema.ts`),
 * então o retorno é `Record<string, unknown>` até BE-10+ refinar por tabela.
 */
export type DomainRow = Record<string, unknown>;

/**
 * Escape de tipo isolado (ver nota de tipagem na doc da classe abaixo) — só
 * usado dentro de `runOnTable`, nunca exposto a quem chama os métodos
 * protegidos (`findAll`/`findById`/`insert`/`updateById`/`deleteById`), que
 * continuam com assinatura totalmente tipada.
 */
type KyselyQueryEscapeHatch = any;

/**
 * Base de todo repositório de tabela de domínio (`TASK.md` BE-03 /
 * GUARDRAILS.md regra A.2 — "PROIBIDO escrever query manual que não passe
 * por esse guard, sem exceção"). Guard de aplicação **estrutural**, não
 * convenção documentada:
 *
 * 1. `db` (a conexão real do Kysely) e `runOnTable` (o único ponto que abre
 *    transação/aplica o filtro de `tenant_id`) são campos/métodos **privados
 *    nativos do JavaScript** (`#db`/`#runOnTable`, ES2022+, `tsconfig.json`
 *    usa `target: ES2023`) — não a palavra-chave `private` do TypeScript,
 *    que é apenas checagem de compilador e é apagada na compilação. Correção
 *    de `QA-BUG-001` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6): com
 *    `private` de TypeScript, uma subclasse conseguia contornar o guard via
 *    `(this as unknown as { db: unknown }).db as any`, sem precisar importar
 *    `kysely`/`pg` (logo sem violar a regra de lint abaixo) e sem passar por
 *    `#runOnTable`/`TenantContext`. Com `#db`/`#runOnTable`, esse mesmo cast
 *    acessa uma propriedade comum inexistente (`undefined`) — a chamada
 *    seguinte lança `TypeError` em runtime, não retorna a conexão real.
 *    Nenhuma subclasse (repositório concreto de uma tarefa de domínio
 *    futura) consegue acessar `this.#db`/`this.#runOnTable`; só os métodos
 *    protegidos abaixo (`findAll`/`findById`/`insert`/`updateById`/
 *    `deleteById`), que sempre passam pelo guard.
 * 2. O construtor recebe a conexão como `unknown`, não como
 *    `Kysely<Database>` — mesmo o código desta própria classe só faz o cast
 *    uma vez, no construtor; uma subclasse não tem o tipo `Kysely` disponível
 *    para montar uma query "por fora" sem um cast explícito e deliberado, e
 *    a regra de lint `no-raw-kysely-outside-database` proíbe qualquer
 *    arquivo fora de `src/database/` de importar o pacote `kysely` em si —
 *    então nem o import necessário para escrever esse cast está disponível
 *    fora deste diretório. Além disso, o construtor não usa
 *    `@Inject(KYSELY_CONNECTION)` — quem resolve o token de DI é
 *    `provideTenantScopedRepository` (`provide-tenant-scoped-repository.ts`),
 *    inteiramente dentro de `src/database/`. Correção de `QA-BUG-002`
 *    (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1): até esta correção,
 *    `KYSELY_CONNECTION` era reexportado pelo barrel público `index.ts` para
 *    que um repositório concreto pudesse `@Inject(KYSELY_CONNECTION)` no
 *    próprio construtor — o QA provou que isso também permitia que qualquer
 *    provider comum do NestJS, sem nenhuma relação com esta classe,
 *    injetasse a mesma conexão real diretamente, sem passar por nenhum dos
 *    itens 1/3/4 abaixo. Reforçado por
 *    `boundary/no-kysely-connection-token-outside-database`, que proíbe
 *    qualquer referência ao identificador `KYSELY_CONNECTION` fora de
 *    `src/database/`.
 * 3. Toda operação roda dentro de uma transação que primeiro executa
 *    `select set_config('app.tenant_id', tenantId, true)` — equivalente a
 *    `SET LOCAL app.tenant_id = tenantId`, escopado à transação — e depois a
 *    query já filtrada por `.where('tenant_id', '=', tenantId)`. As duas
 *    camadas (filtro de aplicação aqui + RLS no Postgres, ver migration
 *    `enable-row-level-security`) são **independentes**: a política RLS
 *    também nega a query mesmo que o `.where` explícito seja removido por
 *    engano num refactor futuro (é exatamente o cenário que ADR-004/ADR-006
 *    descrevem como razão de a RLS nunca ser a única camada).
 * 4. Nenhuma query aceita `tenant_id` vindo do chamador (`values.tenant_id`
 *    em `insert`/`updateById` é sempre descartado e substituído pelo
 *    `tenant_id` do `TenantContext`) — impede reatribuir uma linha para
 *    outro tenant via `UPDATE`, reforçado pela cláusula `WITH CHECK` da
 *    política RLS.
 *
 * Nenhuma query roda sem `tenant_id` do contexto: `TenantContext.
 * requireTenantId()` lança `MissingTenantContextError` **antes** de a
 * transação ser aberta — a ausência de contexto nunca chega ao banco.
 *
 * Nota de tipagem (Kysely): como `Table` (o nome da tabela) é um parâmetro
 * de tipo genérico desta classe — não um literal concreto —, o Kysely não
 * consegue resolver os overloads de `.where()`/`.set()`/`.values()` em
 * tempo de compilação (limitação conhecida de bibliotecas de query builder
 * fortemente tipadas com "repositório genérico sobre schema heterogêneo").
 * Os métodos abaixo escapam para `any` só na montagem da query (dentro de
 * `runOnTable`, isolado nesta classe) — a segurança de tipo continua real
 * para quem chama `findAll`/`findById`/`insert`/`updateById`/`deleteById`
 * (assinaturas tipadas), e a segurança de runtime (que é o que BE-03 exige)
 * não depende deste `any` — vem do `tenant_id` do `TenantContext` + do
 * filtro explícito + da política RLS, todos independentes de tipagem
 * estática. BE-10+, ao implementar um repositório concreto para uma tabela
 * específica (não mais genérica), pode voltar a ter tipagem plena se
 * desejar.
 */
@Injectable()
export abstract class TenantScopedRepository<Table extends DomainTable> {
  /**
   * Campo privado **nativo** do JavaScript (`#db`, ES2022+ — `tsconfig.json`
   * já usa `target: ES2023`), não a palavra-chave `private` do TypeScript.
   * Correção de `QA-BUG-001` (`QA-REPORT.md` Seção 1.6): `private` do
   * TypeScript é apagada em tempo de compilação — não é uma barreira real de
   * runtime — e uma subclasse conseguia contornar o guard acessando a
   * conexão via `(this as unknown as { db: unknown }).db as any`, sem violar
   * a regra de lint `no-raw-kysely-outside-database` (nenhum import de
   * `kysely`/`pg` é necessário para esse cast). Um campo `#db` não existe
   * como propriedade comum do objeto: o mesmo cast passa a acessar uma
   * propriedade `db` inexistente (`undefined`), e `undefined.transaction()`
   * lança `TypeError` em runtime — o vetor fica estruturalmente fechado, não
   * apenas desencorajado por convenção/lint. Ver teste de regressão
   * adversarial em `test/database/tenant-guard-and-rls.e2e-spec.ts`.
   */
  #db: Kysely<Database>;
  protected readonly table: Table;

  /**
   * A conexão chega como `unknown` — nunca via `@Inject(KYSELY_CONNECTION)`
   * neste construtor. Correção de `QA-BUG-002` (`TASK.md` BE-03/
   * `QA-REPORT.md` Seção 1.6.1): quem resolve o token de DI é
   * `provideTenantScopedRepository` (`provide-tenant-scoped-repository.ts`),
   * inteiramente dentro de `src/database/` — nem esta classe base nem
   * nenhuma subclasse (repositório concreto de domínio, BE-10+) referenciam
   * `KYSELY_CONNECTION` diretamente. Isso fecha o vetor em que qualquer
   * provider comum do NestJS conseguia `@Inject(KYSELY_CONNECTION)` no
   * próprio construtor, fora de qualquer relação com esta classe.
   */
  protected constructor(connection: unknown, table: Table) {
    if (!(DOMAIN_TABLES as readonly string[]).includes(table)) {
      throw new Error(
        `"${String(table)}" não é uma tabela de domínio conhecida (ver domain-tables.ts).`,
      );
    }
    this.#db = connection as Kysely<Database>;
    this.table = table;
  }

  /**
   * Único ponto desta classe onde a conexão é usada — sempre dentro de uma
   * transação que já populou `app.tenant_id` (RLS) antes de `work` rodar, e
   * sempre com `tenantId` do `TenantContext` (nunca do chamador).
   *
   * Também campo privado **nativo** (`#runOnTable`), pelo mesmo motivo do
   * `#db` acima: sendo o único ponto que aplica o filtro explícito
   * `.where('tenant_id', ...)` de aplicação (a RLS é a segunda camada,
   * independente), um `private` de TypeScript aqui permitiria que uma
   * subclasse chamasse este método via cast passando um `work` que
   * deliberadamente omite o filtro — a RLS ainda seguraria a query, mas a
   * camada de aplicação (o que o critério de aceite de BE-03 nomeia) teria
   * sido contornada da mesma forma que `QA-BUG-001` descreveu para `db`.
   */
  async #runOnTable<T>(
    work: (trx: KyselyQueryEscapeHatch, table: Table, tenantId: string) => Promise<T>,
  ): Promise<T> {
    const tenantId = TenantContext.requireTenantId();
    return this.#db.transaction().execute(async (trx) => {
      await sql`select set_config('app.tenant_id', ${tenantId}, true)`.execute(trx);
      return work(trx, this.table, tenantId);
    });
  }

  protected async findAll(): Promise<DomainRow[]> {
    return this.#runOnTable((trx, table, tenantId) =>
      trx.selectFrom(table).selectAll().where('tenant_id', '=', tenantId).execute(),
    );
  }

  protected async findById(id: string): Promise<DomainRow | undefined> {
    return this.#runOnTable((trx, table, tenantId) =>
      trx
        .selectFrom(table)
        .selectAll()
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .executeTakeFirst(),
    );
  }

  protected async insert(values: Record<string, unknown>): Promise<DomainRow> {
    const { tenant_id: _ignoredTenantId, ...rest } = values;
    return this.#runOnTable((trx, table, tenantId) =>
      trx
        .insertInto(table)
        .values({ ...rest, tenant_id: tenantId })
        .returningAll()
        .executeTakeFirstOrThrow(),
    );
  }

  protected async updateById(
    id: string,
    values: Record<string, unknown>,
  ): Promise<DomainRow | undefined> {
    const { tenant_id: _ignoredTenantId, ...rest } = values;
    return this.#runOnTable((trx, table, tenantId) =>
      trx
        .updateTable(table)
        .set(rest)
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirst(),
    );
  }

  protected async deleteById(id: string): Promise<number> {
    return this.#runOnTable(async (trx, table, tenantId) => {
      const result = await trx
        .deleteFrom(table)
        .where('tenant_id', '=', tenantId)
        .where('id', '=', id)
        .executeTakeFirst();
      return Number(result.numDeletedRows);
    });
  }
}
