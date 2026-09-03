import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * `SDD.md` §5 — USER (titular do exame: paciente ou perfil operacional do
 * hospital). Tabela renomeada para `users` (plural, snake_case) porque
 * `user` é palavra reservada/ambígua em PostgreSQL — decisão de detalhe do
 * Backend, sem impacto no modelo lógico do `SDD.md`.
 *
 * CPF (ADR-006/GUARDRAILS.md item 17, `pgcrypto` obrigatório) é armazenado
 * em duas colunas, ambas calculadas pela aplicação (nenhuma lógica de
 * negócio nesta migration, só o desenho de schema que a viabiliza):
 * - `cpf_criptografado` (bytea): valor cifrado via `pgp_sym_encrypt`
 *   (`pgcrypto`), protege o dado em repouso além da criptografia de disco.
 * - `cpf_hash` (sha-256, hex, 64 chars): hash determinístico (`digest`,
 *   `pgcrypto`) — necessário porque `pgp_sym_encrypt` não é
 *   pesquisável/igual-comparável (IV aleatório a cada chamada); usado para
 *   localizar/garantir unicidade de CPF por tenant sem expor o valor puro.
 *
 * Nenhum outro identificador foi classificado como sensível o suficiente
 * para exigir `pgcrypto` nesta tarefa (`TASK.md` §1.7) — `nome`/
 * `data_nascimento` seguem em texto plano, protegidos apenas pela
 * criptografia de disco padrão do provedor; revisão futura do
 * Backend/DevSecOps pode reclassificar isso.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('users', {
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
    cpf_criptografado: { type: 'bytea', notNull: true },
    cpf_hash: { type: 'char(64)', notNull: true },
    nome: { type: 'text', notNull: true },
    data_nascimento: { type: 'date', notNull: true },
    papel: {
      type: 'varchar(30)',
      notNull: true,
      check:
        "papel IN ('paciente', 'admin_operacional', 'ti_hospital', 'suporte_piloto')",
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('users', 'users_tenant_id_cpf_hash_unique', {
    unique: ['tenant_id', 'cpf_hash'],
  });

  pgm.createIndex('users', 'tenant_id');
}
