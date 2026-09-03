import { Redis } from 'ioredis';
import type { RedisConfig } from './redis-config.js';

/**
 * Token de injeção interno da conexão real (`ioredis`). Deliberadamente
 * **não** reexportado por `index.ts` (barrel público de `src/redis/`) —
 * mesma disciplina já aplicada a `KYSELY_CONNECTION`
 * (`src/database/kysely-connection.ts`, correção de `QA-BUG-002`,
 * `TASK.md` BE-03): o Redis guarda dado de sessão de usuário final
 * (ADR-007), e um cliente Redis de uso geral, se exposto livremente a
 * qualquer provider do NestJS, permitiria ler/escrever qualquer chave —
 * inclusive a de outro tenant, por adivinhação de `sessionId` — por fora de
 * qualquer repositório/abstração dedicada que uma tarefa futura (BE-14)
 * venha a construir. Nesta tarefa (BE-05) não existe ainda nenhum
 * consumidor de sessão real — só a infraestrutura de conexão e a
 * convenção de chave (`session-key.ts`) — então manter o token interno
 * desde já evita reabrir, em BE-14, o mesmo tipo de vetor que BE-03 só
 * fechou depois de um achado do QA. Só `RedisHealthService` (mesmo
 * diretório) usa este símbolo.
 */
export const REDIS_CONNECTION = Symbol('REDIS_CONNECTION');

/** Cria a instância real do `ioredis` — só chamada por `RedisModule`. */
export function createRedisConnection(config: RedisConfig): Redis {
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
  });
}
