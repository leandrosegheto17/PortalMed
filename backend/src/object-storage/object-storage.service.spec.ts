import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { S3Client } from '@aws-sdk/client-s3';
import { MAX_SIGNED_URL_TTL_SECONDS, type ObjectStorageConfig } from './object-storage-config.js';
import { ObjectStorageService } from './object-storage.service.js';

const getSignedUrlMock = vi.fn();
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

/**
 * BE-08 (`TASK.md`) — unitário, sem rede real: valida as guardas de
 * entrada (key/expiração) e a delegação correta para o SDK, com o `S3Client`
 * e `getSignedUrl` (`@aws-sdk/s3-request-presigner`) substituídos por
 * dublês. A interação real de ponta a ponta contra um S3-compatível (a URL
 * assinada de fato funciona, expira de verdade) é coberta pelo teste e2e
 * (`test/object-storage/object-storage-infrastructure.e2e-spec.ts`, via
 * LocalStack/testcontainers) — ver `backend/docs/object-storage.md` para a
 * justificativa de por que o e2e usa LocalStack em vez de mock aqui.
 */
describe('ObjectStorageService (BE-08)', () => {
  const config: ObjectStorageConfig = {
    bucket: 'portalmed-exames-test',
    region: 'sa-east-1',
    endpoint: undefined,
    forcePathStyle: false,
    accessKeyId: undefined,
    secretAccessKey: undefined,
    signedUrlTtlSeconds: 300,
  };

  let sendMock: ReturnType<typeof vi.fn>;
  let service: ObjectStorageService;

  beforeEach(() => {
    getSignedUrlMock.mockReset();
    sendMock = vi.fn().mockResolvedValue({});
    const fakeClient = { send: sendMock } as unknown as S3Client;
    service = new ObjectStorageService(fakeClient, config);
  });

  describe('getReadSignedUrl', () => {
    it('rejeita key vazia sem chamar o SDK — nenhuma URL é gerada para chave inválida', async () => {
      await expect(service.getReadSignedUrl('')).rejects.toThrow(/key/i);
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it('usa o TTL default da config (300s) quando nenhum override é informado', async () => {
      getSignedUrlMock.mockResolvedValue('https://signed.example/object?X-Amz-Signature=abc');

      const url = await service.getReadSignedUrl('exames/laudo-1.pdf');

      expect(url).toBe('https://signed.example/object?X-Amz-Signature=abc');
      expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
      const [, command, options] = getSignedUrlMock.mock.calls[0] as [unknown, { input: unknown }, unknown];
      expect(options).toEqual({ expiresIn: 300 });
      expect(command.input).toEqual({ Bucket: 'portalmed-exames-test', Key: 'exames/laudo-1.pdf' });
    });

    it('aceita um override de expiração explícito, dentro do teto', async () => {
      getSignedUrlMock.mockResolvedValue('https://signed.example/object?X-Amz-Signature=xyz');

      await service.getReadSignedUrl('exames/laudo-1.pdf', 60);

      const [, , options] = getSignedUrlMock.mock.calls[0] as [unknown, unknown, unknown];
      expect(options).toEqual({ expiresIn: 60 });
    });

    it.each([0, -1, 1.5])('rejeita override de expiração inválido: %s', async (value) => {
      await expect(service.getReadSignedUrl('exames/laudo-1.pdf', value)).rejects.toThrow();
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it('rejeita override acima do teto de 15 min — GUARDRAILS.md item 23 (nunca URL "quase permanente")', async () => {
      await expect(
        service.getReadSignedUrl('exames/laudo-1.pdf', MAX_SIGNED_URL_TTL_SECONDS + 1),
      ).rejects.toThrow(/teto/);
      expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it('aceita override exatamente no teto de 15 min', async () => {
      getSignedUrlMock.mockResolvedValue('https://signed.example/object?X-Amz-Signature=teto');

      await expect(
        service.getReadSignedUrl('exames/laudo-1.pdf', MAX_SIGNED_URL_TTL_SECONDS),
      ).resolves.toBe('https://signed.example/object?X-Amz-Signature=teto');
    });
  });

  describe('putObject', () => {
    it('rejeita key vazia sem chamar o SDK', async () => {
      await expect(service.putObject('', Buffer.from('a'))).rejects.toThrow(/key/i);
      expect(sendMock).not.toHaveBeenCalled();
    });

    it('envia PutObjectCommand reforçando SSE-KMS em runtime (defesa em profundidade sobre a policy do bucket, DEPLOY.md §3.1)', async () => {
      await service.putObject('exames/laudo-1.pdf', Buffer.from('conteudo'), 'application/pdf');

      expect(sendMock).toHaveBeenCalledTimes(1);
      const command = sendMock.mock.calls[0][0] as { input: unknown };
      expect(command.input).toEqual({
        Bucket: 'portalmed-exames-test',
        Key: 'exames/laudo-1.pdf',
        Body: Buffer.from('conteudo'),
        ContentType: 'application/pdf',
        ServerSideEncryption: 'aws:kms',
      });
    });

    it('ContentType é opcional', async () => {
      await service.putObject('exames/laudo-2.pdf', Buffer.from('conteudo'));

      const command = sendMock.mock.calls[0][0] as { input: { ContentType: unknown } };
      expect(command.input.ContentType).toBeUndefined();
    });
  });
});
