/**
 * BE-07 (`TASK.md`) — configuração da Anti-Corruption Layer (ACL) do core
 * para o Imaging Gateway (Orthanc, self-hosted, ADR-003/ADR-012). Mesmo
 * padrão de `loadIntegrationEngineConfig`/`loadObjectStorageConfig`
 * (BE-06/BE-08): recebe o objeto de env explicitamente (default
 * `process.env`), nunca lê `process.env` direto — testável sem mutar o
 * ambiente do processo, nenhum valor hardcoded (`TASK.md` §1.1).
 */
export interface ImagingGatewayConfig {
  /**
   * Base URL da API REST do Orthanc (porta 8042, `SDD.md` §7.5 — rede
   * privada, acesso mediado pela aplicação core, nunca exposta
   * publicamente). Usada pela ACL para buscar a prévia já convertida
   * (`GET /instances/{id}/preview`, nativo do Orthanc/plugin GDCM — nenhum
   * parser/renderizador DICOM próprio, ADR-003).
   *
   * `IMAGING_GATEWAY_HOST`/`IMAGING_GATEWAY_PORT` (em vez de uma única URL)
   * porque `infra/environments/{staging,production}/main.tf` já define
   * `IMAGING_GATEWAY_HOST` como nome de service discovery interno (DNS
   * privado, sem porta/protocolo) — a aplicação core monta a URL completa
   * a partir daí, a porta 8042 é a mesma já reservada em cada ambiente
   * (`infra/environments/staging/main.tf`,
   * `infra/environments/production/main.tf`, `container_port` do serviço
   * `imaging_gateway_service`).
   */
  orthancBaseUrl: string;
  /**
   * URL do endpoint interno do core que recebe a notificação já traduzida
   * para JSON canônico pela ACL (`POST /internal/imaging-ingest`). Nesta
   * tarefa (BE-07) esse endpoint é um placeholder simples (ver
   * `core-imaging-ingest-placeholder.controller.ts`) — a lógica real de
   * negócio (resolução de `tenant_id` via `RemoteAET`, persistência dos
   * UIDs DICOM em `EXAM_FILE`) é BE-38, tarefa futura, que substitui o
   * placeholder sem precisar mudar este contrato.
   */
  coreImagingIngestUrl: string;
}

const DEFAULTS = {
  orthancHost: 'localhost',
  orthancPort: 8042,
  coreImagingIngestUrl: 'http://localhost:3000/internal/imaging-ingest',
} as const;

export function loadImagingGatewayConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): ImagingGatewayConfig {
  const host = env.IMAGING_GATEWAY_HOST || DEFAULTS.orthancHost;
  const port = env.IMAGING_GATEWAY_PORT || String(DEFAULTS.orthancPort);
  return {
    orthancBaseUrl: env.IMAGING_GATEWAY_ORTHANC_BASE_URL || `http://${host}:${port}`,
    coreImagingIngestUrl: env.CORE_IMAGING_INGEST_INTERNAL_URL || DEFAULTS.coreImagingIngestUrl,
  };
}
