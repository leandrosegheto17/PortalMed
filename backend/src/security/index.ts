// Interface pública de `src/security/` (BE-09, `TASK.md`) — infraestrutura
// transversal de autenticação serviço-a-serviço (`GUARDRAILS.md` item 13).
// Mesma disciplina de barrel único dos demais diretórios de infraestrutura
// (`src/redis/`, `src/queue/`, `src/object-storage/`) — só o que precisa ser
// consumido de fora deste diretório é reexportado aqui.
export { SecurityModule } from './security.module.js';
export { ServiceApiKeyGuard, isServiceApiKeyValid } from './service-api-key.guard.js';
export { loadServiceApiKeyConfig, type ServiceApiKeyConfig } from './service-api-key-config.js';
export { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER } from './service-api-key.tokens.js';
