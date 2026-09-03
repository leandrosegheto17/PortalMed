import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 / ADR-009 — AUDIT_EVENT: append-only, hash chain
 * (`hash_evento_anterior`). Sem `updated_at` propositalmente (imutável).
 *
 * `exam_id` e `ator_account_id` são nullable: nem todo evento é vinculado a
 * um exame (ex.: ação administrativa sobre conta) nem todo evento tem um
 * ator humano (ex.: falha de ingestão automática). `hash_evento_anterior` é
 * nullable porque o primeiro evento da cadeia de cada tenant não tem
 * antecessor — o formato exato do hash/payload da cadeia é definido em
 * SPK-05 antes de BE-29 popular esta coluna com confiança; esta migration
 * só reserva o tipo de coluna (texto), sem impor tamanho fixo que possa
 * conflitar com o algoritmo ainda a decidir.
 *
 * Privilégio de banco restrito (revogar UPDATE/DELETE da role de aplicação,
 * GUARDRAILS.md item 18) fica para BE-29 — fora do escopo de BE-02 (só
 * schema), que só desenha a tabela em si.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('audit_events', {
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
      references: 'exams',
    },
    ator_account_id: {
      type: 'uuid',
      references: 'accounts',
    },
    tipo_evento: { type: 'varchar(100)', notNull: true },
    ocorrido_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    hash_evento_anterior: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('audit_events', 'tenant_id');
}
