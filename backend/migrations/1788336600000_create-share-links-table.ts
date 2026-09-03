import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — SHARE_LINK (RF-09/RN-06/RN-07). `token` é único
 * globalmente — é ele o único ponto de resolução do endpoint público de
 * acesso via link (BE-28), sem contexto de tenant conhecido de antemão.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('share_links', {
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
    exam_id: {
      type: 'uuid',
      notNull: true,
      references: 'exams',
    },
    token: { type: 'varchar(255)', notNull: true, unique: true },
    expira_em: { type: 'timestamptz', notNull: true },
    revogado_em: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('share_links', 'tenant_id');
}
