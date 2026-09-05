import { Inject, Injectable, Logger } from '@nestjs/common';
import { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER, type ServiceApiKeyConfig } from '../security/index.js';
import { IMAGING_GATEWAY_CONFIG } from './imaging-gateway.tokens.js';
import type { ImagingGatewayConfig } from './imaging-gateway-config.js';
import type { CanonicalImagingNotificationMessage } from './canonical-imaging-notification-message.js';

export interface ConvertedPreviewImage {
  buffer: Buffer;
  contentType: string;
}

/**
 * BE-07 (`TASK.md`) — dois hops HTTP reais entre o Imaging Gateway
 * (Orthanc) e o core, mesmo padrão já estabelecido por
 * `IntegrationEngineAclService` (BE-06): mantém a fronteira entre a ACL
 * (este módulo) e o módulo de domínio que vai possuir a lógica real de
 * ingestão de imagem (BE-38) explícita e testável isoladamente, e
 * espelha a topologia real (`SDD.md` §2.2) sem exigir mudança de contrato
 * quando BE-38 substituir o placeholder por lógica de negócio de verdade.
 *
 * Usa o `fetch` global do Node (ADR-005) — nenhuma biblioteca HTTP
 * cliente adicional necessária.
 */
@Injectable()
export class ImagingGatewayAclService {
  private readonly logger = new Logger(ImagingGatewayAclService.name);

  constructor(
    @Inject(IMAGING_GATEWAY_CONFIG) private readonly config: ImagingGatewayConfig,
    @Inject(SERVICE_API_KEY_CONFIG) private readonly serviceApiKeyConfig: ServiceApiKeyConfig,
  ) {}

  /**
   * Busca a prévia JPEG/PNG já convertida pelo Orthanc
   * (`GET /instances/{id}/preview`, decodificação nativa do produto —
   * plugin GDCM quando a transfer syntax exige, nenhum parser/renderizador
   * DICOM construído pelo core, ADR-003). O core nunca lida com o arquivo
   * DICOM bruto — só com esta imagem já convertida.
   */
  async fetchConvertedPreview(orthancInstanceId: string): Promise<ConvertedPreviewImage> {
    const url = `${this.config.orthancBaseUrl}/instances/${orthancInstanceId}/preview`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Falha ao buscar a prévia convertida do Orthanc (${url}): HTTP ${response.status}.`,
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') || 'image/png',
    };
  }

  /**
   * Publica a notificação já traduzida para JSON canônico no endpoint
   * interno do core (`POST /internal/imaging-ingest`).
   *
   * **Segurança (BE-09, `TASK.md`)**: este endpoint exige
   * `@UseGuards(ServiceApiKeyGuard)` — anexa o header `X-Service-Api-Key`
   * (`SERVICE_API_KEY_CONFIG`, mesma credencial validada pelo guard), mesmo
   * raciocínio de `IntegrationEngineAclService.publishToCore` (BE-06/BE-09).
   */
  async publishToCore(message: CanonicalImagingNotificationMessage): Promise<void> {
    const response = await fetch(this.config.coreImagingIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [SERVICE_API_KEY_HEADER]: this.serviceApiKeyConfig.serviceApiKey,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => '');
      this.logger.error(
        `Falha ao publicar notificação canônica em ${this.config.coreImagingIngestUrl}: HTTP ${response.status} ${responseBody}`,
      );
      throw new Error(
        `Falha ao publicar notificação canônica para o endpoint interno do core (${this.config.coreImagingIngestUrl}): HTTP ${response.status}.`,
      );
    }
  }
}
