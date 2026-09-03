import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { buildBullMqConnectionOptionsFromConfig } from './queue-connection.js';
import { loadRedisConfig } from '../redis/redis-config.js';

/**
 * BE-05 (`TASK.md`) — infraestrutura mínima de fila operacional
 * (produtor). Módulos de domínio futuros (BE-07 Imaging Gateway/conversão
 * de imagem, BE-24 ingestão) importam `QueueModule` e chamam
 * `getQueue('<nome-da-fila-de-negócio>')` para obter uma `Queue` BullMQ
 * pronta, sem reimplementar opções de conexão/prefixo — nenhum nome de
 * fila de negócio é definido nesta tarefa (fora de escopo, ver
 * `backend/docs/redis-and-queues.md`).
 *
 * Não gerencia `Worker` (consumidor): cada módulo de domínio conhece o
 * próprio processor (função de negócio), que esta infraestrutura não deve
 * assumir — `buildBullMqConnectionOptions`/`loadRedisConfig().bullmqPrefix`
 * (`src/queue/index.ts`) ficam disponíveis para quem for instanciar um
 * `Worker` fora daqui.
 */
@Injectable()
export class QueueRegistryService implements OnModuleDestroy {
  private readonly queues = new Map<string, Queue>();

  getQueue(name: string): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    // `loadRedisConfig()` chamado uma única vez por fila nova — a conexão
    // e o prefixo vêm da mesma leitura/validação de env, em vez de
    // reparsear (e revalidar, `parsePositiveInt` incluído) as env vars duas
    // vezes para a mesma operação lógica.
    const config = loadRedisConfig();
    const queue = new Queue(name, {
      connection: buildBullMqConnectionOptionsFromConfig(config),
      prefix: config.bullmqPrefix,
    });
    this.queues.set(name, queue);
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(Array.from(this.queues.values(), (queue) => queue.close()));
    this.queues.clear();
  }
}
