import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import type { CanonicalExamResultMessage } from './canonical-exam-result-message.js';
import { ServiceApiKeyGuard } from '../security/index.js';

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
 *
 * **Correção pós-implementação (`SEC-BUG-002`, Bloqueio 005, DevSecOps —
 * Lote 2)**: o `Logger.log` deste endpoint **nunca** serializa o `body`
 * inteiro. `CanonicalExamResultMessage` carrega `patient.identifier`/
 * `patient.name` (identificação direta do titular) e
 * `exam`/`result` (dado de saúde, LGPD Art. 11) — logar esse conteúdo em
 * texto plano, em nível `log`, a cada request real, viola o princípio de
 * minimização de dado (LGPD Art. 6º, III). O log cita só metadado técnico
 * não identificável (`schemaVersion`, `sourceSystem`, `messageType`,
 * `messageControlId`), mesmo nível de detalhe já usado por
 * `IntegrationEngineController` para o mesmo fluxo — suficiente para
 * observabilidade/correlação operacional sem expor nome/identificador de
 * paciente nem resultado clínico. `lastReceivedMessage` (estado interno,
 * nunca escrito em log/stdout) continua guardando a mensagem completa,
 * porque é consumido apenas em memória pela suíte de teste
 * (`getLastReceivedMessage()`), não é observabilidade externa.
 *
 * **Segurança (BE-09, `TASK.md`)**: este endpoint também exige
 * `@UseGuards(ServiceApiKeyGuard)`, mesma credencial de
 * `IntegrationEngineController`. Decisão de detalhe documentada em
 * `backend/docs/service-api-key-auth.md`: embora hoje só
 * `IntegrationEngineAclService` (mesmo processo) chame este endpoint, ele é
 * servido pelo mesmo app/ALB que atende a SPA pública (nenhuma segregação
 * de rede própria) — sem o guard aqui, qualquer origem que alcance a rota
 * publicamente contornaria a ACL/normalização por completo, exatamente o
 * risco que `GUARDRAILS.md` item 13 pede para fechar.
 */
@UseGuards(ServiceApiKeyGuard)
@Controller('internal/ingest')
export class CoreIngestPlaceholderController {
  private readonly logger = new Logger(CoreIngestPlaceholderController.name);
  private lastReceivedMessage: CanonicalExamResultMessage | undefined;

  @Post()
  @HttpCode(202)
  receive(@Body() body: CanonicalExamResultMessage): { accepted: true; placeholder: true } {
    this.lastReceivedMessage = body;
    this.logger.log(
      `[BE-06 placeholder — lógica real de negócio é BE-24] Mensagem canônica recebida em /internal/ingest ` +
        `(schemaVersion=${body?.schemaVersion}, sourceSystem=${body?.sourceSystem}, messageType=${body?.messageType}, messageControlId=${body?.messageControlId}).`,
    );
    return { accepted: true, placeholder: true };
  }

  getLastReceivedMessage(): CanonicalExamResultMessage | undefined {
    return this.lastReceivedMessage;
  }
}
