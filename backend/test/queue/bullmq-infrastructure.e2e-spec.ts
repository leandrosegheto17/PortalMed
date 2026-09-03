import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { Queue, Worker, type Job } from 'bullmq';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { QueueModule, QueueRegistryService, buildBullMqConnectionOptions } from '../../src/queue/index.js';

/**
 * BE-05 (`TASK.md`) — valida a infraestrutura de fila BullMQ contra um
 * Redis **real** e efêmero via `testcontainers` (mesmo padrão de
 * `test/redis/redis-infrastructure.e2e-spec.ts`). Prova que uma fila
 * BullMQ está operacional de ponta a ponta (produtor adiciona job,
 * consumidor processa) — nenhum job de negócio real (conversão de
 * imagem/BE-07, ingestão/BE-24) é implementado aqui, só a infraestrutura
 * que essas tarefas futuras vão consumir.
 */
describe('BE-05 — infraestrutura de fila BullMQ', () => {
  let container: StartedRedisContainer;
  let env: Record<string, string>;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    env = {
      REDIS_HOST: container.getHost(),
      REDIS_PORT: String(container.getPort()),
      REDIS_TLS: 'false',
    };
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('uma fila BullMQ aceita e processa um job de exemplo de ponta a ponta (produtor + worker, Redis real)', async () => {
    const queueName = `infra-smoke-test-${randomUUID()}`;
    const connection = buildBullMqConnectionOptions(env);
    const prefix = 'portalmed:bullmq:test';

    const queue = new Queue(queueName, { connection, prefix });
    const processed: unknown[] = [];

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        processed.push(job.data);
        return { ok: true };
      },
      { connection, prefix },
    );

    try {
      await worker.waitUntilReady();
      const job = await queue.add('exemplo-job', { hello: 'portalmed' });

      // Poll direto do estado do job (em vez de `job.waitUntilFinished`,
      // que dependeria de instanciar `QueueEvents` à parte) — mais simples
      // e explícito para este teste de infraestrutura.
      await vi.waitFor(
        async () => {
          const refreshed = await queue.getJob(job.id!);
          expect(await refreshed?.getState()).toBe('completed');
        },
        { timeout: 10_000, interval: 100 },
      );

      expect(processed).toEqual([{ hello: 'portalmed' }]);
    } finally {
      await worker.close();
      await queue.obliterate({ force: true }).catch(() => undefined);
      await queue.close();
    }
  }, 30_000);

  it('QueueRegistryService (DI do NestJS) fornece uma fila operacional e a fecha em onModuleDestroy', async () => {
    const originalEnv = { ...process.env };
    process.env.REDIS_HOST = env.REDIS_HOST;
    process.env.REDIS_PORT = env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
    process.env.REDIS_TLS = 'false';
    process.env.BULLMQ_PREFIX = 'portalmed:bullmq:test-di';

    const moduleRef = await Test.createTestingModule({
      imports: [QueueModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const queueName = `infra-smoke-test-di-${randomUUID()}`;
    const registry = app.get(QueueRegistryService);
    const queue = registry.getQueue(queueName);

    // Chamar de novo com o mesmo nome devolve a MESMA instância (cache) —
    // parte do contrato de `getQueue`.
    expect(registry.getQueue(queueName)).toBe(queue);

    const connection = buildBullMqConnectionOptions(env);
    const processed: unknown[] = [];
    const worker = new Worker(
      queueName,
      async (job: Job) => {
        processed.push(job.data);
      },
      { connection, prefix: 'portalmed:bullmq:test-di' },
    );

    try {
      await worker.waitUntilReady();
      const job = await queue.add('exemplo-job-di', { via: 'queue-registry' });

      await vi.waitFor(
        async () => {
          const refreshed = await queue.getJob(job.id!);
          expect(await refreshed?.getState()).toBe('completed');
        },
        { timeout: 10_000, interval: 100 },
      );

      expect(processed).toEqual([{ via: 'queue-registry' }]);
    } finally {
      await worker.close();
      await queue.obliterate({ force: true }).catch(() => undefined);
      // onModuleDestroy do QueueRegistryService fecha a(s) fila(s)
      // registradas — não fechamos `queue` manualmente aqui de propósito,
      // para provar que app.close() é suficiente.
      await app.close();
      process.env = originalEnv;
    }
  }, 30_000);
});
