import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — ACCOUNT (credencial de autenticação, 1:1 com `USER`,
 * `USER ||--o| ACCOUNT`). `tenant_id` não aparece na lista de atributos do
 * `SDD.md` (só `user_id`), mas o critério de aceite de BE-02/GUARDRAILS.md
 * regra A.1 exige a coluna em toda tabela de domínio, sem exceção — mesmo
 * quando o tenant já é alcançável transitivamente via `user_id` — para que o
 * guard de aplicação (BE-03) e a política de RLS (BE-03) filtrem por
 * `tenant_id` diretamente, sem depender de join.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('accounts', {
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
      unique: true, // 1:1 USER-ACCOUNT (SDD.md §5)
      references: 'users',
    },
    email: { type: 'varchar(320)', notNull: true },
    senha_hash: { type: 'varchar(255)', notNull: true },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'ativa',
      check: "status IN ('ativa', 'bloqueada', 'desativada')",
    },
    tentativas_falhas: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('accounts', 'accounts_tenant_id_email_unique', {
    unique: ['tenant_id', 'email'],
  });

  pgm.createIndex('accounts', 'tenant_id');
}
