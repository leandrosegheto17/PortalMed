import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — EXCEPTION_QUEUE_ITEM (RF-14: registro não descartável de
 * dado não associável a paciente conhecido; reaproveitada por BE-38 para
 * `RemoteAET` desconhecido — ADR-012/GUARDRAILS.md item 5). O payload de
 * cada caso de exceção (inclusive metadado de origem, como o `RemoteAET`
 * não cadastrado) fica em `payload_normalizado` (jsonb) — não é necessária
 * uma coluna nova por tipo de exceção nesta migration, mantendo o schema
 * proporcional ao que `SDD.md` §5 já define.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('exception_queue_items', {
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
    identificador_paciente_nao_localizado: { type: 'varchar(255)' },
    payload_normalizado: { type: 'jsonb', notNull: true },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pendente',
      check: "status IN ('pendente', 'resolvido')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('exception_queue_items', 'tenant_id');
}
