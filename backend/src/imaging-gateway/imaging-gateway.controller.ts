import { BadRequestException, Controller, HttpCode, Logger, Post, Req, UseGuards } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { QueueRegistryService } from '../queue/index.js';
import { ServiceApiKeyGuard } from '../security/index.js';
import { IMAGING_CONVERSION_QUEUE_NAME } from './imaging-gateway.tokens.js';
import { parseOrthancStableInstanceNotification } from './orthanc-stable-instance-notification.js';

/**
 * BE-07 (`TASK.md`) — endpoint interno que o script Lua do Orthanc
 * (`OnStableStudy`, ver `backend/imaging-gateway/on-stable-study.lua`)
 * chama via `HttpPost` depois que um estudo DICOM fica estável (pipeline
 * assíncrono nativo do Orthanc — `StableAge`, sem bloquear a associação
 * DICOM do C-STORE original). Este controller é a fronteira exata da
 * Anti-Corruption Layer, mesmo papel de `IntegrationEngineController`
 * (BE-06): recebe o envelope do gateway, valida a forma
 * (`parseOrthancStableInstanceNotification`) e enfileira o job de
 * conversão (`ImagingConversionProcessor` processa de forma assíncrona,
 * isolada por instância — RF-07). Responde 202 imediatamente, sem esperar
 * a conversão/upload/notificação ao core terminarem.
 *
 * **Corpo lido via `req.rawBody` (não `@Body()`)**: o `HttpPost` nativo do
 * Orthanc envia `Content-Type: application/x-www-form-urlencoded` mesmo
 * quando o corpo é texto JSON (comportamento confirmado empiricamente
 * contra a imagem oficial `orthancteam/orthanc` durante esta
 * implementação — não é uma opção configurável do produto) — o
 * body-parser padrão do Nest/Express interpretaria esse corpo como
 * formulário, não como JSON. `NestFactory.create(AppModule, { rawBody:
 * true })` (`main.ts`) preserva o buffer bruto antes de qualquer parsing
 * por content-type; este controller faz o próprio `JSON.parse` sobre esse
 * buffer, decisão de detalhe documentada aqui e em
 * `backend/docs/imaging-gateway.md`.
 *
 * **Segurança (BE-09, `TASK.md`)**: mesma nota de `IntegrationEngineController`
 * (BE-06) — `GUARDRAILS.md` item 13 exige credencial de serviço dedicada;
 * `@UseGuards(ServiceApiKeyGuard)` (`src/security/`) exige o header
 * `X-Service-Api-Key` em toda requisição — o script Lua do Orthanc
 * (`on-stable-study.lua`) envia esse header desde esta tarefa. Guard aplicado
 * depois do parsing do corpo bruto (`rawBody`), sem interferir na leitura de
 * `req.rawBody` acima. Ver `backend/docs/service-api-key-auth.md`.
 */
@UseGuards(ServiceApiKeyGuard)
@Controller('internal/imaging-gateway')
export class ImagingGatewayController {
  private readonly logger = new Logger(ImagingGatewayController.name);

  constructor(private readonly queues: QueueRegistryService) {}

  @Post('notifications')
  @HttpCode(202)
  async receiveStableInstanceNotification(
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ accepted: true }> {
    const raw = req.rawBody;
    if (!raw || raw.length === 0) {
      throw new BadRequestException(
        'Corpo da requisição vazio — esperada a notificação de instância estável do Orthanc.',
      );
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(raw.toString('utf8'));
    } catch {
      throw new BadRequestException('Corpo da requisição não é um JSON válido.');
    }

    const notification = parseOrthancStableInstanceNotification(parsedBody);
    this.logger.log(
      `Notificação de instância estável recebida do Orthanc (sopInstanceUid=${notification.sopInstanceUid}, remoteAet=${notification.remoteAet}) — enfileirando conversão.`,
    );

    const queue = this.queues.getQueue(IMAGING_CONVERSION_QUEUE_NAME);
    await queue.add('convert-instance', notification);

    return { accepted: true };
  }
}
