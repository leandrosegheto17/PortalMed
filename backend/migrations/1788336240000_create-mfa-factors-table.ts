import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — MFA_FACTOR (ADR-008: TOTP primário + OTP e-mail fallback).
 * `segredo_criptografado` já nasce `bytea` — o critério de aceite de BE-12
 * (`TASK.md`) exige que o segredo TOTP seja armazenado criptografado; o
 * valor cifrado (`pgcrypto`) é responsabilidade de BE-12, esta migration só
 * garante que a coluna não permite texto plano por engano.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('mfa_factors', {
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
    account_id: {
      type: 'uuid',
      notNull: true,
      references: 'accounts',
    },
    tipo: {
      type: 'varchar(20)',
      notNull: true,
      check: "tipo IN ('totp', 'email_otp')",
    },
    segredo_criptografado: { type: 'bytea', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Um mesmo account não tem dois fatores do mesmo tipo cadastrados.
  pgm.addConstraint('mfa_factors', 'mfa_factors_account_id_tipo_unique', {
    unique: ['account_id', 'tipo'],
  });

  pgm.createIndex('mfa_factors', 'tenant_id');
}
