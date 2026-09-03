import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntegrationEngineAclService } from './integration-engine-acl.service.js';
import type { CanonicalExamResultMessage } from './canonical-exam-result-message.js';

const CANONICAL_MESSAGE: CanonicalExamResultMessage = {
  schemaVersion: '1.0',
  sourceSystem: 'LIS',
  messageType: 'ORU^R01',
  messageControlId: 'MSG00001',
  patient: { identifier: '123456789', name: 'SILVA JOAO' },
  exam: { code: 'GLU', name: 'GLICOSE' },
  result: { value: '95', unit: 'mg/dL' },
  receivedAt: '2026-09-03T20:55:09.362Z',
};

/**
 * BE-06 (`TASK.md`) — unitário, sem rede real: valida que
 * `publishToCore` chama o endpoint interno correto com o payload/headers
 * esperados, via `fetch` global substituído por dublê (mesmo padrão de
 * `object-storage.service.spec.ts`, S3Client como dublê). A interação real
 * de ponta a ponta (o próprio endpoint `/internal/ingest` recebendo a
 * chamada dentro de um app NestJS real) é coberta pelo teste e2e
 * (`test/integration-engine/integration-engine.e2e-spec.ts`).
 */
describe('IntegrationEngineAclService', () => {
  const originalFetch = global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  function buildService(coreIngestUrl = 'http://localhost:3000/internal/ingest'): IntegrationEngineAclService {
    return new IntegrationEngineAclService({ coreIngestUrl });
  }

  it('publica o JSON canônico via POST para coreIngestUrl, com Content-Type application/json', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 202 });
    const service = buildService();

    await service.publishToCore(CANONICAL_MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:3000/internal/ingest');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body as string)).toEqual(CANONICAL_MESSAGE);
  });

  it('usa a coreIngestUrl configurada (nunca hardcoded)', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 202 });
    const service = buildService('https://core.portalmed.internal/internal/ingest');

    await service.publishToCore(CANONICAL_MESSAGE);

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe('https://core.portalmed.internal/internal/ingest');
  });

  it('lança erro explícito quando o endpoint interno do core responde com status de erro', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('boom') });
    const service = buildService();

    await expect(service.publishToCore(CANONICAL_MESSAGE)).rejects.toThrow(/HTTP 500/);
  });
});
