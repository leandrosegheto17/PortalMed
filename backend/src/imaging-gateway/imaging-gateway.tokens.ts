/**
 * Símbolo de injeção de dependência para `ImagingGatewayConfig` — arquivo
 * dedicado (em vez de declarado dentro do módulo/serviço) só para evitar
 * import circular entre `imaging-gateway.module.ts` e
 * `imaging-gateway-acl.service.ts`/`imaging-conversion.processor.ts`, mesmo
 * padrão mínimo já usado por `INTEGRATION_ENGINE_CONFIG`
 * (`src/integration-engine/integration-engine.tokens.ts`, BE-06) e por
 * `OBJECT_STORAGE_CONFIG` (`src/object-storage/s3-client.ts`, BE-08).
 */
export const IMAGING_GATEWAY_CONFIG = Symbol('IMAGING_GATEWAY_CONFIG');

/**
 * Nome da fila BullMQ desta tarefa (BE-07) — infraestrutura de fila/worker
 * já preparada por BE-05 (`backend/docs/redis-and-queues.md` já citava
 * explicitamente "Entrega de Laudo/Imagem (BE-07, conversão de imagem)"
 * como consumidor futuro). Nenhum outro módulo reserva este nome.
 */
export const IMAGING_CONVERSION_QUEUE_NAME = 'imaging-conversion';
