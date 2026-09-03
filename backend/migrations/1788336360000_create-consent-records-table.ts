import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 / §7.6 — CONSENT_RECORD: registro append-only (RN-02,
 * GUARDRAILS.md item 28 — "PROIBIDO qualquer UPDATE/DELETE sobre
 * consentimento já registrado, correção é sempre novo registro"). Sem
 * coluna `updated_at` propositalmente — a imutabilidade é comunicada pelo
 * próprio desenho da tabela; a restrição de privilégio de banco (revogar
 * UPDATE/DELETE da role de aplicação) segue o mesmo padrão de
 * `audit_events` e fica para a tarefa que implementa a lógica de
 * persistência (BE-19), não para BE-02 (só schema).
 *
 * `tipo` distingue explicitamente consentimento de dado de saúde do aceite
 * geral de Termos de Uso (RN-02/GUARDRAILS.md item 25 — nunca um campo
 * único combinado).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('consent_records', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      references: 'tenants',
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
    },
    terms_version_id: {
      type: 'uuid',
      notNull: true,
      references: 'terms_versions',
    },
    tipo: {
      type: 'varchar(40)',
      notNull: true,
      check: "tipo IN ('termos_uso', 'consentimento_dado_saude')",
    },
    aceito_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('consent_records', 'tenant_id');
}
