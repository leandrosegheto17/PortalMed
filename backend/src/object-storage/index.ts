// Interface pública de `src/object-storage` (BE-08, `TASK.md`) —
// infraestrutura transversal (não é bounded context), mesmo espírito de
// `src/database/index.ts`/`src/redis/index.ts`: único ponto de entrada
// permitido para o restante da aplicação.
//
// Deliberadamente NÃO reexporta `OBJECT_STORAGE_CLIENT`/`OBJECT_STORAGE_CONFIG`/
// `createS3Client` (só usados internamente por `ObjectStorageModule`) — mesma
// disciplina aplicada a `REDIS_CONNECTION` (`src/redis/index.ts`, BE-05) e a
// `KYSELY_CONNECTION` (`src/database/index.ts`, correção de `QA-BUG-002`,
// BE-03). Ver nota completa em `s3-client.ts`.
export { ObjectStorageModule } from './object-storage.module.js';
export { ObjectStorageService } from './object-storage.service.js';
export {
  loadObjectStorageConfig,
  MAX_SIGNED_URL_TTL_SECONDS,
  KNOWN_BRAZIL_REGIONS,
  type ObjectStorageConfig,
} from './object-storage-config.js';
