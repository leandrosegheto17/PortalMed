import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import { parseEngineNormalizedMessage } from './engine-normalized-message.js';
import { toCanonicalExamResultMessage } from './canonical-exam-result-message.js';
import { IntegrationEngineAclService } from './integration-engine-acl.service.js';
import { ServiceApiKeyGuard } from '../security/index.js';

/**
 * BE-06 (`TASK.md`) — endpoint interno que a Integration Engine (NextGen
 * Connect, ADR-002) chama via HTTP Sender depois de normalizar
 * estruturalmente a mensagem HL7 v2.x/FHIR R4 (ver
 * `backend/integration-engine/channels/hl7v2-oru-canonical-test-channel.xml`).
 * Este controller é a fronteira exata da Anti-Corruption Layer: recebe o
 * envelope normalizado pela engine, valida a forma (`parseEngineNormalizedMessage`),
 * traduz para o JSON canônico de domínio (`toCanonicalExamResultMessage`) e
 * publica para o endpoint interno do core (`IntegrationEngineAclService`).
 * Nenhuma lógica de negócio de ingestão (associação por CPF, resiliência a
 * indisponibilidade, fila de exceção — BE-24) acontece aqui.
 *
 * **Segurança (BE-09, `TASK.md`)**: `GUARDRAILS.md` item 13 exige que a
 * comunicação Integration Gateway → Core seja "autenticada por credencial
 * de serviço dedicada". `@UseGuards(ServiceApiKeyGuard)` (`src/security/`)
 * exige o header `X-Service-Api-Key` com a credencial configurada (env
 * `INTERNAL_SERVICE_API_KEY`) em toda requisição a este endpoint — o `HTTP Sender`
 * do canal da engine (`hl7v2-oru-canonical-test-channel.xml`) envia esse
 * header desde esta tarefa. Ver `backend/docs/service-api-key-auth.md` para
 * a decisão completa (por que este endpoint E o placeholder do core que ele
 * chama, `CoreIngestPlaceholderController`, recebem o mesmo guard).
 */
@UseGuards(ServiceApiKeyGuard)
@Controller('internal/integration-engine')
export class IntegrationEngineController {
  private readonly logger = new Logger(IntegrationEngineController.name);

  constructor(private readonly acl: IntegrationEngineAclService) {}

  @Post('messages')
  @HttpCode(202)
  async receiveEngineNormalizedMessage(@Body() body: unknown): Promise<{ accepted: true }> {
    const engineMessage = parseEngineNormalizedMessage(body);
    const canonical = toCanonicalExamResultMessage(engineMessage);
    this.logger.log(
      `Mensagem normalizada recebida da Integration Engine (messageControlId=${engineMessage.messageControlId}) — publicando JSON canônico para o core.`,
    );
    await this.acl.publishToCore(canonical);
    return { accepted: true };
  }
}
