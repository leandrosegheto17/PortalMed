import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — TENANT: a única entidade do schema sem `tenant_id`
 * (GUARDRAILS.md regra A.1) — é ela própria a raiz do isolamento
 * multi-tenant. Toda outra tabela de domínio referencia `tenants(id)`.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('tenants', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    nome_institucional: { type: 'text', notNull: true },
    // Identificador usado pelos serviços de borda (Integration/Imaging
    // Gateway) para resolver a qual hospital um evento pertence — único no
    // sistema inteiro (decisão de detalhe, dentro da autoridade do Backend).
    identificador_integracao: { type: 'varchar(255)', notNull: true, unique: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
}
