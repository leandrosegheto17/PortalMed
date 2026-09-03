import 'reflect-metadata';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { runner } from 'node-pg-migrate';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DOMAIN_TABLES } from '../../src/database/domain-tables.js';
import { createKyselyConnection } from '../../src/database/kysely-connection.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { provideTenantScopedRepository } from '../../src/database/provide-tenant-scoped-repository.js';
import {
  MissingTenantContextError,
  TenantContext,
} from '../../src/database/tenant-context.js';
import { TenantScopedRepository } from '../../src/database/tenant-scoped.repository.js';

/**
 * BE-03 (`TASK.md`) — valida as duas camadas de isolamento multi-tenant
 * contra um PostgreSQL **real** e efêmero (`testcontainers`), exatamente
 * como o critério de aceite exige ("a validação de RLS/guard exige banco
 * real, não pode ser mockada"): nenhum mock de `pg`/Kysely é usado aqui.
 *
 * Escopo deliberado desta suíte (infraestrutura do guard + RLS, não a
 * prova exaustiva de vazamento — isso é BE-04, tarefa separada, condição do
 * Gate 2 do CTO):
 * 1. Guard de aplicação é estrutural — nenhuma query roda sem `tenant_id`
 *    do `TenantContext` (`MissingTenantContextError` antes de tocar o
 *    banco).
 * 2. RLS está habilitado e é comprovado, tabela por tabela (todas as 13 de
 *    `DOMAIN_TABLES`), como política real no catálogo do Postgres.
 * 3. RLS funciona como camada **independente**: testado via `pg.Client` cru
 *    conectado como a role de runtime (`portalmed_app`), sem passar pelo
 *    guard/Kysely — prova que a política em si isola, não só que o guard de
 *    aplicação isola.
 * 4. Um "smoke test" de round-trip através do guard real
 *    (`TenantScopedRepository`) prova as duas camadas atuando juntas, no
 *    caminho que a aplicação de fato usa.
 */
