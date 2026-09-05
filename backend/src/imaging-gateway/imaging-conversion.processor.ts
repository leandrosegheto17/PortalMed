import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { Worker, type Job } from 'bullmq';
import { buildBullMqConnectionOptionsFromConfig } from '../queue/index.js';
import { loadRedisConfig } from '../redis/redis-config.js';
import { ObjectStorageService } from '../object-storage/index.js';
import { IMAGING_CONVERSION_QUEUE_NAME } from './imaging-gateway.tokens.js';
import { ImagingGatewayAclService } from './imaging-gateway-acl.service.js';
import { parseOrthancStableInstanceNotificationFromJobData } from './orthanc-stable-instance-notification.js';
import {
  buildCanonicalImagingNotificationMessage,
  buildConvertedImageObjectStorageKey,
} from './canonical-imaging-notification-message.js';

/**
 * BE-07 (`TASK.md`) — consumidor (`Worker` BullMQ) da fila
 * `imaging-conversion`, exatamente o "job de conversão de imagem" que
 * `backend/docs/redis-and-queues.md` (BE-05) já citava como consumidor
 * futuro desta infraestrutura. `QueueRegistryService` (BE-05) só gerencia
 * `Queue` (produtor) — "cada módulo de domínio conhece o próprio
 * processor de negócio" (mesma nota de BE-05) — por isso este módulo
 * instancia e gerencia o próprio `Worker`, via os hooks de ciclo de vida
 * do NestJS (`OnModuleInit`/`OnModuleDestroy`), mesmo padrão de
 * `ObjectStorageModule`/`QueueRegistryService` fechando recursos em
 * `onModuleDestroy`.
 *
 * Processamento assíncrono e isolado por instância DICOM (RF-07: falha de
 * conversão de um exame não pode bloquear o restante da lista do
 * paciente) — o BullMQ isola falha por job e permite retry individual,
 * sem afetar outras notificações já enfileiradas.
 *
 * Passo a passo de cada job: (1) busca a prévia JPEG/PNG já convertida
 * pelo Orthanc (`ImagingGatewayAclService.fetchConvertedPreview`, nenhum
 * parser DICOM próprio, ADR-003); (2) grava no Object Storage via
 * `ObjectStorageService.putObject` (BE-08, interface já existente,
 * consumida sem mudança de assinatura); (3) publica a notificação
 * canônica (RemoteAET + UIDs DICOM + referência ao arquivo) para o
 * endpoint interno do core (hop 2, `ImagingGatewayAclService.publishToCore`).
 */
@Injectable()
export class ImagingConversionProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImagingConversionProcessor.name);
  private worker: Worker | undefined;

  constructor(
    private readonly acl: ImagingGatewayAclService,
    private readonly objectStorage: ObjectStorageService,
  ) {}

  onModuleInit(): void {
    // Uma única leitura/validação de `RedisConfig` para as duas necessidades
    // desta operação (opções de conexão do BullMQ + `bullmqPrefix`) — mesma
    // correção de duplicação já aplicada a `QueueRegistryService.getQueue`
    // (nota de fix-loop de BE-05): `loadRedisConfig()` reparseando/
    // revalidando as env vars duas vezes para uma única operação lógica é
    // evitável chamando-a uma vez só e derivando as opções de conexão a
    // partir do resultado (`buildBullMqConnectionOptionsFromConfig`).
    const redisConfig = loadRedisConfig();
    this.worker = new Worker(
      IMAGING_CONVERSION_QUEUE_NAME,
      (job: Job) => this.process(job),
      { connection: buildBullMqConnectionOptionsFromConfig(redisConfig), prefix: redisConfig.bullmqPrefix },
    );
  }

  async onModuleDestroy(): Promise<void> {
    // `force: true` — fecha imediatamente mesmo que a conexão Redis esteja
    // presa tentando reconectar (ex.: Redis indisponível durante o
    // shutdown da aplicação); sem isso, `Worker.close()` pode aguardar
    // indefinidamente a conexão terminar, travando o encerramento do
    // processo core inteiro (achado desta implementação, coberto por
    // `imaging-conversion.processor.spec.ts`).
    await this.worker?.close(true);
  }

  async process(job: Job): Promise<void> {
    const notification = parseOrthancStableInstanceNotificationFromJobData(job.data);

    const preview = await this.acl.fetchConvertedPreview(notification.orthancInstanceId);
    const objectStorageKey = buildConvertedImageObjectStorageKey(notification.sopInstanceUid);
    await this.objectStorage.putObject(objectStorageKey, preview.buffer, preview.contentType);

    const canonical = buildCanonicalImagingNotificationMessage({
      notification,
      objectStorageKey,
      contentType: preview.contentType,
      convertedAt: new Date().toISOString(),
    });
    await this.acl.publishToCore(canonical);

    this.logger.log(
      `Instância DICOM convertida e publicada (sopInstanceUid=${notification.sopInstanceUid}, objectStorageKey=${objectStorageKey}).`,
    );
  }

  /** Só para teste — o worker real (`onModuleInit`) não expõe a instância. */
  getWorker(): Worker | undefined {
    return this.worker;
  }
}
