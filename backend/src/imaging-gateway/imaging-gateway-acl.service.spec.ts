import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImagingGatewayAclService } from './imaging-gateway-acl.service.js';
import type { CanonicalImagingNotificationMessage } from './canonical-imaging-notification-message.js';

const CANONICAL_MESSAGE: CanonicalImagingNotificationMessage = {
  schemaVersion: '1.0',
  remoteAet: 'HOSP_PACS_01',
  dicom: {
    studyInstanceUid: '1.2.826.0.1.3680043.8.498.1',
    seriesInstanceUid: '1.2.826.0.1.3680043.8.498.2',
    sopInstanceUid: '1.2.826.0.1.3680043.8.498.3',
  },
  convertedFile: {
    objectStorageKey: 'imagens-convertidas/1.2.826.0.1.3680043.8.498.3.png',
    contentType: 'image/png',
  },
  convertedAt: '2026-09-04T12:00:00.000Z',
};

/**
 * BE-07 (`TASK.md`) — unitário, sem rede real: `fetch` global substituído
 * por dublê, mesmo padrão de `integration-engine-acl.service.spec.ts`
 * (BE-06)/`object-storage.service.spec.ts` (BE-08). A interação real de
 * ponta a ponta contra o Orthanc/endpoint interno do core está nas
 * suítes e2e (`test/imaging-gateway/`).
 */
describe('ImagingGatewayAclService', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function buildService(
    config = { orthancBaseUrl: 'http://localhost:8042', coreImagingIngestUrl: 'http://localhost:3000/internal/imaging-ingest' },
    serviceApiKeyConfig = { serviceApiKey: 'chave-de-servico-de-teste' },
  ): ImagingGatewayAclService {
    return new ImagingGatewayAclService(config, serviceApiKeyConfig);
  }

  describe('fetchConvertedPreview', () => {
    it('busca GET {orthancBaseUrl}/instances/{id}/preview e devolve buffer + content-type', async () => {
      const pngBytes = new Uint8Array([1, 2, 3, 4]);
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'image/png']]),
        arrayBuffer: () => Promise.resolve(pngBytes.buffer),
      });
      const service = buildService();

      const result = await service.fetchConvertedPreview('abc-123');

      expect(fetchMock).toHaveBeenCalledWith('http://localhost:8042/instances/abc-123/preview');
      expect(result.contentType).toBe('image/png');
      expect(Buffer.from(result.buffer)).toEqual(Buffer.from(pngBytes));
    });

    it('usa image/png como fallback quando o Orthanc não informa content-type', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Map(),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      });
      const service = buildService();

      const result = await service.fetchConvertedPreview('abc-123');

      expect(result.contentType).toBe('image/png');
    });

    it('lança erro explícito quando o Orthanc responde com status de erro', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 404 });
      const service = buildService();

      await expect(service.fetchConvertedPreview('missing')).rejects.toThrow(/HTTP 404/);
    });
  });

  describe('publishToCore', () => {
    it('publica o JSON canônico via POST para coreImagingIngestUrl, com Content-Type application/json e o header X-Service-Api-Key (BE-09)', async () => {
      fetchMock.mockResolvedValue({ ok: true, status: 202 });
      const service = buildService();

      await service.publishToCore(CANONICAL_MESSAGE);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3000/internal/imaging-ingest');
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({
        'Content-Type': 'application/json',
        'x-service-api-key': 'chave-de-servico-de-teste',
      });
      expect(JSON.parse(init.body as string)).toEqual(CANONICAL_MESSAGE);
    });

    it('lança erro explícito quando o endpoint interno do core responde com status de erro', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') });
      const service = buildService();

      await expect(service.publishToCore(CANONICAL_MESSAGE)).rejects.toThrow(/HTTP 500/);
    });
  });
});
