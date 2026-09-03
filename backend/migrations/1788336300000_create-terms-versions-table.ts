import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — TERMS_VERSION (texto versionado de Termos de Uso e/ou
 * consentimento de dado de saúde, referenciado por `CONSENT_RECORD`).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('terms_versions', {
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
    versao: { type: 'varchar(50)', notNull: true },
    conteudo: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('terms_versions', 'terms_versions_tenant_id_versao_unique', {
    unique: ['tenant_id', 'versao'],
  });

  pgm.createIndex('terms_versions', 'tenant_id');
}
