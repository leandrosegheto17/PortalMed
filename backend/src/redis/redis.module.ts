import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { createRedisConnection, REDIS_CONNECTION } from './redis-connection.js';
import { loadRedisConfig } from './redis-config.js';
import { RedisHealthService } from './redis-health.service.js';

/**
 * Módulo de infraestrutura transversal (BE-05, `TASK.md`) — não é um
 * bounded context (`SDD.md` §2.1); é infraestrutura compartilhada, mesmo
 * padrão de `src/database/` (BE-01 a BE-04). Fornece a conexão Redis (via
 * `REDIS_CONNECTION`, símbolo interno — ver `redis-connection.ts`) e
 * `RedisHealthService`, único ponto de acesso exposto pelo barrel público.
 *
 * Configuração sempre via env (`loadRedisConfig`, `redis-config.ts`) —
 * nunca hardcoded (`TASK.md` §1.1).
 *
 * Escopo desta tarefa: só a infraestrutura de conexão. A criação de sessão
 * em si (TTL deslizante, expiração por inatividade, logout) é BE-14 —
 * quando essa tarefa precisar de um repositório de sessão real, o padrão
 * esperado é estendê-lo dentro deste mesmo diretório (`src/redis/`), nunca
 * expor `REDIS_CONNECTION` para fora dele (ver nota em
 * `redis-connection.ts`).
 */
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: () => createRedisConnection(loadRedisConfig()),
    },
    RedisHealthService,
  ],
  exports: [RedisHealthService],
})
export class RedisModule implements OnModuleDestroy {
  constructor(@Inject(REDIS_CONNECTION) private readonly connection: unknown) {}

  async onModuleDestroy(): Promise<void> {
    (this.connection as Redis | undefined)?.disconnect?.();
  }
}
