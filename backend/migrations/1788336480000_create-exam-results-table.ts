import type { MigrationBuilder } from 'node-pg-migrate';

/** `SDD.md` §5 — EXAM_RESULT (resultado de um exame; contém 1+ EXAM_FILE). */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('exam_results', {
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
    formato: {
      type: 'varchar(20)',
      notNull: true,
      check: "formato IN ('pdf', 'html', 'jpeg_png')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('exam_results', 'tenant_id');
}
