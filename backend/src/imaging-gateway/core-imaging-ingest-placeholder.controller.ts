import { Body, Controller, HttpCode, Logger, Post, UseGuards } from '@nestjs/common';
import type { CanonicalImagingNotificationMessage } from './canonical-imaging-notification-message.js';
import { ServiceApiKeyGuard } from '../security/index.js';

/**
 * BE-07 (`TASK.md`) — placeholder **deliberadamente simples** para o
 * endpoint interno do core (`POST /internal/imaging-ingest`, `SDD.md`
 * §2.2) que recebe o JSON canônico já produzido pela ACL
 * (`ImagingConversionProcessor`/`ImagingGatewayAclService`). A lógica real
 * de negócio (resolver `tenant_id` casando `remoteAet` contra
 * `INTEGRATION_ENDPOINT_CONFIG.dicom_remote_ae_title`, ADR-012, e
 * persistir os UIDs DICOM + a chave do Object Storage em `EXAM_FILE`) é
 * **BE-38**, tarefa futura distinta — este controller só prova que a ACL
 * consegue publicar de ponta a ponta para um endpoint interno real, sem
 * antecipar nenhuma decisão de modelagem de domínio que BE-38 ainda vai
 * tomar. Mesmo padrão exato de `CoreIngestPlaceholderController` (BE-06).
 *
 * `lastReceivedMessage` existe só para observabilidade/teste desta tarefa
 * — não é persistência real; BE-38 substitui este controller inteiro.
 *
 * **Correção pós-implementação (Bloqueio 005, DevSecOps — Lote 2,
 * `SECURITY-REVIEW.md` "Lote 2" Seção 4)**: `SEC-BUG-002` foi levantado
 * originalmente contra `CoreIngestPlaceholderController` (BE-06); o
 * DevSecOps confirmou que `CanonicalImagingNotificationMessage` **não**
 * carrega nome/identificador de paciente (só `remoteAet` + UIDs DICOM +
 * referência ao Object Storage), então este controller não gerou achado de
 * compliance — só um ponto de atenção de estilo (mesmo `JSON.stringify(body)`
 * irrestrito). Corrigido aqui pela mesma causa raiz/mesmo padrão de
 * placeholder que BE-06: o log agora cita só campos técnicos pontuais
 * (`schemaVersion`, `remoteAet`, `sopInstanceUid`, `contentType`,
 * `convertedAt`), nunca o `JSON.stringify` do payload inteiro — evita que o
 * mesmo anti-padrão sirva de modelo para BE-38 (que vai introduzir
 * resolução de `tenant_id`, ADR-012, sobre este mesmo fluxo).
 * `lastReceivedMessage` (estado interno, nunca escrito em log/stdout)
 * continua guardando a mensagem completa para a suíte de teste
 * (`getLastReceivedMessage()`).
 *
 * **Segurança (BE-09, `TASK.md`)**: mesmo raciocínio de
 * `CoreIngestPlaceholderController` (BE-06/BE-09) — `@UseGuards(ServiceApiKeyGuard)`,
 * mesma credencial de `ImagingGatewayController`. Decisão documentada em
 * `backend/docs/service-api-key-auth.md`.
 */
@UseGuards(ServiceApiKeyGuard)
@Controller('internal/imaging-ingest')
export class CoreImagingIngestPlaceholderController {
  private readonly logger = new Logger(CoreImagingIngestPlaceholderController.name);
  private lastReceivedMessage: CanonicalImagingNotificationMessage | undefined;

  @Post()
  @HttpCode(202)
  receive(@Body() body: CanonicalImagingNotificationMessage): { accepted: true; placeholder: true } {
    this.lastReceivedMessage = body;
    this.logger.log(
      `[BE-07 placeholder — resolução de tenant/persistência é BE-38] Notificação canônica recebida em /internal/imaging-ingest ` +
        `(schemaVersion=${body?.schemaVersion}, remoteAet=${body?.remoteAet}, sopInstanceUid=${body?.dicom?.sopInstanceUid}, contentType=${body?.convertedFile?.contentType}, convertedAt=${body?.convertedAt}).`,
    );
    return { accepted: true, placeholder: true };
  }

  getLastReceivedMessage(): CanonicalImagingNotificationMessage | undefined {
    return this.lastReceivedMessage;
  }
}
