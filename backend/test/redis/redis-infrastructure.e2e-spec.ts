import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { RedisModule, RedisHealthService, buildSessionRedisKey } from '../../src/redis/index.js';
import { createRedisConnection } from '../../src/redis/redis-connection.js';
import type { RedisConfig } from '../../src/redis/redis-config.js';

/**
 * BE-05 (`TASK.md`) — valida a infraestrutura de conexão Redis contra uma
 * instância **real** e efêmera via `testcontainers` (`redis:7-alpine`),
 * mesmo padrão já usado por BE-02/BE-03/BE-04 para PostgreSQL
 * (`test/migrations/schema.e2e-spec.ts`, `test/database/*.e2e-spec.ts`):
 * nenhum mock de `ioredis`, exigido pelo critério de aceite ("Instância
 * Redis acessível pela aplicação").
 *
 * Escopo: só a infraestrutura de conexão + convenção de chave de sessão.
 * Nenhuma lógica de criação/expiração de sessão é testada aqui — isso é
 * BE-14, tarefa futura.
 */
describe('BE-05 — infraestrutura de conexão Redis', () => {
  let container: StartedRedisContainer;
  let config: RedisConfig;

  beforeAll(async () => {
    container = await new RedisContainer('redis:7-alpine').start();
    config = {
      host: container.getHost(),
      port: container.getPort(),
      password: undefined,
      tls: false,
      keyPrefix: 'portalmed:test',
      sessionInactivityTtlSeconds: 900,
      bullmqPrefix: 'portalmed:bullmq:test',
    };
  }, 120_000);

  afterAll(async () => {
    await container?.stop();
  });

  it('conecta a uma instância Redis real e responde PONG (createRedisConnection)', async () => {
    const client = createRedisConnection(config);
    try {
      await expect(client.ping()).resolves.toBe('PONG');
    } finally {
      client.disconnect();
    }
  });

  it('RedisModule fornece RedisHealthService com conectividade real, configurado só via env (TASK.md §1.1)', async () => {
    const originalEnv = { ...process.env };
    process.env.REDIS_HOST = config.host;
    process.env.REDIS_PORT = String(config.port);
    delete process.env.REDIS_PASSWORD;
    process.env.REDIS_TLS = 'false';

    const moduleRef = await Test.createTestingModule({
      imports: [RedisModule],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const health = app.get(RedisHealthService);
      await expect(health.ping()).resolves.toBe('PONG');
    } finally {
      await app.close();
      process.env = originalEnv;
    }
  });

  it('RedisModule não exporta a conexão bruta (REDIS_CONNECTION) fora de src/redis/ — mesma disciplina de KYSELY_CONNECTION (QA-BUG-002)', async () => {
    const barrel = (await import('../../src/redis/index.js')) as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(barrel, 'REDIS_CONNECTION')).toBe(false);
  });

  it('estrutura de chave de sessão (buildSessionRedisKey) é utilizável de ponta a ponta contra Redis real', async () => {
    const client = createRedisConnection(config);
    const key = buildSessionRedisKey(config.keyPrefix, {
      tenantId: 'tenant-e2e',
      sessionId: 'session-e2e-123',
    });

    try {
      await client.set(key, JSON.stringify({ userId: 'user-1' }), 'EX', config.sessionInactivityTtlSeconds);
      const raw = await client.get(key);
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw as string)).toEqual({ userId: 'user-1' });

      const ttl = await client.ttl(key);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(config.sessionInactivityTtlSeconds);

      // Nenhuma chave de outro tenant é afetada/lida por engano — mesmo
      // sessionId, tenant diferente, chave física diferente.
      const otherTenantKey = buildSessionRedisKey(config.keyPrefix, {
        tenantId: 'tenant-outro',
        sessionId: 'session-e2e-123',
      });
      expect(await client.get(otherTenantKey)).toBeNull();
    } finally {
      await client.del(key);
      client.disconnect();
    }
  });
});
