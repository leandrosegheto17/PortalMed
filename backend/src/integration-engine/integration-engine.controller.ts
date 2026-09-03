import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import { parseEngineNormalizedMessage } from './engine-normalized-message.js';
import { toCanonicalExamResultMessage } from './canonical-exam-result-message.js';
import { IntegrationEngineAclService } from './integration-engine-acl.service.js';

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
 * **Segurança (nota para BE-09, tarefa futura, não implementada aqui)**:
 * `GUARDRAILS.md` item 13 exige que a comunicação Integration Gateway →
 * Core seja "autenticada por credencial de serviço dedicada". BE-09 (3 dp,
 * `TASK.md` §3.1) é a tarefa dedicada a essa credencial (API key de
 * serviço) — este endpoint é deixado pronto para receber um guard
 * (`@UseGuards(ServiceApiKeyGuard)`, a ser criado por BE-09) sem precisar
 * de nenhuma outra mudança estrutural. Até lá, o único mecanismo de
 * isolamento é de rede: a Integration Engine não é exposta publicamente
 * (`SDD.md` §7.5, `infra/modules/network/main.tf`) — mas o próprio
 * endpoint do core, por estar atrás do mesmo domínio/ALB que a SPA
 * (`infra/environments/{staging,production}/main.tf`, `CORE_INGEST_ENDPOINT`), tecnicamente
 * aceita requisição de qualquer origem até BE-09 fechar essa lacuna. Não é
 * uma omissão silenciosa: é o escopo exato que esta tarefa (BE-06) recebeu
 * do Tech Lead, com BE-09 já decomposta separadamente para fechá-la antes
 * de qualquer tráfego real de produção.
 */
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
