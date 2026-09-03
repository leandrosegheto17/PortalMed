/**
 * BE-06 (`TASK.md`) — configuração da Anti-Corruption Layer (ACL) do core
 * para a Integration Engine (NextGen Connect, ADR-002). Nenhum endpoint de
 * ambiente específico fica hardcoded no código (`TASK.md` §1.1) —
 * `loadIntegrationEngineConfig` recebe o objeto de env explicitamente
 * (default `process.env`), mesmo padrão de `loadRedisConfig`/
 * `loadObjectStorageConfig`, para ser testável sem mutar o ambiente do
 * processo.
 */
export interface IntegrationEngineConfig {
  /**
   * URL do endpoint interno do core que recebe a mensagem já convertida
   * para JSON canônico pela ACL (`POST /internal/ingest`). Nesta tarefa
   * (BE-06) esse endpoint é um placeholder simples (ver
   * `core-ingest-placeholder.controller.ts`) — a lógica real de negócio de
   * ingestão (associação por CPF, resiliência) é BE-24, tarefa futura, que
   * substitui o placeholder sem precisar mudar este cliente.
   */
  coreIngestUrl: string;
}

const DEFAULTS = {
  coreIngestUrl: 'http://localhost:3000/internal/ingest',
} as const;

export function loadIntegrationEngineConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): IntegrationEngineConfig {
  return {
    coreIngestUrl: env.CORE_INGEST_INTERNAL_URL || DEFAULTS.coreIngestUrl,
  };
}
