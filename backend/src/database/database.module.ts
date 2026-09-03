import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import type { Kysely } from 'kysely';
import { createKyselyConnection, KYSELY_CONNECTION } from './kysely-connection.js';
import type { Database } from './schema.js';

/**
 * Módulo de infraestrutura de acesso a dado (BE-03) — fornece a conexão
 * Kysely (via `KYSELY_CONNECTION`) consumida exclusivamente por
 * `provideTenantScopedRepository` (`provide-tenant-scoped-repository.ts`),
 * que registra o repositório concreto de cada módulo de domínio.
 *
 * `KYSELY_CONNECTION` continua exportado por este módulo (`exports:
 * [KYSELY_CONNECTION]`) porque `provideTenantScopedRepository` precisa
 * resolvê-lo via `inject: [KYSELY_CONNECTION]` a partir de qualquer módulo
 * de domínio que importe `DatabaseModule` — mas, desde a correção de
 * `QA-BUG-002` (`TASK.md` BE-03/`QA-REPORT.md` Seção 1.6.1), o token deixou
 * de ser reexportado pelo barrel público `src/database/index.ts`, então
 * nenhum código de domínio referencia `KYSELY_CONNECTION` diretamente — só
 * repassa a classe do próprio repositório para `provideTenantScopedRepository`.
 *
 * Conecta usando `APP_DATABASE_URL` (role `portalmed_app`, criada pela
 * migration `create-app-database-role`), **nunca** `DATABASE_URL` (role de
 * migration/admin, usada só por `node-pg-migrate`) — a aplicação em runtime
 * nunca deve rodar com uma role que tem privilégio de DDL, e a política RLS
 * (migration `enable-row-level-security`) é escrita especificamente para a
 * role `portalmed_app` (ver `backend/docs/tenant-guard-and-rls.md`).
 */
@Module({
  providers: [
    {
      provide: KYSELY_CONNECTION,
      useFactory: () => {
        const connectionString = process.env.APP_DATABASE_URL;
        if (!connectionString) {
          throw new Error(
            'APP_DATABASE_URL não configurada. A aplicação nunca conecta ao ' +
              'PostgreSQL usando a role de migration/admin (DATABASE_URL) — ' +
              'sempre com a role restrita de runtime (ver .env.example e ' +
              'backend/docs/tenant-guard-and-rls.md).',
          );
        }
        return createKyselyConnection(connectionString);
      },
    },
  ],
  exports: [KYSELY_CONNECTION],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(KYSELY_CONNECTION) private readonly connection: unknown) {}

  async onModuleDestroy(): Promise<void> {
    await (this.connection as Kysely<Database> | undefined)?.destroy?.();
  }
}
