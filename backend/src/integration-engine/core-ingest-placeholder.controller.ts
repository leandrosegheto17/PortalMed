import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import type { CanonicalExamResultMessage } from './canonical-exam-result-message.js';

/**
 * BE-06 (`TASK.md`) — placeholder **deliberadamente simples** para o
 * endpoint interno do core (`POST /internal/ingest`, `SDD.md` §2.2) que
 * recebe o JSON canônico já produzido pela ACL
 * (`IntegrationEngineController`/`IntegrationEngineAclService`). A lógica
 * real de negócio (associar o resultado ao paciente por CPF, manter exames
 * já sincronizados disponíveis se a fonte cair, rotear para a fila de
 * exceção quando o paciente não é localizado) é **BE-24**, tarefa futura
 * distinta — este controller só prova que a ACL consegue publicar de ponta
 * a ponta para um endpoint interno real, sem antecipar nenhuma decisão de
 * modelagem de domínio que BE-24 ainda vai tomar.
 *
 * `lastReceivedMessage` existe só para observabilidade/teste desta tarefa
 * (a suíte e2e usa para confirmar o payload recebido) — não é persistência
 * real; BE-24 substitui este controller inteiro, incluindo este campo, por
 * um módulo de domínio de verdade (provavelmente Fila de Exceção, RF-14,
 * `SDD.md` §2.1).
 */
@Controller('internal/ingest')
export class CoreIngestPlaceholderController {
  private readonly logger = new Logger(CoreIngestPlaceholderController.name);
  private lastReceivedMessage: CanonicalExamResultMessage | undefined;

  @Post()
  @HttpCode(202)
  receive(@Body() body: CanonicalExamResultMessage): { accepted: true; placeholder: true } {
    this.lastReceivedMessage = body;
    this.logger.log(
      `[BE-06 placeholder — lógica real de negócio é BE-24] Mensagem canônica recebida em /internal/ingest: ${JSON.stringify(body)}`,
    );
    return { accepted: true, placeholder: true };
  }

  getLastReceivedMessage(): CanonicalExamResultMessage | undefined {
    return this.lastReceivedMessage;
  }
}
