import { describe, expect, it } from 'vitest';
import { loadRedisConfig } from './redis-config.js';

/**
 * BE-05 (`TASK.md`) — toda configuração de Redis (host, porta, senha, TTL,
 * prefixo de chave) vem de env/config, nunca hardcoded (`TASK.md` §1.1).
 * `loadRedisConfig` aceita um objeto de env explícito (em vez de ler
 * `process.env` direto) para ser testável sem mutar o ambiente do processo.
 */
describe('loadRedisConfig', () => {
  it('usa defaults documentados quando nenhuma variável de ambiente é fornecida', () => {
    const config = loadRedisConfig({});

    expect(config).toMatchObject({
      host: 'localhost',
      port: 6379,
      password: undefined,
      tls: false,
      keyPrefix: 'portalmed:dev',
      sessionInactivityTtlSeconds: 900, // RF-04, TASK.md §1.7 — 15 min default
      bullmqPrefix: 'portalmed:bullmq:dev',
    });
  });

  it('lê todos os valores de env quando fornecidos', () => {
    const config = loadRedisConfig({
      REDIS_HOST: 'redis.portalmed.internal',
      REDIS_PORT: '6380',
      REDIS_PASSWORD: 'super-secret',
      REDIS_TLS: 'true',
      REDIS_KEY_PREFIX: 'portalmed:staging',
      SESSION_INACTIVITY_TTL_SECONDS: '600',
      BULLMQ_PREFIX: 'portalmed:bullmq:staging',
    });

    expect(config).toEqual({
      host: 'redis.portalmed.internal',
      port: 6380,
      password: 'super-secret',
      tls: true,
      keyPrefix: 'portalmed:staging',
      sessionInactivityTtlSeconds: 600,
      bullmqPrefix: 'portalmed:bullmq:staging',
    });
  });

  it('lança erro se REDIS_PORT não for um inteiro positivo (não esconde configuração inválida)', () => {
    expect(() => loadRedisConfig({ REDIS_PORT: 'não-é-numero' })).toThrow(
      /REDIS_PORT/,
    );
    expect(() => loadRedisConfig({ REDIS_PORT: '-1' })).toThrow(/REDIS_PORT/);
    expect(() => loadRedisConfig({ REDIS_PORT: '0' })).toThrow(/REDIS_PORT/);
  });

  it('lança erro se SESSION_INACTIVITY_TTL_SECONDS não for um inteiro positivo', () => {
    expect(() =>
      loadRedisConfig({ SESSION_INACTIVITY_TTL_SECONDS: 'quinze-minutos' }),
    ).toThrow(/SESSION_INACTIVITY_TTL_SECONDS/);
    expect(() =>
      loadRedisConfig({ SESSION_INACTIVITY_TTL_SECONDS: '0' }),
    ).toThrow(/SESSION_INACTIVITY_TTL_SECONDS/);
  });

  it('trata REDIS_TLS ausente/string vazia como false (default seguro)', () => {
    expect(loadRedisConfig({ REDIS_TLS: '' }).tls).toBe(false);
    expect(loadRedisConfig({}).tls).toBe(false);
  });

  it('aceita REDIS_TLS literal "true"/"false"', () => {
    expect(loadRedisConfig({ REDIS_TLS: 'true' }).tls).toBe(true);
    expect(loadRedisConfig({ REDIS_TLS: 'false' }).tls).toBe(false);
  });

  it.each(['True', 'FALSE', '1', '0', 'yes', 'no'])(
    'lança erro explícito para REDIS_TLS não reconhecido (correção pós-revisão de BE-08, fix-loop tentativa 2 de 2 — antes caía silenciosamente em `false`, estabelecendo conexão Redis não criptografada carregando dado de sessão sem aviso): "%s"',
    (value) => {
      expect(() => loadRedisConfig({ REDIS_TLS: value })).toThrow(/REDIS_TLS inválido/);
    },
  );
});
