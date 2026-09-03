import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 / ADR-011 — BRANDING_CONFIG (1:1 com `TENANT`,
 * `TENANT ||--|| BRANDING_CONFIG`). `logo_url`/`paleta_cores` são nullable
 * porque a configuração nasce antes de qualquer ativo ser definido —
 * `status_validacao_contraste` já nasce `pendente` por default
 * (ADR-011: "toda configuração nova"), o que só faz sentido se a
 * configuração puder existir num estado ainda incompleto.
 *
 * Os cinco campos de ADR-011 (`status_validacao_contraste`,
 * `metodo_validacao`, `validado_por`, `validado_em`,
 * `observacoes_validacao`) são exatamente os listados em `SDD.md` §5 e no
 * critério de aceite de BE-02 (`TASK.md`). O gate de negócio em si
 * ("nenhuma configuração pronta para go-live com status != 'aprovado'",
 * GUARDRAILS.md item 29) é aplicado pela aplicação em BE-32/BE-34 — esta
 * migration só garante que o dado necessário para o gate existe no schema.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('branding_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    tenant_id: {
      type: 'uuid',
      notNull: true,
      unique: true, // 1:1 TENANT-BRANDING_CONFIG (SDD.md §5)
      references: 'tenants',
    },
    logo_url: { type: 'varchar(1000)' },
    paleta_cores: { type: 'varchar(255)' },
    status_validacao_contraste: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pendente',
      check: "status_validacao_contraste IN ('pendente', 'aprovado', 'reprovado')",
    },
    metodo_validacao: {
      type: 'varchar(20)',
      check: "metodo_validacao IN ('automatizado', 'manual', 'ambos')",
    },
    validado_por: {
      type: 'uuid',
      references: 'accounts', // "ACCOUNT da equipe interna" (SDD.md §5)
    },
    validado_em: { type: 'timestamptz' },
    observacoes_validacao: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
}
