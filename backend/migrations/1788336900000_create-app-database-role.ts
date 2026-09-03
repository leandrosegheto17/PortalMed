import type { MigrationBuilder } from 'node-pg-migrate';
import { DOMAIN_TABLES, TENANT_TABLE } from '../src/database/domain-tables.js';

/**
 * BE-03 (`TASK.md`) — cria a role de banco usada pela aplicação em runtime
 * (`portalmed_app`), distinta da role de migration/admin (`DATABASE_URL`,
 * usada só por `node-pg-migrate`/DDL). Duas razões:
 *
 * 1. Menor privilégio: a aplicação nunca precisa de DDL (`CREATE TABLE`
 *    etc.) em produção — só DML nas tabelas de domínio.
 * 2. **Row-Level Security só tem efeito real sobre uma role que não seja
 *    dona da tabela nem superusuário** — por padrão o Postgres isenta o
 *    dono da tabela e superusuários de qualquer política RLS, mesmo com
 *    `FORCE ROW LEVEL SECURITY` (a exceção de superusuário nunca é afastada
 *    por `FORCE`). Sem esta role dedicada, testar RLS conectando como a
 *    mesma role que rodou as migrations (super-usuário nos ambientes de
 *    teste, ex. `testcontainers`) validaria uma política que nunca é
 *    realmente aplicada em runtime — exatamente o "falso senso de
 *    segurança" que ADR-006 nomeia como risco.
 *
 * `password` vem de `APP_DB_ROLE_PASSWORD` (ambiente da migration, nunca
 * hardcoded) — default de desenvolvimento/teste explícito abaixo, igual ao
 * padrão de "valor provisório em configuração" de `TASK.md` §1.1; em
 * produção o valor real vem do secret manager (`SDD.md` §7.5), nunca deste
 * default.
 */
const APP_ROLE = 'portalmed_app';

export async function up(pgm: MigrationBuilder): Promise<void> {
  const password =
    process.env.APP_DB_ROLE_PASSWORD ?? 'portalmed_app_dev_only_change_me';

  pgm.createRole(APP_ROLE, {
    login: true,
    password,
    // Explícito por documentação, mesmo sendo o default do Postgres: esta
    // role NUNCA pode ignorar RLS (GUARDRAILS.md regra A.3).
    // (node-pg-migrate não expõe "nobypassrls" — omitir `bypassrls` já
    // resulta em NOBYPASSRLS, mas o comentário evita que uma edição futura
    // adicione `bypassrls: true` sem perceber a implicação de segurança.)
  });

  pgm.grantOnSchemas({
    schemas: 'public',
    privileges: 'USAGE',
    roles: APP_ROLE,
  });

  // Tenants: só leitura (resolução de identificador_integracao/tenant_id) —
  // criar/editar tenant é operação administrativa fora do escopo de runtime
  // da aplicação core (BE-03 não implementa onboarding de hospital).
  pgm.grantOnTables({
    tables: [TENANT_TABLE],
    privileges: ['SELECT'],
    roles: APP_ROLE,
  });

  // Toda tabela de domínio: SELECT/INSERT/UPDATE/DELETE. Exceção de
  // ADR-009/GUARDRAILS.md item 18 (audit_events nunca recebe GRANT
  // UPDATE/DELETE) é responsabilidade de BE-29 (tarefa dedicada de
  // auditoria, que já vai criar a lógica de hash chain) — mesmo padrão de
  // deferimento explícito já usado por BE-02 (`backend/docs/migrations.md`)
  // para não implementar lógica de negócio de auditoria fora do lugar.
  pgm.grantOnTables({
    tables: [...DOMAIN_TABLES],
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    roles: APP_ROLE,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.revokeOnTables({
    tables: [...DOMAIN_TABLES],
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    roles: APP_ROLE,
  });
  pgm.revokeOnTables({
    tables: [TENANT_TABLE],
    privileges: ['SELECT'],
    roles: APP_ROLE,
  });
  pgm.revokeOnSchemas({
    schemas: 'public',
    privileges: 'USAGE',
    roles: APP_ROLE,
  });
  pgm.dropRole(APP_ROLE);
}