describe('BE-03 — guard de aplicação de tenant_id + Row-Level Security', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');
  const APP_ROLE_PASSWORD = 'be03-test-only-password';

  let container: StartedPostgreSqlContainer;
  let adminClient: Client; // conecta como o superusuário do container (roda migrations, semeia dados ignorando RLS)
  let appRoleConnectionUri: string;

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

  async function createTenant(nome: string, identificador: string): Promise<string> {
    const { rows } = await adminClient.query(
      `INSERT INTO tenants (nome_institucional, identificador_integracao)
       VALUES ($1, $2) RETURNING id`,
      [nome, identificador],
    );
    return rows[0].id as string;
  }

  beforeAll(async () => {
    process.env.APP_DB_ROLE_PASSWORD = APP_ROLE_PASSWORD;

    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('portalmed_tenant_guard_test')
      .start();

    await runMigrations('up');

    adminClient = new Client({ connectionString: container.getConnectionUri() });
    await adminClient.connect();

    const adminUrl = new URL(container.getConnectionUri());
    adminUrl.username = 'portalmed_app';
    adminUrl.password = APP_ROLE_PASSWORD;
    appRoleConnectionUri = adminUrl.toString();
  }, 180_000);

  afterAll(async () => {
    await adminClient?.end();
    await container?.stop();
    delete process.env.APP_DB_ROLE_PASSWORD;
  });

  describe('RLS habilitada e com política, em toda tabela de domínio (estrutural)', () => {
    it.each(DOMAIN_TABLES)('tabela "%s" tem RLS enable + force + política ativa', async (table) => {
      const { rows } = await adminClient.query(
        `SELECT relrowsecurity, relforcerowsecurity FROM pg_class
         WHERE relname = $1 AND relnamespace = 'public'::regnamespace`,
        [table],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].relrowsecurity).toBe(true);
      expect(rows[0].relforcerowsecurity).toBe(true);

      const policies = await adminClient.query(
        `SELECT policyname FROM pg_policies WHERE tablename = $1 AND policyname = 'tenant_isolation_policy'`,
        [table],
      );
      expect(policies.rows).toHaveLength(1);
    });
  });

  describe('RLS como camada independente do guard de aplicação (cliente cru, role portalmed_app)', () => {
    let tenantA: string;
    let tenantB: string;

    beforeAll(async () => {
      tenantA = await createTenant('Hospital RLS A', 'HOSP-RLS-A');
      tenantB = await createTenant('Hospital RLS B', 'HOSP-RLS-B');

      // Semeado como superusuário (ignora RLS) — o teste abaixo não passa
      // por TenantScopedRepository nem por nenhum filtro de aplicação.
      await adminClient.query(
        `INSERT INTO exception_queue_items (tenant_id, payload_normalizado)
         VALUES ($1, '{"origem": "tenant-a"}'::jsonb)`,
        [tenantA],
      );
      await adminClient.query(
        `INSERT INTO exception_queue_items (tenant_id, payload_normalizado)
         VALUES ($1, '{"origem": "tenant-b"}'::jsonb)`,
        [tenantB],
      );

      await adminClient.query(`INSERT INTO branding_configs (tenant_id) VALUES ($1)`, [tenantA]);
      await adminClient.query(`INSERT INTO branding_configs (tenant_id) VALUES ($1)`, [tenantB]);
    });

    it('sem app.tenant_id definido, SELECT sem WHERE não retorna nenhuma linha (falha fechada)', async () => {
      const rows = await withAppRoleClient(undefined, (client) =>
        client.query('SELECT * FROM exception_queue_items').then((r) => r.rows),
      );
      expect(rows).toHaveLength(0);
    });

    it('com app.tenant_id = tenant A, SELECT sem WHERE só retorna linhas do tenant A', async () => {
      const rows = await withAppRoleClient(tenantA, (client) =>
        client.query('SELECT tenant_id FROM exception_queue_items').then((r) => r.rows),
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.tenant_id === tenantA)).toBe(true);
    });

    it('com app.tenant_id = tenant B, SELECT sem WHERE só retorna linhas do tenant B (nunca do A)', async () => {
      const rows = await withAppRoleClient(tenantB, (client) =>
        client.query('SELECT tenant_id FROM exception_queue_items').then((r) => r.rows),
      );
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.tenant_id === tenantB)).toBe(true);
    });

    it('mesmo isolamento se aplica a outra tabela de formato diferente (branding_configs, 1:1 com tenant)', async () => {
      const rowsA = await withAppRoleClient(tenantA, (client) =>
        client.query('SELECT tenant_id FROM branding_configs').then((r) => r.rows),
      );
      expect(rowsA).toHaveLength(1);
      expect(rowsA[0].tenant_id).toBe(tenantA);
    });

    it('INSERT com tenant_id divergente do app.tenant_id da sessão é rejeitado (WITH CHECK)', async () => {
      await expect(
        withAppRoleClient(tenantA, (client) =>
          client.query(
            `INSERT INTO exception_queue_items (tenant_id, payload_normalizado)
             VALUES ($1, '{"tentativa": "cross-tenant"}'::jsonb)`,
            [tenantB],
          ),
        ),
      ).rejects.toThrow(/row-level security/i);
    });

    it('UPDATE tentando reatribuir tenant_id para outro tenant é rejeitado (WITH CHECK)', async () => {
      await expect(
        withAppRoleClient(tenantA, (client) =>
          client.query(`UPDATE branding_configs SET tenant_id = $1 WHERE tenant_id = $2`, [
            tenantB,
            tenantA,
          ]),
        ),
      ).rejects.toThrow(/row-level security/i);
    });

    it('contraste: a role de migration/superusuário do container NÃO é restringida por RLS (por isso a aplicação nunca roda com ela)', async () => {
      const { rows } = await adminClient.query(
        `SELECT DISTINCT tenant_id FROM exception_queue_items`,
      );
      // Sem nenhum set_config de app.tenant_id nesta conexão (superusuário) —
      // ainda assim enxerga os dois tenants, o que documenta por que
      // DatabaseModule nunca conecta com esta role em runtime (ver
      // backend/docs/tenant-guard-and-rls.md).
      const seenTenants = rows.map((row: { tenant_id: string }) => row.tenant_id);
      expect(seenTenants).toEqual(expect.arrayContaining([tenantA, tenantB]));
    });
  });

  describe('guard de aplicação (TenantScopedRepository) — estrutural, não convenção', () => {
    class ExceptionQueueItemsTestRepository extends TenantScopedRepository<'exception_queue_items'> {
      constructor(connection: unknown) {
        super(connection, 'exception_queue_items');
      }
      insertItem(payload: Record<string, unknown>) {
        return this.insert(payload);
      }
      listItems() {
        return this.findAll();
      }
      getById(id: string) {
        return this.findById(id);
      }
    }

    let repository: ExceptionQueueItemsTestRepository;
    let connection: ReturnType<typeof createKyselyConnection>;
    let tenantA: string;
    let tenantB: string;

    beforeAll(async () => {
      connection = createKyselyConnection(appRoleConnectionUri);
      repository = new ExceptionQueueItemsTestRepository(connection);

      tenantA = await createTenant('Hospital Guard A', 'HOSP-GUARD-A');
      tenantB = await createTenant('Hospital Guard B', 'HOSP-GUARD-B');
    });

    afterAll(async () => {
      // Sem isto, o pool `pg` interno fica com socket aberto quando o
      // container para (`afterAll` externo) — gera um "unhandled error"
      // assíncrono (ECONNRESET/admin_shutdown) que não tem relação com o
      // resultado dos testes em si, mas polui a saída do CI.
      await connection?.destroy();
    });

    it('lança MissingTenantContextError e não toca o banco quando não há TenantContext.run() ativo', async () => {
      const before = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );

      await expect(repository.insertItem({ payload_normalizado: { x: 1 } })).rejects.toThrow(
        MissingTenantContextError,
      );

      const after = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );
      expect(after.rows[0].total).toBe(before.rows[0].total);
    });

    it('insert()/findAll() sempre escopados: tenant A nunca vê linha inserida pelo tenant B', async () => {
      await TenantContext.run(tenantA, () =>
        repository.insertItem({ payload_normalizado: { origem: 'guard-tenant-a' } }),
      );
      await TenantContext.run(tenantB, () =>
        repository.insertItem({ payload_normalizado: { origem: 'guard-tenant-b' } }),
      );

      const itemsForA = await TenantContext.run(tenantA, () => repository.listItems());
      const itemsForB = await TenantContext.run(tenantB, () => repository.listItems());

      expect(itemsForA.every((item) => item.tenant_id === tenantA)).toBe(true);
      expect(itemsForB.every((item) => item.tenant_id === tenantB)).toBe(true);
      expect(itemsForA.some((item) => item.tenant_id === tenantB)).toBe(false);
    });

    it('findById() com o id de uma linha de outro tenant retorna undefined (ID guessing básico — a suíte exaustiva é BE-04)', async () => {
      const createdByB = (await TenantContext.run(tenantB, () =>
        repository.insertItem({ payload_normalizado: { origem: 'guard-only-b' } }),
      )) as { id: string };

      const resultUnderTenantA = await TenantContext.run(tenantA, () =>
        repository.getById(createdByB.id),
      );

      expect(resultUnderTenantA).toBeUndefined();
    });

    it('insert() ignora um tenant_id enviado pelo chamador — sempre usa o do TenantContext', async () => {
      const created = (await TenantContext.run(tenantA, () =>
        repository.insertItem({
          tenant_id: tenantB, // tentativa de forjar o tenant — deve ser descartada
          payload_normalizado: { origem: 'tentativa-de-forjar-tenant' },
        }),
      )) as { tenant_id: string };

      expect(created.tenant_id).toBe(tenantA);
    });

    /**
     * Regressão adversarial de `QA-BUG-001` (`TASK.md` BE-03/`QA-REPORT.md`
     * Seção 1.6): o QA provou, contra este mesmo Postgres real via
     * testcontainers, que uma subclasse conseguia acessar `db`/`runOnTable`
     * via cast (`(this as unknown as { db: unknown }).db as any`, sem
     * importar `kysely`/`pg`) e **executar uma query real** sem
     * `TenantContext.run()` ativo e sem `MissingTenantContextError`. Este
     * teste usa exatamente o mesmo vetor de ataque — não um substituto — e
     * confirma que, com `#db`/`#runOnTable` (campos privados nativos), o
     * cast só alcança uma propriedade comum inexistente: a chamada seguinte
     * lança `TypeError` em runtime, e nenhuma linha é escrita no banco real
     * (contado antes/depois, mesmo padrão do teste de
     * `MissingTenantContextError` acima). Se algum refactor futuro
     * reintroduzir `private` do TypeScript em vez de `#`, este teste volta a
     * falhar (a query voltaria a ser executada com sucesso).
     */
    it('[QA-BUG-001] o mesmo cast que o QA usou para contornar o guard agora falha em runtime, sem tocar o banco', async () => {
      class BypassAttemptRepository extends TenantScopedRepository<'exception_queue_items'> {
        constructor(connection: unknown) {
          super(connection, 'exception_queue_items');
        }

        /** Réplica literal do vetor de `QA-BUG-001`: cast para acessar `db` "por fora", sem TenantContext.run() ativo. */
        attemptRawQueryBypassingGuard() {
          const exposedDb = (this as unknown as { db: unknown }).db as any;
          return exposedDb.transaction().execute(
            (trx: any) =>
              trx
                .insertInto('exception_queue_items')
                .values({
                  tenant_id: tenantA,
                  payload_normalizado: { origem: 'bypass-attempt-should-never-persist' },
                })
                .returningAll()
                .executeTakeFirstOrThrow(),
          );
        }

        /** Réplica do mesmo vetor, mas contra `runOnTable` (também corrigido para `#runOnTable`) — cobre o método, não só o campo `db`. */
        attemptRunOnTableBypassingGuard() {
          const exposedRunOnTable = (
            this as unknown as {
              runOnTable: (work: (...args: unknown[]) => unknown) => unknown;
            }
          ).runOnTable;
          return exposedRunOnTable((trx: any, table: string) =>
            trx.selectFrom(table).selectAll().execute(),
          );
        }
      }

      const bypassRepository = new BypassAttemptRepository(connection);

      const before = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );

      // Nenhum TenantContext.run() ativo aqui — exatamente a condição que o
      // QA usou para provar o bypass original.
      expect(() => bypassRepository.attemptRawQueryBypassingGuard()).toThrow(TypeError);
      expect(() => bypassRepository.attemptRunOnTableBypassingGuard()).toThrow(TypeError);

      const after = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );
      expect(after.rows[0].total).toBe(before.rows[0].total);
    });
  });

  describe('[QA-BUG-002] KYSELY_CONNECTION não é mais alcançável fora de src/database/', () => {
    it('o barrel público (src/database/index.ts) não exporta mais KYSELY_CONNECTION', async () => {
      // Réplica da premissa exata do vetor de QA-BUG-002: o QA obteve o
      // token importando o barrel público de fora de src/database/. Import
      // dinâmico aqui (em vez de um `import` estático no topo do arquivo)
      // é deliberado — um `import { KYSELY_CONNECTION } from ...` estático
      // não compilaria mais (o símbolo não existe como exportação), então
      // a única forma de verificar empiricamente, em runtime, que o módulo
      // publicado de fato não expõe mais o token é inspecionar o objeto do
      // módulo resolvido.
      const barrelModule = (await import('../../src/database/index.js')) as unknown as Record<
        string,
        unknown
      >;

      expect(Object.prototype.hasOwnProperty.call(barrelModule, 'KYSELY_CONNECTION')).toBe(
        false,
      );
      expect(barrelModule.KYSELY_CONNECTION).toBeUndefined();

      // Confirma que a interface pública continua funcional para o padrão
      // sancionado (nada foi quebrado ao remover a reexportação do token).
      expect(typeof barrelModule.provideTenantScopedRepository).toBe('function');
      expect(typeof barrelModule.DatabaseModule).toBe('function');
      expect(typeof barrelModule.TenantScopedRepository).toBe('function');
    });

    /**
     * Réplica **literal** do `NotARepositoryService` do relato de
     * `QA-BUG-002` (`QA-REPORT.md` Seção 1.6.1): um provider comum do
     * NestJS, sem nenhuma relação com `TenantScopedRepository`, tentando
     * `@Inject(KYSELY_CONNECTION)` no próprio construtor para obter a
     * conexão real e rodar uma query sem `TenantContext.run()` ativo — a
     * mesma classe, o mesmo objetivo, a mesma ausência de contexto de
     * tenant. A única mudança necessária para este teste ainda "compilar"
     * é obter o valor de `KYSELY_CONNECTION` via import dinâmico do barrel
     * (em vez de um `import` estático, que já nem compilaria) — e esse
     * valor agora é `undefined`, então o `@Inject(undefined)` resultante
     * não corresponde a nenhum provider real: o Nest rejeita a própria
     * montagem do módulo de teste (erro de injeção), a query nunca chega a
     * ser escrita, e nenhuma linha nova aparece na tabela.
     */
    it('provider comum replicando o NotARepositoryService do QA não consegue mais montar o módulo (erro de injeção)', async () => {
      const barrelModule = (await import('../../src/database/index.js')) as unknown as Record<
        string,
        unknown
      >;
      const tokenObtidoDoBarrel = barrelModule.KYSELY_CONNECTION; // undefined, pós-correção

      @Injectable()
      class NotARepositoryService {
        constructor(@Inject(tokenObtidoDoBarrel as never) private readonly rawConnection: unknown) {}
        runRawQuery() {
          return (this.rawConnection as any)
            .selectFrom('exception_queue_items')
            .selectAll()
            .execute();
        }
      }

      process.env.APP_DATABASE_URL = appRoleConnectionUri;
      const before = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );

      try {
        await expect(
          Test.createTestingModule({
            imports: [DatabaseModule],
            providers: [NotARepositoryService],
          }).compile(),
        ).rejects.toThrow();
      } finally {
        delete process.env.APP_DATABASE_URL;
      }

      const after = await adminClient.query(
        'SELECT count(*)::int AS total FROM exception_queue_items',
      );
      expect(after.rows[0].total).toBe(before.rows[0].total);
    });
  });

  describe('padrão sancionado pós-QA-BUG-002 (provideTenantScopedRepository) — end-to-end contra Postgres real', () => {
    /**
     * Réplica de como um repositório concreto de domínio futuro (BE-10+)
     * se registra — nenhuma linha deste teste referencia
     * `KYSELY_CONNECTION`, só a classe do repositório em si, exatamente
     * como `provideTenantScopedRepository` exige.
     */
    class ExceptionQueueItemsProvidedRepository extends TenantScopedRepository<'exception_queue_items'> {
      constructor(connection: unknown) {
        super(connection, 'exception_queue_items');
      }
      insertItem(payload: Record<string, unknown>) {
        return this.insert(payload);
      }
    }

    let moduleRef: TestingModule;
    let repository: ExceptionQueueItemsProvidedRepository;
    let tenantA: string;

    beforeAll(async () => {
      process.env.APP_DATABASE_URL = appRoleConnectionUri;

      // Mesmo padrão que um módulo de domínio real (BE-10+) usaria:
      // `imports: [DatabaseModule]` + `provideTenantScopedRepository(...)`
      // entre os providers — sem nenhum `@Inject(KYSELY_CONNECTION)` em
      // lugar nenhum deste teste.
      moduleRef = await Test.createTestingModule({
        imports: [DatabaseModule],
        providers: [provideTenantScopedRepository(ExceptionQueueItemsProvidedRepository)],
      }).compile();

      repository = moduleRef.get(ExceptionQueueItemsProvidedRepository);

      tenantA = await createTenant('Hospital Provide A', 'HOSP-PROVIDE-A');
    });

    afterAll(async () => {
      await moduleRef?.close();
      delete process.env.APP_DATABASE_URL;
    });

    it('resolve o repositório concreto via DI real do NestJS, e o guard de aplicação continua exigindo TenantContext antes de tocar o banco', async () => {
      await expect(
        repository.insertItem({ payload_normalizado: { origem: 'provide-factory-sem-contexto' } }),
      ).rejects.toThrow(MissingTenantContextError);

      const created = (await TenantContext.run(tenantA, () =>
        repository.insertItem({ payload_normalizado: { origem: 'provide-factory-ok' } }),
      )) as { tenant_id: string };

      expect(created.tenant_id).toBe(tenantA);
    });
  });

  describe('reversibilidade (mesmo padrão de BE-02)', () => {
    it('down desfaz as duas migrations de BE-03 (role + RLS) sem deixar a role ou as políticas para trás', async () => {
      await runMigrations('down', 2);

      const role = await adminClient.query(`SELECT rolname FROM pg_roles WHERE rolname = 'portalmed_app'`);
      expect(role.rows).toHaveLength(0);

      const policies = await adminClient.query(
        `SELECT policyname FROM pg_policies WHERE policyname = 'tenant_isolation_policy'`,
      );
      expect(policies.rows).toHaveLength(0);

      // Restaura o schema para não deixar o container/estado inconsistente
      // caso outro teste reaproveite a mesma conexão antes do afterAll.
      await runMigrations('up');
    }, 60_000);
  });
});
