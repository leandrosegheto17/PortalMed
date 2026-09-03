import 'reflect-metadata';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { DOMAIN_TABLES, TENANT_TABLE } from '../../src/database/domain-tables.js';

/**
 * BE-02 (`TASK.md`) — valida o schema base multi-tenant contra um PostgreSQL
 * **real** e efêmero (testcontainers, `postgres:16-alpine`), não contra
 * mock: a única forma de comprovar que uma migration aplica de verdade
 * (constraints, FKs, extensões, índices parciais) é rodá-la contra o motor
 * real. Nenhum fallback de sintaxe (ex.: SQLite) foi necessário nesta
 * máquina — Docker Desktop está disponível e operante no ambiente de
 * execução usado para esta tarefa (`docker ps` responde), então os testes
 * abaixo rodam de ponta a ponta contra Postgres real, como o guardrail desta
 * tarefa exige. Ver nota de limitação/alternativa em `backend/docs/
 * migrations.md` para o caso (não observado aqui) de um ambiente sem Docker.
 *
 * Roda como `*.e2e-spec.ts` (`vitest.config.e2e.ts`, já incluído em
 * `npm run test:e2e`/CI `backend-ci.yml`) — nenhuma mudança de pipeline foi
 * necessária: testcontainers gerencia seu próprio container via o Docker do
 * host, o mesmo Docker que já roda no runner `ubuntu-latest` do GitHub
 * Actions usado por `build-and-push` mais adiante no mesmo workflow.
 */
