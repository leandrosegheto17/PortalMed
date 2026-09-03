import type { ConnectionOptions } from 'bullmq';
import { loadRedisConfig, type RedisConfig } from '../redis/redis-config.js';

/**
 * BE-05 (`TASK.md`) — opções de conexão para `Queue`/`Worker` do BullMQ.
 *
 * Reaproveita a mesma fonte de configuração de `src/redis/redis-config.ts`
 * (host/porta/senha/TLS, sempre via env — nunca hardcoded), mas
 * deliberadamente **não** compartilha uma única instância de cliente
 * `ioredis` com o resto da aplicação (ex.: um futuro cliente de sessão de
 * BE-14): o BullMQ exige `maxRetriesPerRequest: null` para os comandos
 * bloqueantes usados por `Worker` (`BRPOPLPUSH`/`BLMOVE` internos), o que é
 * incompatível com um cliente Redis de uso geral (que quer retry normal).
 * "Conexão Redis compartilhada" (critério de aceite de BE-05) é entendida
 * aqui como "mesma fonte de configuração/mesma instância Redis-alvo", não
 * "mesmo objeto de cliente ioredis" — decisão de detalhe documentada em
 * `backend/docs/redis-and-queues.md`.
 */
export function buildBullMqConnectionOptions(
  env?: Partial<Record<string, string | undefined>>,
): ConnectionOptions {
  return buildBullMqConnectionOptionsFromConfig(loadRedisConfig(env));
}

/**
 * Mesma lógica de `buildBullMqConnectionOptions`, mas recebendo um
 * `RedisConfig` já carregado — usada por quem (ex.: `QueueRegistryService`)
 * também precisa de outro campo da mesma config (`bullmqPrefix`) na mesma
 * operação lógica, evitando chamar `loadRedisConfig()`/reparsear as env vars
 * (incluindo as validações de `parsePositiveInt`) mais de uma vez.
 */
export function buildBullMqConnectionOptionsFromConfig(config: RedisConfig): ConnectionOptions {
  return {
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
