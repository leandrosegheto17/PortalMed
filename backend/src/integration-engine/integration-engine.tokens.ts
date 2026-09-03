/**
 * Símbolo de injeção de dependência para `IntegrationEngineConfig` —
 * arquivo dedicado (em vez de declarar o símbolo dentro do módulo ou do
 * serviço) só para evitar import circular entre `integration-engine.module.ts`
 * e `integration-engine-acl.service.ts`, mesmo padrão mínimo já usado por
 * `OBJECT_STORAGE_CONFIG` (`src/object-storage/s3-client.ts`).
 */
export const INTEGRATION_ENGINE_CONFIG = Symbol('INTEGRATION_ENGINE_CONFIG');
