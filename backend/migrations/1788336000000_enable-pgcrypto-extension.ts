import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * BE-02 (`TASK.md`) / ADR-006 / GUARDRAILS.md item 17: `pgcrypto` é
 * obrigatório para CPF (e qualquer outro identificador de paciente que vier
 * a ser classificado como sensível). Habilitada como a primeira migration do
 * projeto — nenhuma tabela de domínio é criada antes da extensão existir.
 *
 * `pgcrypto` também fornece `gen_random_uuid()`, reaproveitado como default
 * de toda coluna `id` (uuid) do schema — evita depender de uma segunda
 * extensão (`uuid-ossp`) só para geração de UUID.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropExtension('pgcrypto', { ifExists: true });
}
