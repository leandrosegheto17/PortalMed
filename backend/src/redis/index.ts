// Interface pública de `src/redis` (BE-05, `TASK.md`) — infraestrutura
// transversal (não é bounded context), mesmo espírito de `src/database/
// index.ts`: único ponto de entrada permitido para o restante da aplicação.
//
// Deliberadamente NÃO reexporta `REDIS_CONNECTION`/`createRedisConnection`
// (só usados internamente por `RedisModule`/`RedisHealthService`) — mesma
// disciplina aplicada a `KYSELY_CONNECTION` em `src/database/index.ts`
// desde a correção de `QA-BUG-002` (`TASK.md` BE-03). Ver nota completa em
// `redis-connection.ts`.
export { RedisModule } from './redis.module.js';
export { RedisHealthService } from './redis-health.service.js';
export { buildSessionRedisKey, type SessionKeyParams } from './session-key.js';
export { loadRedisConfig, type RedisConfig } from './redis-config.js';
