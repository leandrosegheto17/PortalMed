import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — EXAM (o exame do paciente; raiz de `EXAM_RESULT`,
 * `SHARE_LINK` e `AUDIT_EVENT`).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('exams', {
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
    categoria: {
      type: 'varchar(30)',
      notNull: true,
      check: "categoria IN ('laboratorial', 'anatomopatologico', 'imagem')",
    },
    data_exame: { type: 'date', notNull: true },
    status: { type: 'varchar(30)', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('exams', 'tenant_id');
}