describe('BE-02 — schema PostgreSQL multi-tenant (migrations versionadas)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

  // Contado dinamicamente (não hardcoded) — BE-03 acrescentou 2 migrations
  // (role de runtime + RLS) depois das 15 originais de BE-02; um número
  // fixo aqui ficaria desatualizado a cada tarefa futura que também
  // adicionar migration (ex.: BE-29, privilégio de audit_events).
  const TOTAL_MIGRATIONS = readdirSync(MIGRATIONS_DIR).filter((file) =>
    file.endsWith('.ts'),
  ).length;
  const ALL_TABLES = [TENANT_TABLE, ...DOMAIN_TABLES] as const;

  let container: StartedPostgreSqlContainer;
  let client: Client;

  async function runMigrations(
    direction: 'up' | 'down',
    count?: number,
  ): Promise<void> {
    await runner({
      databaseUrl: container.getConnectionUri(),
      dir: MIGRATIONS_DIR,
      direction,
      count,
      migrationsTable: 'pgmigrations',
      logger: { info: () => {}, warn: () => {}, error: console.error },
    });
  }

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('portalmed_schema_test')
      .start();

    await runMigrations('up');

    client = new Client({ connectionString: container.getConnectionUri() });
    await client.connect();
  }, 180_000);

  afterAll(async () => {
    await client?.end();
    await container?.stop();
  });

  it('habilita a extensão pgcrypto (ADR-006 / GUARDRAILS.md item 17)', async () => {
    const { rows } = await client.query(
      `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'`,
    );
    expect(rows).toHaveLength(1);
  });

  it.each(ALL_TABLES)('cria a tabela "%s" (SDD.md §5)', async (table) => {
    const { rows } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    );
    expect(rows).toHaveLength(1);
  });

  it(`"${TENANT_TABLE}" não carrega coluna tenant_id (GUARDRAILS.md regra A.1 — única exceção)`, async () => {
    const { rows } = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id'`,
      [TENANT_TABLE],
    );
    expect(rows).toHaveLength(0);
  });

  it.each(DOMAIN_TABLES)(
    'tabela "%s" tem tenant_id NOT NULL com FK para tenants(id) (GUARDRAILS.md regra A.1, sem exceção)',
    async (table) => {
      const column = await client.query(
        `SELECT is_nullable, data_type FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = 'tenant_id'`,
        [table],
      );
      expect(column.rows).toHaveLength(1);
      expect(column.rows[0].is_nullable).toBe('NO');
      expect(column.rows[0].data_type).toBe('uuid');

      const foreignKey = await client.query(
        `SELECT tc.constraint_name
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
         JOIN information_schema.constraint_column_usage ccu
           ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
         WHERE tc.table_schema = 'public'
           AND tc.constraint_type = 'FOREIGN KEY'
           AND tc.table_name = $1
           AND kcu.column_name = 'tenant_id'
           AND ccu.table_name = $2`,
        [table, TENANT_TABLE],
      );
      expect(foreignKey.rows.length).toBeGreaterThanOrEqual(1);
    },
  );

  describe('ADR-011 — BRANDING_CONFIG (validação de contraste WCAG)', () => {
    const expectedColumns: Record<string, { nullable: boolean; hasDefault?: boolean }> = {
      status_validacao_contraste: { nullable: false, hasDefault: true },
      metodo_validacao: { nullable: true },
      validado_por: { nullable: true },
      validado_em: { nullable: true },
      observacoes_validacao: { nullable: true },
    };

    it.each(Object.entries(expectedColumns))(
      'branding_configs.%s existe com nullability esperada',
      async (columnName, expectation) => {
        const { rows } = await client.query(
          `SELECT is_nullable, column_default FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'branding_configs' AND column_name = $1`,
          [columnName],
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].is_nullable).toBe(expectation.nullable ? 'YES' : 'NO');
        if (expectation.hasDefault) {
          expect(rows[0].column_default).not.toBeNull();
        }
      },
    );

    it('status_validacao_contraste inicia como "pendente" para configuração nova (ADR-011)', async () => {
      const tenant = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital Teste ADR-011', 'HOSP-ADR011') RETURNING id`,
      );
      const tenantId = tenant.rows[0].id;

      const branding = await client.query(
        `INSERT INTO branding_configs (tenant_id) VALUES ($1) RETURNING status_validacao_contraste`,
        [tenantId],
      );

      expect(branding.rows[0].status_validacao_contraste).toBe('pendente');
    });

    it('rejeita status_validacao_contraste fora do enum permitido', async () => {
      const tenant = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital Teste Enum', 'HOSP-ADR011-ENUM') RETURNING id`,
      );
      const tenantId = tenant.rows[0].id;

      await expect(
        client.query(
          `INSERT INTO branding_configs (tenant_id, status_validacao_contraste) VALUES ($1, 'invalido')`,
          [tenantId],
        ),
      ).rejects.toThrow();
    });
  });

  describe('ADR-012 — rastreabilidade DICOM (EXAM_FILE) e AE Title (INTEGRATION_ENDPOINT_CONFIG)', () => {
    it.each([
      'dicom_study_instance_uid',
      'dicom_series_instance_uid',
      'dicom_sop_instance_uid',
    ])('exam_files.%s existe e é nullable', async (columnName) => {
      const { rows } = await client.query(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'exam_files' AND column_name = $1`,
        [columnName],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].is_nullable).toBe('YES');
    });

    it('integration_endpoint_configs.dicom_remote_ae_title existe e é nullable', async () => {
      const { rows } = await client.query(
        `SELECT is_nullable FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'integration_endpoint_configs'
           AND column_name = 'dicom_remote_ae_title'`,
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].is_nullable).toBe('YES');
    });

    it(
      'impede dois tenants diferentes com o mesmo dicom_remote_ae_title ' +
        '(ADR-012, "Negative Consequences" — resolução de tenant não pode ficar ambígua)',
      async () => {
        const tenantA = await client.query(
          `INSERT INTO tenants (nome_institucional, identificador_integracao)
           VALUES ('Hospital A (ADR-012)', 'HOSP-ADR012-A') RETURNING id`,
        );
        const tenantB = await client.query(
          `INSERT INTO tenants (nome_institucional, identificador_integracao)
           VALUES ('Hospital B (ADR-012)', 'HOSP-ADR012-B') RETURNING id`,
        );

        await client.query(
          `INSERT INTO integration_endpoint_configs (tenant_id, dicom_remote_ae_title)
           VALUES ($1, 'HOSPITAL_A_AET')`,
          [tenantA.rows[0].id],
        );

        await expect(
          client.query(
            `INSERT INTO integration_endpoint_configs (tenant_id, dicom_remote_ae_title)
             VALUES ($1, 'HOSPITAL_A_AET')`,
            [tenantB.rows[0].id],
          ),
        ).rejects.toThrow(/duplicate key|unique constraint/i);
      },
    );

    it('permite múltiplos tenants com dicom_remote_ae_title ainda não configurado (NULL)', async () => {
      const tenantC = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital C (ADR-012)', 'HOSP-ADR012-C') RETURNING id`,
      );
      const tenantD = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital D (ADR-012)', 'HOSP-ADR012-D') RETURNING id`,
      );

      await expect(
        client.query(
          `INSERT INTO integration_endpoint_configs (tenant_id) VALUES ($1)`,
          [tenantC.rows[0].id],
        ),
      ).resolves.toBeDefined();

      await expect(
        client.query(
          `INSERT INTO integration_endpoint_configs (tenant_id) VALUES ($1)`,
          [tenantD.rows[0].id],
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('ADR-006 / GUARDRAILS.md item 17 — pgcrypto aplicado a CPF em users', () => {
    it('cpf_criptografado (bytea) e cpf_hash aceitam valor real gerado via pgcrypto', async () => {
      const tenant = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital Teste CPF', 'HOSP-CPF') RETURNING id`,
      );
      const tenantId = tenant.rows[0].id;

      const inserted = await client.query(
        `INSERT INTO users (tenant_id, cpf_criptografado, cpf_hash, nome, data_nascimento, papel)
         VALUES (
           $1,
           pgp_sym_encrypt('12345678900', 'chave-de-teste'),
           encode(digest('12345678900', 'sha256'), 'hex'),
           'Paciente Teste',
           '1990-01-01',
           'paciente'
         )
         RETURNING cpf_hash, pgp_sym_decrypt(cpf_criptografado, 'chave-de-teste') AS cpf_decifrado`,
        [tenantId],
      );

      expect(inserted.rows[0].cpf_hash).toHaveLength(64);
      expect(inserted.rows[0].cpf_decifrado).toBe('12345678900');
    });

    it('impede o mesmo CPF (hash) duas vezes no mesmo tenant', async () => {
      const tenant = await client.query(
        `INSERT INTO tenants (nome_institucional, identificador_integracao)
         VALUES ('Hospital Teste CPF Duplicado', 'HOSP-CPF-DUP') RETURNING id`,
      );
      const tenantId = tenant.rows[0].id;
      const insertUser = () =>
        client.query(
          `INSERT INTO users (tenant_id, cpf_criptografado, cpf_hash, nome, data_nascimento, papel)
           VALUES ($1, pgp_sym_encrypt('11122233344', 'k'), encode(digest('11122233344', 'sha256'), 'hex'), 'Fulano', '1990-01-01', 'paciente')`,
          [tenantId],
        );

      await insertUser();
      await expect(insertUser()).rejects.toThrow(/duplicate key|unique constraint/i);
    });
  });

  describe('reversibilidade (migration versionada, GUARDRAILS.md §I / ADR-006)', () => {
    it('a suíte de migrations desfaz por completo (down) sem deixar nenhuma tabela de domínio para trás', async () => {
      await runMigrations('down', TOTAL_MIGRATIONS);

      const { rows } = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
        [[...ALL_TABLES]],
      );

      expect(rows).toHaveLength(0);

      const extension = await client.query(
        `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'`,
      );
      expect(extension.rows).toHaveLength(0);

      // Restaura o schema para não deixar o container/estado inconsistente
      // caso outro teste (não previsto neste arquivo) reaproveite a mesma
      // conexão antes do afterAll rodar.
      await runMigrations('up');
    }, 60_000);
  });
});
