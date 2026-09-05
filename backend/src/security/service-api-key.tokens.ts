/**
 * Símbolo de injeção de dependência para `ServiceApiKeyConfig` — arquivo
 * dedicado (em vez de declarado dentro do módulo/serviço) só para evitar
 * import circular entre `security.module.ts` e `service-api-key.guard.ts`,
 * mesmo padrão mínimo já usado por `INTEGRATION_ENGINE_CONFIG`
 * (`src/integration-engine/integration-engine.tokens.ts`, BE-06) e por
 * `IMAGING_GATEWAY_CONFIG` (`src/imaging-gateway/imaging-gateway.tokens.ts`,
 * BE-07).
 */
export const SERVICE_API_KEY_CONFIG = Symbol('SERVICE_API_KEY_CONFIG');

/**
 * Nome do header HTTP usado pelo tráfego serviço-a-serviço (Integration
 * Gateway/Imaging Gateway → Core, `GUARDRAILS.md` item 13/`TASK.md` §1.7)
 * para carregar a API key de serviço. Constante única compartilhada entre o
 * guard (`ServiceApiKeyGuard`, que lê o header) e todo emissor (`IntegrationEngineAclService`,
 * `ImagingGatewayAclService`, o canal da Integration Engine, o script Lua do
 * Orthanc) — evita o nome do header divergir entre quem valida e quem envia.
 * Nomes de header HTTP são case-insensitive (RFC 7230 §3.2) e o Express
 * normaliza `req.headers` para minúsculas — por isso o valor aqui já está
 * em minúsculas, forma canônica de leitura no guard.
 */
export const SERVICE_API_KEY_HEADER = 'x-service-api-key';
