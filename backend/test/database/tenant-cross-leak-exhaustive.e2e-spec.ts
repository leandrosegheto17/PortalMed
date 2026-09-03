import 'reflect-metadata';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ESLint } from 'eslint';
import { DOMAIN_TABLES, type DomainTable } from '../../src/database/domain-tables.js';
import { createKyselyConnection } from '../../src/database/kysely-connection.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { TenantContext } from '../../src/database/tenant-context.js';
import { TenantScopedRepository, type DomainRow } from '../../src/database/tenant-scoped.repository.js';

/**
 * BE-04 (`TASK.md`) — condição não negociável do Gate 2 do CTO
 * (`GUARDRAILS.md` regra A.4): "nenhum PR que toque a camada de acesso a
 * dado é aprovado/mergeado sem o teste automatizado de vazamento cruzado
 * entre tenants passando no CI".
 *
 * Diferença deliberada em relação a `tenant-guard-and-rls.e2e-spec.ts`
 * (BE-03): aquela suíte prova que a infraestrutura (guard + RLS) *existe* e
 * funciona numa amostra de 2 tabelas de formato diferente. Esta suíte é a
 * prova **exaustiva**, tabela por tabela, das 13 tabelas de `DOMAIN_TABLES`
 * — nenhuma tabela nova pode ficar de fora por divergência de lista, já que
 * itera a mesma fonte única de verdade (`domain-tables.ts`) reaproveitada
 * por BE-02/BE-03.
 *
 * As duas camadas são testadas como defesas **independentes** (uma
 * "desligada" de cada vez, no sentido de que cada bloco de teste isola qual
 * camada está de fato em ação):
 *
 * 1. "Guard + RLS juntas" — o caminho real da aplicação:
 *    `TenantScopedRepository` sobre a conexão da role de runtime
 *    (`portalmed_app`), onde RLS *e* o filtro explícito de aplicação atuam
 *    ao mesmo tempo.
 * 2. "Guard sozinho" — mesma classe de repositório (mesmo filtro explícito
 *    de aplicação), mas sobre uma conexão com o usuário **superusuário** do
 *    container. Superusuário sempre ignora RLS (mesmo com `FORCE ROW LEVEL
 *    SECURITY` — a exceção de superusuário nunca é afastada por `FORCE`,
 *    documentado em `backend/docs/tenant-guard-and-rls.md`). Qualquer
 *    isolamento observado aqui só pode vir do filtro `.where('tenant_id',
 *    ...)` explícito do guard — RLS está estruturalmente fora de jogo.
 * 3. "RLS sozinha" — `pg.Client` cru, conectado como `portalmed_app`, sem
 *    nenhum uso de Kysely/`TenantScopedRepository`/filtro explícito.
 *    Qualquer isolamento observado aqui só pode vir da política RLS.
 *
 * Um vazamento real em produção normalmente exigiria as duas camadas
 * falharem ao mesmo tempo — mas o critério de aceite de BE-04 e o próprio
 * ADR-006 exigem provar cada camada **isoladamente**, não só o caminho feliz
 * combinado (a mesma razão pela qual ADR-006 rejeita RLS como única camada:
 * "RLS mal configurado gera falso senso de segurança").
 *
 * Inclui também (Seção final, `[QA-DEBT-012]`) o teste de regressão
 * permanente recomendado pelo QA em `QA-REPORT.md` Seção 1.6.2 para o vetor
 * residual de deep-import de `KYSELY_CONNECTION` — a suíte de vazamento
 * cruzado passa a detectar sozinha uma futura regressão da regra de lint
 * dedicada, sem depender só do job de lint isolado do CI.
 */
