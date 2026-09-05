/**
 * BE-09 (`TASK.md`) — configuração da credencial de serviço (API key
 * dedicada) exigida por `GUARDRAILS.md` item 13 para o tráfego
 * Integration Gateway/Imaging Gateway → Core: "credencial de serviço
 * dedicada [...] — nunca credencial de usuário final". `loadServiceApiKeyConfig`
 * recebe o objeto de env explicitamente (default `process.env`), mesmo
 * padrão de `loadRedisConfig`/`loadObjectStorageConfig`/
 * `loadIntegrationEngineConfig` — testável sem mutar o ambiente do
 * processo, nenhum valor de produção hardcoded (`TASK.md` §1.1).
 *
 * O default abaixo é **explicitamente de desenvolvimento/CI local** — mesmo
 * padrão já aceito de `APP_DB_ROLE_PASSWORD` (BE-03): em produção o valor
 * real vem do secret manager (`SDD.md` §7.5), nunca deste default.
 *
 * **Nome da variável de ambiente (nota de correção pós-implementação,
 * fix-loop)**: lê `INTERNAL_SERVICE_API_KEY`, não `SERVICE_API_KEY`. A
 * revisão pós-implementação de BE-09 encontrou que
 * `infra/modules/secrets/main.tf`/`infra/environments/{staging,production}/main.tf`
 * já provisionavam e injetavam este exato secret nos 3 serviços ECS
 * (core, integration-gateway, imaging-gateway) desde a fundação de
 * infraestrutura (comentário original: "API key de serviço dedicada
 * (BE-09)") — sob o nome `INTERNAL_SERVICE_API_KEY`, não `SERVICE_API_KEY`.
 * A implementação original desta tarefa não conferiu o Terraform existente
 * e introduziu um nome de variável divergente, o que faria o app cair
 * silenciosamente no default de desenvolvimento em produção (Terraform
 * nunca injetaria `SERVICE_API_KEY`). Corrigido para casar com o nome já
 * provisionado — ver `backend/docs/service-api-key-auth.md`.
 */
export interface ServiceApiKeyConfig {
  /**
   * Credencial de serviço compartilhada entre o Core (valida, via
   * `ServiceApiKeyGuard`) e cada emissor do tráfego serviço-a-serviço:
   * `IntegrationEngineAclService`/`ImagingGatewayAclService` (hop 2, dentro
   * do próprio processo do Core), o `HTTP Sender` do canal da Integration
   * Engine (hop 1, `backend/integration-engine/deploy-channel.mjs`) e o
   * script Lua do Orthanc (hop 1, `backend/imaging-gateway/on-stable-study.lua`).
   * Mesmo valor configurado nos quatro lugares em cada ambiente — não é uma
   * credencial por-serviço distinta (`TASK.md` §1.7 já registra essa decisão
   * de detalhe como "API key dedicada por serviço" no sentido de "dedicada
   * a este tráfego", não uma chave diferente por gateway; ADR/GUARDRAILS não
   * exigem mais granularidade que isso para o piloto).
   */
  serviceApiKey: string;
}

const DEFAULTS = {
  serviceApiKey: 'portalmed_service_api_key_dev_only_change_me',
} as const;

export function loadServiceApiKeyConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): ServiceApiKeyConfig {
  return {
    serviceApiKey: env.INTERNAL_SERVICE_API_KEY || DEFAULTS.serviceApiKey,
  };
}
