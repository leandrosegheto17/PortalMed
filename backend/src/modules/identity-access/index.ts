// Interface pública do módulo Identity & Access — único ponto de entrada
// permitido para outros módulos (GUARDRAILS.md item 34 / ADR-001). Nenhum
// outro arquivo deste módulo deve ser importado diretamente de fora dele.
export { IdentityAccessModule } from './identity-access.module.js';
