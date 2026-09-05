import { describe, expect, it } from 'vitest';
import { loadServiceApiKeyConfig } from './service-api-key-config.js';

/**
 * BE-09 (`TASK.md`) — mesmo padrão de `redis-config.spec.ts`/
 * `integration-engine-config.spec.ts`: `loadServiceApiKeyConfig` aceita um
 * objeto de env explícito (nunca lê `process.env` direto) para ser testável
 * sem mutar o ambiente do processo.
 */
describe('loadServiceApiKeyConfig', () => {
  it('usa o default de desenvolvimento quando INTERNAL_SERVICE_API_KEY não é fornecida', () => {
    const config = loadServiceApiKeyConfig({});

    expect(config).toEqual({
      serviceApiKey: 'portalmed_service_api_key_dev_only_change_me',
    });
  });

  // Nota de correção pós-implementação (fix-loop, BE-09): a variável lida é
  // `INTERNAL_SERVICE_API_KEY` (não `SERVICE_API_KEY`) para casar com o
  // secret já provisionado por `infra/modules/secrets/main.tf` desde a
  // fundação de infraestrutura — ver `service-api-key-config.ts`.
  it('lê INTERNAL_SERVICE_API_KEY de env quando fornecida', () => {
    const config = loadServiceApiKeyConfig({ INTERNAL_SERVICE_API_KEY: 'chave-real-de-producao' });

    expect(config).toEqual({ serviceApiKey: 'chave-real-de-producao' });
  });

  it('trata string vazia como ausente, caindo no default (nunca uma chave vazia silenciosa)', () => {
    const config = loadServiceApiKeyConfig({ INTERNAL_SERVICE_API_KEY: '' });

    expect(config.serviceApiKey).toBe('portalmed_service_api_key_dev_only_change_me');
  });
});
