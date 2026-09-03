import { describe, expect, it } from 'vitest';
import { buildBullMqConnectionOptions } from './queue-connection.js';

/**
 * BE-05 (`TASK.md`) — opções de conexão do BullMQ reaproveitam a mesma
 * fonte de configuração de `src/redis/redis-config.ts` (host/porta/senha/
 * TLS via env, nunca hardcoded), mas sempre com `maxRetriesPerRequest:
 * null` — exigência do BullMQ para os comandos bloqueantes usados por
 * `Worker` (ver `backend/docs/redis-and-queues.md`).
 */
describe('buildBullMqConnectionOptions', () => {
  it('usa host/porta default e maxRetriesPerRequest null quando nenhuma env é fornecida', () => {
    const options = buildBullMqConnectionOptions({});

    expect(options).toMatchObject({
      host: 'localhost',
      port: 6379,
      password: undefined,
      maxRetriesPerRequest: null,
    });
  });

  it('propaga host/porta/senha/TLS configurados via env (nunca hardcoded)', () => {
    const options = buildBullMqConnectionOptions({
      REDIS_HOST: 'redis.portalmed.internal',
      REDIS_PORT: '6380',
      REDIS_PASSWORD: 'super-secret',
      REDIS_TLS: 'true',
    });

    expect(options).toMatchObject({
      host: 'redis.portalmed.internal',
      port: 6380,
      password: 'super-secret',
      maxRetriesPerRequest: null,
    });
    expect(options.tls).toBeDefined();
  });

  it('não define tls quando REDIS_TLS não está habilitado', () => {
    const options = buildBullMqConnectionOptions({});
    expect(options.tls).toBeUndefined();
  });
});
