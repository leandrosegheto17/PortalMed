import { Module } from '@nestjs/common';
import { QueueRegistryService } from './queue-registry.service.js';

/**
 * Módulo de infraestrutura transversal (BE-05, `TASK.md`) — não é bounded
 * context; fila assíncrona é infraestrutura compartilhada por múltiplos
 * bounded contexts futuros (Entrega de Laudo/Imagem — conversão de imagem,
 * BE-07; Fila de Exceção/Notificação — ingestão, BE-24), mesma decisão
 * estrutural de `RedisModule`/`DatabaseModule`. Ver
 * `backend/docs/redis-and-queues.md` para a justificativa completa.
 */
@Module({
  providers: [QueueRegistryService],
  exports: [QueueRegistryService],
})
export class QueueModule {}
