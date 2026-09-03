import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 / ADR-012 — INTEGRATION_ENDPOINT_CONFIG (1:1 com `TENANT`).
 *
 * `dicom_remote_ae_title`: AE Title máximo de 16 caracteres pelo próprio
 * protocolo DICOM (padrão), daí `varchar(16)`.
 *
 * Decisão de detalhe sobre a constraint `UNIQUE` (documentada aqui porque a
 * redação literal do critério de aceite de BE-02 em `TASK.md` — "constraint
 * UNIQUE por tenant" — poderia sugerir, à primeira leitura, uma unicidade
 * composta `(tenant_id, dicom_remote_ae_title)`. Isso NÃO impediria a falha
 * exata que ADR-012 nomeia nas "Negative Consequences": "se dois hospitais
 * usarem o mesmo AE Title de origem, a resolução de tenant falha
 * silenciosamente atribuindo ao tenant errado" — uma constraint composta
 * com `tenant_id` permitiria exatamente essa colisão entre dois tenants
 * diferentes. A unicidade que resolve esse risco é do VALOR do AE Title em
 * si, através de todos os tenants (cada AE Title só pode resolver para um
 * tenant). Implementado como índice único parcial (ignora `NULL`, já que
 * nem todo tenant tem canal DICOM configurado).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('integration_endpoint_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      unique: true, // 1:1 TENANT-INTEGRATION_ENDPOINT_CONFIG (SDD.md §5)
      references: 'tenants',
    },
    canal_integration_gateway: { type: 'varchar(255)' },
    dicom_remote_ae_title: { type: 'varchar(16)' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('integration_endpoint_configs', 'dicom_remote_ae_title', {
    name: 'integration_endpoint_configs_dicom_remote_ae_title_unique',
    unique: true,
    where: 'dicom_remote_ae_title IS NOT NULL',
  });
}
