import { describe, expect, it } from 'vitest';
import { loadIntegrationEngineConfig } from './integration-engine-config.js';

/**
 * BE-06 (`TASK.md`) — `CORE_INGEST_INTERNAL_URL` vem de env, nunca
 * hardcoded (`TASK.md` §1.1), mesmo padrão de `loadRedisConfig`/
 * `loadObjectStorageConfig`.
 */
describe('loadIntegrationEngineConfig', () => {
  it('usa o default de desenvolvimento quando CORE_INGEST_INTERNAL_URL não é fornecida', () => {
    expect(loadIntegrationEngineConfig({})).toEqual({
      coreIngestUrl: 'http://localhost:3000/internal/ingest',
    });
  });

  it('lê CORE_INGEST_INTERNAL_URL do env quando fornecida', () => {
    expect(
      loadIntegrationEngineConfig({
        CORE_INGEST_INTERNAL_URL: 'https://core.portalmed.internal/internal/ingest',
      }),
    ).toEqual({
      coreIngestUrl: 'https://core.portalmed.internal/internal/ingest',
    });
  });
});
