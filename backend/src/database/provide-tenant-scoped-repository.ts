import type { Provider } from '@nestjs/common';
import { KYSELY_CONNECTION } from './kysely-connection.js';
import type { DomainTable } from './domain-tables.js';
import type { TenantScopedRepository } from './tenant-scoped.repository.js';

/**
 * Correção de `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1,
 * 2026-09-03): **única** forma sancionada de registrar um repositório
 * concreto de domínio (BE-10+) como provider do NestJS, sem que o módulo de
 * domínio precise (ou consiga) referenciar `KYSELY_CONNECTION` diretamente.
 *
 * Antes desta correção, `KYSELY_CONNECTION` era reexportado pelo barrel
 * público `src/database/index.ts` só para que um repositório concreto
 * pudesse `@Inject(KYSELY_CONNECTION)` no próprio construtor e repassar a
 * `super(...)`. O QA provou empiricamente que isso também permitia que
 * **qualquer** provider comum do NestJS (sem nenhuma relação com
 * `TenantScopedRepository`) injetasse a mesma conexão real e executasse uma
 * query sem `TenantContext.run()` ativo — sem violar `no-raw-kysely-
 * outside-database` (nenhum import de `kysely`/`pg`) e sem tocar `#db`/
 * `#runOnTable` (que já são privados nativos desde a correção de
 * `QA-BUG-001`). RLS conteve o impacto real, mas o guard de aplicação foi
 * genuinamente contornado.
 *
 * Com `provideTenantScopedRepository`, a injeção do token continua
 * acontecendo — mas inteiramente **dentro** de `src/database/`, via
 * `useFactory`: o Nest resolve `KYSELY_CONNECTION` normalmente (porque
 * `DatabaseModule` continua exportando o token, e o módulo de domínio
 * continua precisando importar `DatabaseModule`), mas quem instancia o
 * repositório concreto é esta função — nunca o próprio construtor do
 * repositório via `@Inject`. O construtor de um repositório concreto passa a
 * receber a conexão como parâmetro posicional comum (`connection: unknown`),
 * sem nenhum decorator, e nunca precisa importar `KYSELY_CONNECTION`:
 *
 * ```ts
 * // src/modules/catalogo-exames/exams.repository.ts
 * export class ExamsRepository extends TenantScopedRepository<'exams'> {
 *   constructor(connection: unknown) {
 *     super(connection, 'exams');
 *   }
 * }
 *
 * // src/modules/catalogo-exames/catalogo-exames.module.ts
 * @Module({
 *   imports: [DatabaseModule],
 *   providers: [provideTenantScopedRepository(ExamsRepository)],
 *   exports: [ExamsRepository],
 * })
 * export class CatalogoExamesModule {}
 * ```
 *
 * Reforçado por `boundary/no-kysely-connection-token-outside-database`
 * (`src/tooling/eslint-rules/`), que proíbe qualquer referência ao
 * identificador `KYSELY_CONNECTION` (import direto do barrel, import
 * renomeado, ou import "por fora" apontando direto para
 * `kysely-connection.ts`) fora de `src/database/` — mesmo que alguém tente
 * usar o caminho de arquivo interno em vez do barrel, a violação fica visível
 * em CI (`npm run lint:boundaries`, `--max-warnings=0`).
 */
export function provideTenantScopedRepository<
  Table extends DomainTable,
  Repository extends TenantScopedRepository<Table>,
>(RepositoryClass: new (connection: unknown) => Repository): Provider {
  return {
    provide: RepositoryClass,
    inject: [KYSELY_CONNECTION],
    useFactory: (connection: unknown) => new RepositoryClass(connection),
  };
}
