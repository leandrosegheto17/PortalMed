import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 / ADR-012 — EXAM_FILE. Nunca guarda o binário (ADR-006/
 * GUARDRAILS.md item 16 — sempre Object Storage, referenciado por chave).
 *
 * Os três campos DICOM (`dicom_study_instance_uid`, `dicom_series_
 * instance_uid`, `dicom_sop_instance_uid`) vêm de ADR-012 e são **nullable**
 * por design — só se aplicam a arquivo de origem DICOM (categoria
 * `imagem`); arquivo laboratorial/anatomopatológico (pdf/html) nunca os
 * preenche (ADR-012, "Negative Consequences").
 *
 * `dicom_sop_instance_uid` recebe um índice único parcial (só quando não
 * nulo): 1 instância DICOM convertida = 1 `EXAM_FILE` (ADR-012, "Cada
 * instância DICOM convertida gera um EXAM_FILE"), e o SOP Instance UID é
 * garantidamente único em todo o universo DICOM pelo próprio protocolo — a
 * unicidade aqui é global (não composta com `tenant_id`), reforçando essa
 * garantia também no banco.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('exam_files', {
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
    exam_result_id: {
      type: 'uuid',
      notNull: true,
      references: 'exam_results',
    },
    object_storage_key: { type: 'varchar(1000)', notNull: true },
    tipo_arquivo: { type: 'varchar(50)', notNull: true },
    // ADR-012 — nullable, só preenchido para origem DICOM.
    dicom_study_instance_uid: { type: 'varchar(64)' },
    dicom_series_instance_uid: { type: 'varchar(64)' },
    dicom_sop_instance_uid: { type: 'varchar(64)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('exam_files', 'tenant_id');

  pgm.createIndex('exam_files', 'dicom_sop_instance_uid', {
    name: 'exam_files_dicom_sop_instance_uid_unique',
    unique: true,
    where: 'dicom_sop_instance_uid IS NOT NULL',
  });
}
