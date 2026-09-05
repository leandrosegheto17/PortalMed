import { Inject, Injectable, Logger } from '@nestjs/common';
import { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER, type ServiceApiKeyConfig } from '../security/index.js';
import { INTEGRATION_ENGINE_CONFIG } from './integration-engine.tokens.js';
import type { IntegrationEngineConfig } from './integration-engine-config.js';
import type { CanonicalExamResultMessage } from './canonical-exam-result-message.js';

/**
 * BE-06 (`TASK.md`) — publica a mensagem já traduzida para JSON canônico no
 * endpoint interno do core (`POST /internal/ingest`). Implementado como uma
 * chamada HTTP real (não uma chamada de método em processo) mesmo os dois
 * lados vivendo hoje no mesmo monolito NestJS: mantém a fronteira entre a
 * ACL (este módulo, `src/integration-engine/`) e o módulo de domínio que
 * vai possuir a lógica real de ingestão (BE-24, provavelmente Fila de
 * Exceção — RF-14, `SDD.md` §2.1) explícita e testável isoladamente, e
 * espelha a topologia real (`SDD.md` §2.2: "IE->>CORE: POST
 * /internal/ingest") sem nenhuma mudança de contrato quando BE-24
 * substituir o placeholder por lógica de negócio de verdade.
 *
 * Usa o `fetch` global do Node (ADR-005, Node.js LTS) — nenhuma biblioteca
 * HTTP cliente adicional necessária para uma única chamada POST.
 *
 * **Segurança (BE-09, `TASK.md`)**: `POST /internal/ingest` exige
 * `@UseGuards(ServiceApiKeyGuard)` — este serviço anexa o header
 * `X-Service-Api-Key` (`SERVICE_API_KEY_CONFIG`, mesma credencial validada
 * pelo guard) em toda chamada, mesmo os dois lados vivendo no mesmo
 * processo hoje (`backend/docs/service-api-key-auth.md`).
 */
@Injectable()
export class IntegrationEngineAclService {
  private readonly logger = new Logger(IntegrationEngineAclService.name);

  constructor(
    @Inject(INTEGRATION_ENGINE_CONFIG) private readonly config: IntegrationEngineConfig,
    @Inject(SERVICE_API_KEY_CONFIG) private readonly serviceApiKeyConfig: ServiceApiKeyConfig,
  ) {}

  async publishToCore(message: CanonicalExamResultMessage): Promise<void> {
    const response = await fetch(this.config.coreIngestUrl, {
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
        `Falha ao publicar mensagem canônica em ${this.config.coreIngestUrl}: HTTP ${response.status} ${responseBody}`,
      );
      throw new Error(
        `Falha ao publicar mensagem canônica para o endpoint interno do core (${this.config.coreIngestUrl}): HTTP ${response.status}.`,
      );
    }
  }
}
