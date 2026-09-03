import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import type { Database } from './schema.js';

/**
 * Token de injeção interno para a conexão real do Kysely — **nunca**
 * reexportado por `index.ts` (barrel público de `src/database/`) desde a
 * correção de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1,
 * 2026-09-03). Só três arquivos deste diretório referenciam este símbolo:
 * este arquivo (declara), `database.module.ts` (fornece via `useFactory`) e
 * `provide-tenant-scoped-repository.ts` (injeta via `useFactory` de um
 * provider dedicado, repassando a um repositório concreto sem que o próprio
 * repositório precise conhecer o token).
 *
 * Histórico: até a correção de `QA-BUG-002`, este símbolo era reexportado
 * por `index.ts` para que um repositório concreto de domínio pudesse
 * `@Inject(KYSELY_CONNECTION)` no próprio construtor e repassar a
 * `super(...)`. O QA provou empiricamente que isso também permitia que
 * **qualquer** provider comum do NestJS (sem nenhuma relação com
 * `TenantScopedRepository`, sem importar `kysely`/`pg`, logo sem violar
 * `no-raw-kysely-outside-database`) injetasse a mesma conexão real e
 * executasse uma query sem `TenantContext.run()` ativo. RLS conteve o
 * impacto real, mas o guard de aplicação foi genuinamente contornado — o
 * mesmo padrão estrutural de `QA-BUG-001`. Ver `provideTenantScopedRepository`
 * (`provide-tenant-scoped-repository.ts`) para o padrão sancionado atual, e
 * `boundary/no-kysely-connection-token-outside-database`
 * (`src/tooling/eslint-rules/`) para o reforço em CI: qualquer referência a
 * este identificador fora de `src/database/` — mesmo via import "por fora"
 * do barrel, direto deste arquivo — é bloqueada.
 */
export const KYSELY_CONNECTION = Symbol('KYSELY_CONNECTION');

/**
 * Cria a instância real do Kysely sobre um `pg.Pool` — só chamada dentro de
 * `DatabaseModule`. Nenhum outro arquivo do projeto importa este módulo
 * diretamente.
 */
export function createKyselyConnection(connectionString: string): Kysely<Database> {
  const pool = new pg.Pool({ connectionString });
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}