describe('BE-04 — suíte exaustiva de vazamento cruzado entre tenants (condição do Gate 2 do CTO)', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const BACKEND_ROOT = path.resolve(__dirname, '../..');
  const MIGRATIONS_DIR = path.resolve(BACKEND_ROOT, 'migrations');
  const APP_ROLE_PASSWORD = 'be04-test-only-password';
  const ENCRYPTION_KEY = 'be04-test-only-pgcrypto-key';

  let container: StartedPostgreSqlContainer;
  let adminClient: Client; // superusuário do container (roda migrations, semeia dados ignorando RLS)
  let appRoleConnectionUri: string;
  let superuserConnectionUri: string;

  async function runMigrations(direction: 'up' | 'down', count?: number): Promise<void> {
    await runner({
      databaseUrl: container.getConnectionUri(),
      dir: MIGRATIONS_DIR,
      direction,
      count,
      migrationsTable: 'pgmigrations',
      logger: { info: () => {}, warn: () => {}, error: console.error },
    });
  }

  async function createTenant(nome: string, identificador: string): Promise<string> {
    const { rows } = await adminClient.query(
      `INSERT INTO tenants (nome_institucional, identificador_integracao)
       VALUES ($1, $2) RETURNING id`,
      [nome, identificador],
    );
    return rows[0].id as string;
  }

  /** Cliente cru (sem Kysely, sem guard) conectado como a role de runtime — usado para provar a RLS de forma independente do guard de aplicação. */
  async function withAppRoleClient<T>(
    tenantId: string | undefined,
    work: (client: Client) => Promise<T>,
  ): Promise<T> {
    const client = new Client({ connectionString: appRoleConnectionUri });
    await client.connect();
    try {
      if (tenantId !== undefined) {
        await client.query("SELECT set_config('app.tenant_id', $1, false)", [tenantId]);
      }
      return await work(client);
    } finally {
      await client.end();
    }
  }

  /**
   * Semeia uma linha equivalente em cada uma das 13 tabelas de domínio para
   * um único tenant, respeitando a cadeia de FKs real do schema (BE-02).
   * Sempre via `adminClient` (superusuário) — a semeadura em si não faz
   * parte do que está sendo testado, só precisa ignorar RLS/guard para
   * montar o cenário.
   */
  async function seedTenantFixture(
    tenantId: string,
    seedTag: string,
  ): Promise<Record<DomainTable, string>> {
    const cpfHash = crypto.createHash('sha256').update(`${tenantId}:${seedTag}`).digest('hex');

    const { rows: userRows } = await adminClient.query(
      `INSERT INTO users (tenant_id, cpf_criptografado, cpf_hash, nome, data_nascimento, papel)
       VALUES ($1, pgp_sym_encrypt($2, $3), $4, $5, '1990-01-01', 'paciente')
       RETURNING id`,
      [tenantId, `cpf-${seedTag}`, ENCRYPTION_KEY, cpfHash, `Paciente ${seedTag}`],
    );
    const userId = userRows[0].id as string;

    const { rows: accountRows } = await adminClient.query(
      `INSERT INTO accounts (tenant_id, user_id, email, senha_hash)
       VALUES ($1, $2, $3, 'hash-nao-usado-neste-teste')
       RETURNING id`,
      [tenantId, userId, `${seedTag}@example.com`],
    );
    const accountId = accountRows[0].id as string;

    const { rows: mfaRows } = await adminClient.query(
      `INSERT INTO mfa_factors (tenant_id, account_id, tipo, segredo_criptografado)
       VALUES ($1, $2, 'totp', pgp_sym_encrypt('segredo-totp', $3))
       RETURNING id`,
      [tenantId, accountId, ENCRYPTION_KEY],
    );
    const mfaFactorId = mfaRows[0].id as string;

    const { rows: termsRows } = await adminClient.query(
      `INSERT INTO terms_versions (tenant_id, versao, conteudo)
       VALUES ($1, $2, 'conteudo original')
       RETURNING id`,
      [tenantId, `v1-${seedTag}`],
    );
    const termsVersionId = termsRows[0].id as string;

    const { rows: consentRows } = await adminClient.query(
      `INSERT INTO consent_records (tenant_id, user_id, terms_version_id, tipo)
       VALUES ($1, $2, $3, 'termos_uso')
       RETURNING id`,
      [tenantId, userId, termsVersionId],
    );
    const consentRecordId = consentRows[0].id as string;

    const { rows: examRows } = await adminClient.query(
      `INSERT INTO exams (tenant_id, user_id, categoria, data_exame, status)
       VALUES ($1, $2, 'laboratorial', '2026-01-01', 'concluido')
       RETURNING id`,
      [tenantId, userId],
    );
    const examId = examRows[0].id as string;

    const { rows: examResultRows } = await adminClient.query(
      `INSERT INTO exam_results (tenant_id, exam_id, formato)
       VALUES ($1, $2, 'pdf')
       RETURNING id`,
      [tenantId, examId],
    );
    const examResultId = examResultRows[0].id as string;

    const { rows: examFileRows } = await adminClient.query(
      `INSERT INTO exam_files (tenant_id, exam_result_id, object_storage_key, tipo_arquivo)
       VALUES ($1, $2, $3, 'pdf')
       RETURNING id`,
      [tenantId, examResultId, `object-storage-key-${seedTag}`],
    );
    const examFileId = examFileRows[0].id as string;

    const { rows: shareLinkRows } = await adminClient.query(
      `INSERT INTO share_links (tenant_id, exam_id, token, expira_em)
       VALUES ($1, $2, $3, now() + interval '3 days')
       RETURNING id`,
      [tenantId, examId, `token-${seedTag}-${crypto.randomUUID()}`],
    );
    const shareLinkId = shareLinkRows[0].id as string;

    const { rows: auditEventRows } = await adminClient.query(
      `INSERT INTO audit_events (tenant_id, exam_id, ator_account_id, tipo_evento)
       VALUES ($1, $2, $3, 'visualizacao_laudo')
       RETURNING id`,
      [tenantId, examId, accountId],
    );
    const auditEventId = auditEventRows[0].id as string;

    const { rows: brandingRows } = await adminClient.query(
      `INSERT INTO branding_configs (tenant_id) VALUES ($1) RETURNING id`,
      [tenantId],
    );
    const brandingConfigId = brandingRows[0].id as string;

    // AE Title tem UNIQUE global (GUARDRAILS.md regra A.5/ADR-012) — cada
    // seedTag precisa de um valor distinto, sempre <=16 chars (limite do
    // protocolo DICOM).
    const aeTitle = `AET${crypto.randomUUID().replace(/-/g, '').slice(0, 13)}`;
    const { rows: integrationRows } = await adminClient.query(
      `INSERT INTO integration_endpoint_configs (tenant_id, dicom_remote_ae_title)
       VALUES ($1, $2)
       RETURNING id`,
      [tenantId, aeTitle],
    );
    const integrationEndpointConfigId = integrationRows[0].id as string;

    const { rows: exceptionRows } = await adminClient.query(
      `INSERT INTO exception_queue_items (tenant_id, payload_normalizado)
       VALUES ($1, $2::jsonb)
       RETURNING id`,
      [tenantId, JSON.stringify({ origem: seedTag })],
    );
    const exceptionQueueItemId = exceptionRows[0].id as string;

    return {
      users: userId,
      accounts: accountId,
      mfa_factors: mfaFactorId,
      terms_versions: termsVersionId,
      consent_records: consentRecordId,
      exams: examId,
      exam_results: examResultId,
      exam_files: examFileId,
      share_links: shareLinkId,
      audit_events: auditEventId,
      branding_configs: brandingConfigId,
      integration_endpoint_configs: integrationEndpointConfigId,
      exception_queue_items: exceptionQueueItemId,
    };
  }

  /**
   * Wrapper de teste sobre `TenantScopedRepository` — genérico sobre
   * qualquer tabela de `DOMAIN_TABLES`, expondo publicamente os métodos
   * protegidos para os cenários sistemáticos abaixo. Nenhuma lógica nova:
   * só repassa para os métodos reais do guard (mesma classe usada pelas
   * tarefas de domínio futuras via `provideTenantScopedRepository`).
   */
  class DomainTableTestRepository<Table extends DomainTable> extends TenantScopedRepository<Table> {
    constructor(connection: unknown, table: Table) {
      super(connection, table);
    }
    list(): Promise<DomainRow[]> {
      return this.findAll();
    }
    getById(id: string): Promise<DomainRow | undefined> {
      return this.findById(id);
    }
    updateRow(id: string, values: Record<string, unknown>): Promise<DomainRow | undefined> {
      return this.updateById(id, values);
    }
    removeById(id: string): Promise<number> {
      return this.deleteById(id);
    }
  }

  /**
   * Uma coluna mutável real por tabela (nenhuma é `tenant_id`/`id`, que o
   * guard já protege por outro caminho) — usada nos cenários de
   * `updateById` cross-tenant. Valor sempre distinto do valor original
   * semeado, para que uma mutação bem-sucedida (o que NUNCA deveria
   * acontecer) seja detectável de forma inequívoca.
   */
  const MUTABLE_COLUMN_BY_TABLE: Record<DomainTable, { column: string; value: string }> = {
    users: { column: 'nome', value: 'Tentativa Cross-Tenant' },
    accounts: { column: 'status', value: 'bloqueada' },
    mfa_factors: { column: 'tipo', value: 'email_otp' },
    terms_versions: { column: 'conteudo', value: 'Conteúdo alterado por tentativa cross-tenant' },
    consent_records: { column: 'tipo', value: 'consentimento_dado_saude' },
    exams: { column: 'status', value: 'cross_tenant_tentativa' },
    exam_results: { column: 'formato', value: 'html' },
    exam_files: { column: 'tipo_arquivo', value: 'tipo-alterado-tentativa-cross-tenant' },
    share_links: { column: 'revogado_em', value: '2030-01-01T00:00:00.000Z' },
    audit_events: { column: 'tipo_evento', value: 'tentativa_cross_tenant' },
    branding_configs: { column: 'paleta_cores', value: '#tentativa-cross-tenant' },
    integration_endpoint_configs: {
      column: 'canal_integration_gateway',
      value: 'canal-tentativa-cross-tenant',
    },
    exception_queue_items: { column: 'status', value: 'resolvido' },
  };

  async function readColumnAsText(table: DomainTable, id: string, column: string): Promise<string | null> {
    const { rows } = await adminClient.query(
      `SELECT ${column}::text AS value FROM ${table} WHERE id = $1`,
      [id],
    );
    return rows[0]?.value ?? null;
  }

  async function rowExists(table: DomainTable, id: string): Promise<boolean> {
    const { rows } = await adminClient.query(`SELECT 1 FROM ${table} WHERE id = $1`, [id]);
    return rows.length === 1;
  }

  beforeAll(async () => {
    process.env.APP_DB_ROLE_PASSWORD = APP_ROLE_PASSWORD;

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('portalmed_tenant_leak_test')
      .start();

    await runMigrations('up');

    adminClient = new Client({ connectionString: container.getConnectionUri() });
    await adminClient.connect();

    const appRoleUrl = new URL(container.getConnectionUri());
    appRoleUrl.username = 'portalmed_app';
    appRoleUrl.password = APP_ROLE_PASSWORD;
    appRoleConnectionUri = appRoleUrl.toString();

    superuserConnectionUri = container.getConnectionUri();
  }, 180_000);

  afterAll(async () => {
    await adminClient?.end();
    await container?.stop();
    delete process.env.APP_DB_ROLE_PASSWORD;
  });

  describe('cenário compartilhado: 3 tenants com dados equivalentes em toda tabela de domínio', () => {
    let tenantA: string;
    let tenantB: string;
    /**
     * Terceiro tenant, dedicado só aos cenários de `deleteById`. `branding_configs`
     * e `integration_endpoint_configs` são 1:1 com `tenants` (`tenant_id`
     * `UNIQUE`, `SDD.md` §5) — semear uma segunda linha "descartável" para o
     * tenant B violaria essa constraint, então o alvo de delete precisa ser
     * outro tenant, não uma segunda linha do mesmo tenant B. Também reforça
     * o critério de aceite ("2+ tenants") com um terceiro tenant real, não
     * só dois.
     */
    let tenantC: string;
    let fixtureA: Record<DomainTable, string>;
    let fixtureB: Record<DomainTable, string>;
    /** Linha dedicada só para os cenários de deleteById — nunca reaproveitada por findAll/findById/updateById, para nenhuma ordem de execução afetar outro cenário. */
    let deleteFixtureC: Record<DomainTable, string>;
    let originalValueByTable: Record<DomainTable, string | null>;

    let appRoleConnection: ReturnType<typeof createKyselyConnection>;
    let superuserConnection: ReturnType<typeof createKyselyConnection>;

    beforeAll(async () => {
      tenantA = await createTenant('Hospital Leak A', 'HOSP-LEAK-A');
      tenantB = await createTenant('Hospital Leak B', 'HOSP-LEAK-B');
      tenantC = await createTenant('Hospital Leak C', 'HOSP-LEAK-C');

      fixtureA = await seedTenantFixture(tenantA, 'leak-a');
      fixtureB = await seedTenantFixture(tenantB, 'leak-b');
      deleteFixtureC = await seedTenantFixture(tenantC, 'delete-c');

      originalValueByTable = {} as Record<DomainTable, string | null>;
      for (const table of DOMAIN_TABLES) {
        const { column } = MUTABLE_COLUMN_BY_TABLE[table];
        originalValueByTable[table] = await readColumnAsText(table, fixtureB[table], column);
      }

      appRoleConnection = createKyselyConnection(appRoleConnectionUri);
      superuserConnection = createKyselyConnection(superuserConnectionUri);
    });

    afterAll(async () => {
      await appRoleConnection?.destroy();
      await superuserConnection?.destroy();
    });

    describe('Camada 1 — guard + RLS juntas (caminho real da aplicação, role portalmed_app via TenantScopedRepository)', () => {
      it.each(DOMAIN_TABLES)(
        'tabela "%s": findAll() sob o tenant A nunca inclui a linha do tenant B (só a própria)',
        async (table) => {
          const repository = new DomainTableTestRepository(appRoleConnection, table);
          const rows = await TenantContext.run(tenantA, () => repository.list());

          expect(rows.length).toBeGreaterThan(0);
          expect(rows.every((row) => row.tenant_id === tenantA)).toBe(true);
          expect(rows.some((row) => row.id === fixtureB[table])).toBe(false);
          expect(rows.some((row) => row.id === fixtureA[table])).toBe(true);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": findById(idDoTenantB) sob o tenant A retorna undefined (ID guessing)',
        async (table) => {
          const repository = new DomainTableTestRepository(appRoleConnection, table);
          const result = await TenantContext.run(tenantA, () => repository.getById(fixtureB[table]));
          expect(result).toBeUndefined();
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": updateById(idDoTenantB) sob o tenant A não afeta a linha do tenant B',
        async (table) => {
          const { column, value } = MUTABLE_COLUMN_BY_TABLE[table];
          const repository = new DomainTableTestRepository(appRoleConnection, table);

          const result = await TenantContext.run(tenantA, () =>
            repository.updateRow(fixtureB[table], { [column]: value }),
          );
          expect(result).toBeUndefined();

          const currentValue = await readColumnAsText(table, fixtureB[table], column);
          expect(currentValue).toBe(originalValueByTable[table]);
          expect(currentValue).not.toBe(value);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": deleteById(idDoTenantB) sob o tenant A não remove a linha do tenant B',
        async (table) => {
          const repository = new DomainTableTestRepository(appRoleConnection, table);

          const deletedCount = await TenantContext.run(tenantA, () =>
            repository.removeById(deleteFixtureC[table]),
          );
          expect(deletedCount).toBe(0);
          expect(await rowExists(table, deleteFixtureC[table])).toBe(true);
        },
      );
    });

    describe('Camada 2 — guard de aplicação sozinho (conexão do superusuário do container, RLS estruturalmente fora de jogo)', () => {
      // Superusuário sempre ignora RLS, mesmo com FORCE ROW LEVEL SECURITY
      // (backend/docs/tenant-guard-and-rls.md) — qualquer isolamento provado
      // abaixo só pode vir do filtro `.where('tenant_id', ...)` explícito do
      // guard, nunca da política RLS.
      it.each(DOMAIN_TABLES)(
        'tabela "%s": findAll() sob o tenant A nunca inclui a linha do tenant B, mesmo sem RLS em vigor',
        async (table) => {
          const repository = new DomainTableTestRepository(superuserConnection, table);
          const rows = await TenantContext.run(tenantA, () => repository.list());

          expect(rows.length).toBeGreaterThan(0);
          expect(rows.every((row) => row.tenant_id === tenantA)).toBe(true);
          expect(rows.some((row) => row.id === fixtureB[table])).toBe(false);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": findById(idDoTenantB) sob o tenant A retorna undefined, mesmo sem RLS em vigor',
        async (table) => {
          const repository = new DomainTableTestRepository(superuserConnection, table);
          const result = await TenantContext.run(tenantA, () => repository.getById(fixtureB[table]));
          expect(result).toBeUndefined();
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": updateById(idDoTenantB) sob o tenant A não afeta a linha do tenant B, mesmo sem RLS em vigor',
        async (table) => {
          const { column, value } = MUTABLE_COLUMN_BY_TABLE[table];
          const repository = new DomainTableTestRepository(superuserConnection, table);

          const result = await TenantContext.run(tenantA, () =>
            repository.updateRow(fixtureB[table], { [column]: value }),
          );
          expect(result).toBeUndefined();

          const currentValue = await readColumnAsText(table, fixtureB[table], column);
          expect(currentValue).toBe(originalValueByTable[table]);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": deleteById(idDoTenantB) sob o tenant A não remove a linha do tenant B, mesmo sem RLS em vigor',
        async (table) => {
          const repository = new DomainTableTestRepository(superuserConnection, table);

          const deletedCount = await TenantContext.run(tenantA, () =>
            repository.removeById(deleteFixtureC[table]),
          );
          expect(deletedCount).toBe(0);
          expect(await rowExists(table, deleteFixtureC[table])).toBe(true);
        },
      );
    });

    describe('Camada 3 — RLS sozinha (cliente cru pg, role portalmed_app, sem Kysely/guard/filtro explícito)', () => {
      it.each(DOMAIN_TABLES)(
        'tabela "%s": SELECT sem filtro de tenant_id, com app.tenant_id=A, nunca retorna a linha do tenant B',
        async (table) => {
          const rows = await withAppRoleClient(tenantA, (client) =>
            client.query(`SELECT id, tenant_id FROM ${table}`).then((r) => r.rows),
          );
          expect(rows.length).toBeGreaterThan(0);
          expect(rows.every((row) => row.tenant_id === tenantA)).toBe(true);
          expect(rows.some((row) => row.id === fixtureB[table])).toBe(false);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": SELECT * WHERE id = idDoTenantB (sem filtro de tenant_id), com app.tenant_id=A, não retorna linha (ID guessing só via RLS)',
        async (table) => {
          const rows = await withAppRoleClient(tenantA, (client) =>
            client.query(`SELECT id FROM ${table} WHERE id = $1`, [fixtureB[table]]).then((r) => r.rows),
          );
          expect(rows).toHaveLength(0);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": UPDATE ... WHERE id = idDoTenantB (sem filtro de tenant_id), com app.tenant_id=A, afeta 0 linhas (RLS USING oculta a linha do alvo)',
        async (table) => {
          const { column, value } = MUTABLE_COLUMN_BY_TABLE[table];
          const result = await withAppRoleClient(tenantA, (client) =>
            client.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [value, fixtureB[table]]),
          );
          expect(result.rowCount).toBe(0);

          const currentValue = await readColumnAsText(table, fixtureB[table], column);
          expect(currentValue).toBe(originalValueByTable[table]);
        },
      );

      it.each(DOMAIN_TABLES)(
        'tabela "%s": DELETE ... WHERE id = idDoTenantB (sem filtro de tenant_id), com app.tenant_id=A, afeta 0 linhas',
        async (table) => {
          const result = await withAppRoleClient(tenantA, (client) =>
            client.query(`DELETE FROM ${table} WHERE id = $1`, [deleteFixtureC[table]]),
          );
          expect(result.rowCount).toBe(0);
          expect(await rowExists(table, deleteFixtureC[table])).toBe(true);
        },
      );
    });
  });

  /**
   * `QA-DEBT-012` (`QA-REPORT.md` Seção 1.6.2): o QA caracterizou, na
   * revalidação final de BE-03, que o vetor de deep-import de
   * `KYSELY_CONNECTION` (import "por fora" do barrel público, apontando
   * direto para `src/database/kysely-connection.ts`) é fechado **apenas**
   * por uma barreira de CI (a regra de lint dedicada), não por uma barreira
   * estrutural de compilador/runtime — e recomendou que o escopo de BE-04
   * incluísse um caso de regressão permanente para esse vetor específico,
   * "garantindo que a suíte de vazamento cruzado detectaria uma futura
   * regressão desta regra de lint específica, não apenas confiar no CI de
   * lint isoladamente".
   *
   * Este bloco cobre as duas metades dessa garantia, contra artefatos
   * **reais** (não só `RuleTester`, que já existe separadamente em
   * `src/tooling/eslint-rules/no-kysely-connection-token-outside-database-rule.spec.ts`
   * e roda como teste unitário, fora do escopo desta suíte e-2-e dedicada):
   *
   * 1. Dois arquivos reais são escritos dentro de `src/modules/` (mesmo
   *    padrão usado pelo QA na revalidação de BE-03) — um com deep-import
   *    direto, outro com import renomeado — e o `ESLint` real (API Node,
   *    mesma config de `npm run lint:boundaries`) é executado contra eles.
   *    Se a regra de lint for removida/enfraquecida no futuro, este teste
   *    (parte do gate bloqueante de BE-04, não só do job de lint isolado)
   *    passa a falhar.
   * 2. Mesmo que o lint fosse ignorado, o teste confirma que o dado
   *    continua contido: o Symbol real obtido pelo deep-import é injetado
   *    num provider comum do NestJS (réplica do vetor original) e uma
   *    query sem `TenantContext.run()` ativo não retorna nenhuma linha —
   *    a RLS (Camada 3 acima) permanece como contenção final.
   */
  describe('[QA-DEBT-012] regressão permanente do vetor de deep-import de KYSELY_CONNECTION', () => {
    const fixtureDir = path.resolve(BACKEND_ROOT, 'src/modules/catalogo-exames');
    const deepImportFixturePath = path.join(fixtureDir, '__be04-deep-import-fixture.ts');
    const renamedImportFixturePath = path.join(fixtureDir, '__be04-renamed-import-fixture.ts');

    const deepImportFixtureContent = [
      "import { KYSELY_CONNECTION } from '../../database/kysely-connection.js';",
      '',
      '// Arquivo de fixture temporário do teste de regressão [QA-DEBT-012]',
      '// (backend/test/database/tenant-cross-leak-exhaustive.e2e-spec.ts) —',
      '// removido ao final da suíte. Réplica do vetor residual caracterizado',
      '// em QA-REPORT.md Seção 1.6.2: import "por fora" do barrel público,',
      '// apontando direto para o arquivo interno de src/database/.',
      'export const __be04DeepImportFixtureToken = KYSELY_CONNECTION;',
      '',
    ].join('\n');

    const renamedImportFixtureContent = [
      "import { KYSELY_CONNECTION as RenamedToken } from '../../database/kysely-connection.js';",
      '',
      '// Arquivo de fixture temporário do teste de regressão [QA-DEBT-012] —',
      '// mesma variação (import renomeado) que a regra de lint precisa',
      '// continuar detectando mesmo com o alias.',
      'export const __be04RenamedImportFixtureToken = RenamedToken;',
      '',
    ].join('\n');

    async function removeFixtureFiles(): Promise<void> {
      await fs.rm(deepImportFixturePath, { force: true });
      await fs.rm(renamedImportFixturePath, { force: true });
    }

    beforeAll(async () => {
      // Limpeza defensiva caso uma execução anterior tenha sido
      // interrompida antes do afterAll rodar.
      await removeFixtureFiles();
      await fs.writeFile(deepImportFixturePath, deepImportFixtureContent, 'utf8');
      await fs.writeFile(renamedImportFixturePath, renamedImportFixtureContent, 'utf8');
    });

    afterAll(async () => {
      await removeFixtureFiles();
    });

    it('a regra boundary/no-kysely-connection-token-outside-database (ESLint real, não só RuleTester) continua reportando o deep-import e o import renomeado', async () => {
      const eslint = new ESLint({ cwd: BACKEND_ROOT });
      const results = await eslint.lintFiles([deepImportFixturePath, renamedImportFixturePath]);

      expect(results).toHaveLength(2);

      const [deepImportResult, renamedImportResult] = results;

      expect(deepImportResult.errorCount).toBeGreaterThan(0);
      expect(
        deepImportResult.messages.some(
          (message) => message.ruleId === 'boundary/no-kysely-connection-token-outside-database',
        ),
      ).toBe(true);

      expect(renamedImportResult.errorCount).toBeGreaterThan(0);
      expect(
        renamedImportResult.messages.some(
          (message) => message.ruleId === 'boundary/no-kysely-connection-token-outside-database',
        ),
      ).toBe(true);
    });

    it('mesmo que o lint fosse ignorado, o deep-import não consegue ler dado de outro tenant — RLS contém o impacto, sem TenantContext ativo', async () => {
      // Symbol REAL obtido pelo mesmo caminho de import que o arquivo de
      // fixture acima usa — não um substituto/mock.
      const deepImportedModule = (await import(
        /* @vite-ignore */ pathToFileURL(deepImportFixturePath).href
      )) as { __be04DeepImportFixtureToken: symbol };
      const realToken = deepImportedModule.__be04DeepImportFixtureToken;

      @Injectable()
      class NotARepositoryServiceViaDeepImport {
        constructor(@Inject(realToken as never) private readonly rawConnection: unknown) {}
        runRawQueryWithoutTenantContext() {
          return (this.rawConnection as any)
            .selectFrom('exception_queue_items')
            .selectAll()
            .execute();
        }
      }

      process.env.APP_DATABASE_URL = appRoleConnectionUri;
      try {
        // Diferente de QA-BUG-002 (barrel, hoje undefined — rejeitaria o
        // módulo antes de montar), o deep-import resolve um provider real:
        // o módulo monta com sucesso, exatamente a caracterização de
        // QA-DEBT-012 ("nada impede este caminho em runtime/compilação").
        const moduleRef = await Test.createTestingModule({
          imports: [DatabaseModule],
          providers: [NotARepositoryServiceViaDeepImport],
        }).compile();

        const service = moduleRef.get(NotARepositoryServiceViaDeepImport);

        const before = await adminClient.query(
          'SELECT count(*)::int AS total FROM exception_queue_items',
        );

        // Nenhum TenantContext.run() ativo aqui — e nenhum filtro de
        // aplicação, já que este provider nunca passou por
        // TenantScopedRepository. Sem app.tenant_id definido nesta conexão,
        // a política RLS (falha fechada, backend/docs/tenant-guard-and-rls.md)
        // é a única coisa que impede o vazamento.
        const leaked = await service.runRawQueryWithoutTenantContext();
        expect(leaked).toEqual([]);

        const after = await adminClient.query(
          'SELECT count(*)::int AS total FROM exception_queue_items',
        );
        expect(after.rows[0].total).toBe(before.rows[0].total);

        await moduleRef.close();
      } finally {
        delete process.env.APP_DATABASE_URL;
      }
    });
  });
});
