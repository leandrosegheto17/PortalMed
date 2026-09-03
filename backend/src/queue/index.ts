// Interface pública de `src/queue` (BE-05, `TASK.md`) — infraestrutura
// transversal de fila assíncrona (BullMQ), não um bounded context.
export { QueueModule } from './queue.module.js';
export { QueueRegistryService } from './queue-registry.service.js';
export { buildBullMqConnectionOptions } from './queue-connection.js';
