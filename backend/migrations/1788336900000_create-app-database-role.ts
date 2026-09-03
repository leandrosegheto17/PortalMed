import type { MigrationBuilder } from 'node-pg-migrate';
import { DOMAIN_TABLES, TENANT_TABLE } from '../src/database/domain-tables.js';

/**
 * `audit_events`/`consent_records` são append-only por design
 * (`GUARDRAILS.md` regras D.18/F.28, ADR-009, RN-08/RN-02 — LGPD) — a role
 * de runtime NUNCA pode receber `GRANT UPDATE`/`GRANT DELETE` nessas duas
 * tabelas, só `SELECT`/`INSERT`. Todas as demais tabelas de `DOMAIN_TABLES`
 * continuam com o privilégio completo (`SELECT`/`INSERT`/`UPDATE`/`DELETE`).
 *
 * **Correção de `SEC-BUG-001` (`SECURITY-REVIEW.md` "Lote 3"/`BLOCKERS.md`
 * Bloqueio 004, 2026-09-03)**: a versão original desta migration concedia o
 * privilégio completo a `[...DOMAIN_TABLES]` sem excluir estas duas tabelas,
 * deferindo a restrição para BE-19/BE-29 sem seguir o processo de exceção de
 * `GUARDRAILS.md` regras 37-39 — achado de severidade Alta do DevSecOps,
 * sem camada compensatória ativa (a política RLS restringe *quais linhas*,
 * nunca *o tipo de operação*). A restrição de privilégio não depende da
 * lógica de negócio de hash chain (BE-29) nem do fluxo de consentimento
 * (BE-19) — só precisa acompanhar a migration que já concede privilégio à
 * role (esta, BE-03).
 */
const APPEND_ONLY_TABLES = ['audit_events', 'consent_records'] as const;
const FULL_PRIVILEGE_DOMAIN_TABLES = DOMAIN_TABLES.filter(
  (table) => !(APPEND_ONLY_TABLES as readonly string[]).includes(table),
);

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

  // Tabelas de domínio "normais": SELECT/INSERT/UPDATE/DELETE.
  pgm.grantOnTables({
    tables: [...FULL_PRIVILEGE_DOMAIN_TABLES],
    privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
    roles: APP_ROLE,
  });

  // audit_events/consent_records: append-only por design (GUARDRAILS.md
  // D.18/F.28, ADR-009) — só SELECT/INSERT, nunca UPDATE/DELETE. Ver
  // comentário de `APPEND_ONLY_TABLES` acima (correção de `SEC-BUG-001`).
  pgm.grantOnTables({
    tables: [...APPEND_ONLY_TABLES],
    privileges: ['SELECT', 'INSERT'],
    roles: APP_ROLE,
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.revokeOnTables({
    tables: [...APPEND_ONLY_TABLES],
    privileges: ['SELECT', 'INSERT'],
    roles: APP_ROLE,
  });
  pgm.revokeOnTables({
    tables: [...FULL_PRIVILEGE_DOMAIN_TABLES],
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
