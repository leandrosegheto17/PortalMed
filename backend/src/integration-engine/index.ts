// Interface pública de `src/integration-engine/` (BE-06, `TASK.md`) —
// Anti-Corruption Layer entre a Integration Engine (NextGen Connect,
// ADR-002) e o domínio do core. Mesma disciplina de barrel único dos
// demais diretórios de infraestrutura (`src/database/`, `src/redis/`,
// `src/object-storage/`) — só o que precisa ser consumido de fora deste
// diretório é reexportado aqui.
export { IntegrationEngineModule } from './integration-engine.module.js';
export { IntegrationEngineController } from './integration-engine.controller.js';
export { CoreIngestPlaceholderController } from './core-ingest-placeholder.controller.js';
export { IntegrationEngineAclService } from './integration-engine-acl.service.js';
export {
  parseEngineNormalizedMessage,
  type EngineNormalizedMessage,
} from './engine-normalized-message.js';
export {
  toCanonicalExamResultMessage,
  type CanonicalExamResultMessage,
} from './canonical-exam-result-message.js';
export { loadIntegrationEngineConfig, type IntegrationEngineConfig } from './integration-engine-config.js';
