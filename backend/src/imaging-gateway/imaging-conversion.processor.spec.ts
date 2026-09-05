import { describe, expect, it, vi } from 'vitest';
import type { Job } from 'bullmq';
import { ImagingConversionProcessor } from './imaging-conversion.processor.js';
import type { ImagingGatewayAclService } from './imaging-gateway-acl.service.js';
import type { ObjectStorageService } from '../object-storage/index.js';
import type { OrthancStableInstanceNotification } from './orthanc-stable-instance-notification.js';

const NOTIFICATION: OrthancStableInstanceNotification = {
  remoteAet: 'HOSP_PACS_01',
  studyInstanceUid: '1.2.826.0.1.3680043.8.498.1',
  seriesInstanceUid: '1.2.826.0.1.3680043.8.498.2',
  sopInstanceUid: '1.2.826.0.1.3680043.8.498.3',
  orthancInstanceId: 'b866515e-fd9962f4-a43d054d-38596491-79e610ab',
};

function buildProcessor() {
  const acl: Pick<ImagingGatewayAclService, 'fetchConvertedPreview' | 'publishToCore'> = {
    fetchConvertedPreview: vi.fn().mockResolvedValue({
      buffer: Buffer.from('conteudo-png'),
      contentType: 'image/png',
    }),
    publishToCore: vi.fn().mockResolvedValue(undefined),
  };
  const objectStorage: Pick<ObjectStorageService, 'putObject'> = {
    putObject: vi.fn().mockResolvedValue(undefined),
  };
  const processor = new ImagingConversionProcessor(
    acl as ImagingGatewayAclService,
    objectStorage as ObjectStorageService,
  );
  return { processor, acl, objectStorage };
}

function buildJob(data: unknown): Job {
  return { data } as Job;
}

/**
 * BE-07 (`TASK.md`) — unitário: orquestração do job de conversão
 * (`process`), com `ImagingGatewayAclService`/`ObjectStorageService` como
 * dublês — nenhuma dependência de Redis/S3/Orthanc reais aqui (cobertos
 * pelas suítes e2e em `test/imaging-gateway/`). `onModuleInit` (ciclo de
 * vida real do `Worker` BullMQ) não é exercitado neste arquivo, de
 * propósito — coberto pela suíte e2e (prova de ponta a ponta com Redis
 * real); `onModuleDestroy` é coberto abaixo com um `Worker` dublê.
 */
describe('ImagingConversionProcessor.process (BE-07)', () => {
  it('busca a prévia convertida, grava no Object Storage e publica a notificação canônica para o core', async () => {
    const { processor, acl, objectStorage } = buildProcessor();

    await processor.process(buildJob(NOTIFICATION));

    expect(acl.fetchConvertedPreview).toHaveBeenCalledWith(NOTIFICATION.orthancInstanceId);
    expect(objectStorage.putObject).toHaveBeenCalledWith(
      'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
      Buffer.from('conteudo-png'),
      'image/png',
    );
    expect(acl.publishToCore).toHaveBeenCalledTimes(1);
    const [canonical] = (acl.publishToCore as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(canonical).toMatchObject({
      schemaVersion: '1.0',
      remoteAet: 'HOSP_PACS_01',
      dicom: {
        studyInstanceUid: NOTIFICATION.studyInstanceUid,
        seriesInstanceUid: NOTIFICATION.seriesInstanceUid,
        sopInstanceUid: NOTIFICATION.sopInstanceUid,
      },
      convertedFile: {
        objectStorageKey: 'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
        contentType: 'image/png',
      },
    });
    expect(typeof canonical.convertedAt).toBe('string');
  });

  it('rejeita job.data inválido antes de chamar qualquer dependência externa', async () => {
    const { processor, acl, objectStorage } = buildProcessor();

    await expect(processor.process(buildJob({}))).rejects.toThrow();
    expect(acl.fetchConvertedPreview).not.toHaveBeenCalled();
    expect(objectStorage.putObject).not.toHaveBeenCalled();
    expect(acl.publishToCore).not.toHaveBeenCalled();
  });

  it('propaga o erro sem publicar no core quando a busca da prévia falha (isolamento por instância, RF-07)', async () => {
    const { processor, acl, objectStorage } = buildProcessor();
    (acl.fetchConvertedPreview as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('orthanc indisponível'));

    await expect(processor.process(buildJob(NOTIFICATION))).rejects.toThrow('orthanc indisponível');
    expect(objectStorage.putObject).not.toHaveBeenCalled();
    expect(acl.publishToCore).not.toHaveBeenCalled();
  });
});

describe('ImagingConversionProcessor.onModuleDestroy (BE-07)', () => {
  it('fecha o worker com force=true — evita travar o shutdown do core se o Redis estiver indisponível (achado desta implementação)', async () => {
    const { processor } = buildProcessor();
    const fakeWorker = { close: vi.fn().mockResolvedValue(undefined) };
    Object.assign(processor as unknown as { worker: unknown }, { worker: fakeWorker });

    await processor.onModuleDestroy();

    expect(fakeWorker.close).toHaveBeenCalledWith(true);
  });

  it('não lança erro quando onModuleDestroy é chamado sem o worker ter sido inicializado', async () => {
    const { processor } = buildProcessor();
    await expect(processor.onModuleDestroy()).resolves.toBeUndefined();
  });
});
