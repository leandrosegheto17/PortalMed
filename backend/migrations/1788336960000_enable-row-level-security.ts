import type { MigrationBuilder } from 'node-pg-migrate';
import { DOMAIN_TABLES } from '../src/database/domain-tables.js';

/**
 * BE-03 (`TASK.md`) — Row-Level Security como **segunda camada** de
 * isolamento multi-tenant, independente do guard de aplicação
 * (`TenantScopedRepository`, `src/database/tenant-scoped.repository.ts`) —
 * GUARDRAILS.md regra A.3 / ADR-004 / ADR-006.
 *
 * Uma política por tabela de domínio (a mesma `DOMAIN_TABLES` que BE-02 já
 * usa em `test/migrations/schema.e2e-spec.ts`, evitando uma tabela nova
 * ficar de fora):
 *
 * - `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`: `FORCE` é o
 *   que faz a política valer mesmo para o dono da tabela (por padrão o
 *   Postgres isenta o dono) — defesa em profundidade adicional, ainda que a
 *   aplicação em runtime já conecte com a role `portalmed_app`
 *   (não-dona, criada pela migration anterior), não com a role de
 *   migration/dono das tabelas.
 * - Política restrita à role `portalmed_app` (não `PUBLIC`) — é a única
 *   role com a qual a aplicação se conecta em runtime (ver
 *   `DatabaseModule`); a role de migration/admin nunca deveria estar sujeita
 *   a esta política (ela roda DDL, não DML de request de usuário).
 * - `USING` (linhas visíveis a SELECT/UPDATE/DELETE) e `WITH CHECK` (linhas
 *   permitidas em INSERT/UPDATE) usam a mesma expressão:
 *   `tenant_id = current_setting('app.tenant_id', true)::uuid`. O segundo
 *   argumento `true` de `current_setting` (`missing_ok`) faz a variável de
 *   sessão ausente devolver `NULL` em vez de lançar erro — e
 *   `tenant_id = NULL` nunca é verdadeiro, então a política **falha
 *   fechada**: se o guard de aplicação esquecer de popular
 *   `app.tenant_id` (via `set_config`, ver `TenantScopedRepository`), a
 *   política nega todo acesso, em vez de liberar por omissão.
 * - `WITH CHECK` também impede que um `UPDATE` reatribua `tenant_id` da
 *   linha para outro tenant — mesma garantia que o guard de aplicação já
 *   aplica descartando `values.tenant_id` recebido do chamador (defesa em
 *   profundidade, não redundância inútil: cada camada bloqueia
 *   independentemente do estado da outra).
 */
const POLICY_NAME = 'tenant_isolation_policy';
const APP_ROLE = 'portalmed_app';
const TENANT_ID_EXPRESSION = "tenant_id = current_setting('app.tenant_id', true)::uuid";

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const table of DOMAIN_TABLES) {
    pgm.alterTable(table, { levelSecurity: 'ENABLE' });
    pgm.alterTable(table, { levelSecurity: 'FORCE' });

    pgm.createPolicy(table, POLICY_NAME, {
      role: APP_ROLE,
      using: TENANT_ID_EXPRESSION,
      check: TENANT_ID_EXPRESSION,
    });
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const table of DOMAIN_TABLES) {
    pgm.dropPolicy(table, POLICY_NAME);
    pgm.alterTable(table, { levelSecurity: 'NO FORCE' });
    pgm.alterTable(table, { levelSecurity: 'DISABLE' });
  }
}
