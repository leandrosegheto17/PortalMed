import { describe, expect, it } from 'vitest';
import { loadImagingGatewayConfig } from './imaging-gateway-config.js';

describe('loadImagingGatewayConfig (BE-07)', () => {
  it('usa os defaults de desenvolvimento quando nenhuma env é informada', () => {
    const config = loadImagingGatewayConfig({});

    expect(config).toEqual({
      orthancBaseUrl: 'http://localhost:8042',
      coreImagingIngestUrl: 'http://localhost:3000/internal/imaging-ingest',
    });
  });

  it('monta orthancBaseUrl a partir de IMAGING_GATEWAY_HOST/IMAGING_GATEWAY_PORT (mesmos nomes já reservados em infra/environments/*)', () => {
    const config = loadImagingGatewayConfig({
      IMAGING_GATEWAY_HOST: 'imaging-gateway.internal.portalmed-staging.local',
      IMAGING_GATEWAY_PORT: '8042',
    });

    expect(config.orthancBaseUrl).toBe('http://imaging-gateway.internal.portalmed-staging.local:8042');
  });

  it('IMAGING_GATEWAY_ORTHANC_BASE_URL, quando informado, tem prioridade sobre host/porta (uso em teste — URL completa já pronta)', () => {
    const config = loadImagingGatewayConfig({
      IMAGING_GATEWAY_HOST: 'ignored-host',
      IMAGING_GATEWAY_PORT: '9999',
      IMAGING_GATEWAY_ORTHANC_BASE_URL: 'http://127.0.0.1:18042',
    });

    expect(config.orthancBaseUrl).toBe('http://127.0.0.1:18042');
  });

  it('respeita CORE_IMAGING_INGEST_INTERNAL_URL quando informado', () => {
    const config = loadImagingGatewayConfig({
      CORE_IMAGING_INGEST_INTERNAL_URL: 'http://127.0.0.1:4000/internal/imaging-ingest',
    });

    expect(config.coreImagingIngestUrl).toBe('http://127.0.0.1:4000/internal/imaging-ingest');
  });
});
