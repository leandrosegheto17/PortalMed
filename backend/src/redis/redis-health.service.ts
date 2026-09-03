import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CONNECTION } from './redis-connection.js';

/**
 * BE-05 (`TASK.md`) — única forma sancionada de um consumidor externo a
 * `src/redis/` confirmar que a instância Redis está acessível pela
 * aplicação ("Instância Redis acessível pela aplicação", critério de
 * aceite). Não expõe `get`/`set` genérico de propósito — ver nota em
 * `redis-connection.ts` sobre não reexportar `REDIS_CONNECTION`.
 *
 * O parâmetro do construtor é tipado diretamente como `Redis` (não
 * `unknown` + cast) — este arquivo é um dos dois únicos consumidores
 * internos do token `REDIS_CONNECTION` (o outro é `redis.module.ts`, que
 * cria a instância), então não há necessidade de descartar segurança de
 * tipo em tempo de compilação como acontece em `TenantScopedRepository`
 * (`src/database/`), onde `unknown` existe para impedir uma *subclasse de
 * domínio externa* de montar query fora do guard — não é o caso aqui.
 */
@Injectable()
export class RedisHealthService {
  constructor(@Inject(REDIS_CONNECTION) private readonly client: Redis) {}

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
