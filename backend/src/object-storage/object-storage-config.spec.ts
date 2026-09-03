import { describe, expect, it } from 'vitest';
import { loadObjectStorageConfig, MAX_SIGNED_URL_TTL_SECONDS } from './object-storage-config.js';

describe('loadObjectStorageConfig (BE-08)', () => {
  const baseEnv = { OBJECT_STORAGE_BUCKET: 'portalmed-exames-test' };

  it('carrega defaults de desenvolvimento quando só o bucket é informado', () => {
    const config = loadObjectStorageConfig(baseEnv);

    expect(config).toEqual({
      bucket: 'portalmed-exames-test',
      region: 'sa-east-1',
      endpoint: undefined,
      forcePathStyle: false,
      accessKeyId: undefined,
      secretAccessKey: undefined,
      signedUrlTtlSeconds: 300,
    });
  });

  it('lança erro explícito se OBJECT_STORAGE_BUCKET não for informado — nunca hardcoded (TASK.md §1.1)', () => {
    expect(() => loadObjectStorageConfig({})).toThrow(/OBJECT_STORAGE_BUCKET obrigatório/);
  });

  it('aceita a região sa-east-1 (ADR-010/DEPLOY.md §2 — AWS, região Brasil)', () => {
    const config = loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_REGION: 'sa-east-1' });
    expect(config.region).toBe('sa-east-1');
  });

  it.each(['us-east-1', 'eu-west-1'])(
    'rejeita região fora da lista de regiões Brasil conhecidas (ADR-010/GUARDRAILS.md item 24): "%s"',
    (region) => {
      expect(() => loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_REGION: region })).toThrow(
        /ADR-010\/GUARDRAILS\.md item 24/,
      );
    },
  );

  it('lê endpoint/forcePathStyle customizados fora de production/staging (uso: provedor S3-compatível local/teste, ex. LocalStack)', () => {
    const config = loadObjectStorageConfig({
      ...baseEnv,
      OBJECT_STORAGE_ENDPOINT: 'http://localhost:4566',
      OBJECT_STORAGE_FORCE_PATH_STYLE: 'true',
    });

    expect(config.endpoint).toBe('http://localhost:4566');
    expect(config.forcePathStyle).toBe(true);
  });

  it('aceita OBJECT_STORAGE_ENDPOINT quando NODE_ENV é "test" (Vitest) ou "development"', () => {
    expect(
      loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_ENDPOINT: 'http://localhost:4566', NODE_ENV: 'test' })
        .endpoint,
    ).toBe('http://localhost:4566');
    expect(
      loadObjectStorageConfig({
        ...baseEnv,
        OBJECT_STORAGE_ENDPOINT: 'http://localhost:4566',
        NODE_ENV: 'development',
      }).endpoint,
    ).toBe('http://localhost:4566');
  });

  it.each(['production', 'staging'])(
    'REJEITA OBJECT_STORAGE_ENDPOINT quando NODE_ENV="%s" — achado de revisão de BE-08: endpoint sobrescreve o SDK e contornaria silenciosamente a validação de região Brasil (ADR-010/GUARDRAILS.md item 24)',
    (nodeEnv) => {
      expect(() =>
        loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_ENDPOINT: 'http://localhost:4566', NODE_ENV: nodeEnv }),
      ).toThrow(/OBJECT_STORAGE_ENDPOINT não pode ser definido quando NODE_ENV/);
    },
  );

  it('não lança erro em production/staging quando OBJECT_STORAGE_ENDPOINT não é informado', () => {
    expect(() => loadObjectStorageConfig({ ...baseEnv, NODE_ENV: 'production' })).not.toThrow();
    expect(() => loadObjectStorageConfig({ ...baseEnv, NODE_ENV: 'staging' })).not.toThrow();
  });

  it.each(['True', 'FALSE', '1', '0', 'yes'])(
    'rejeita OBJECT_STORAGE_FORCE_PATH_STYLE não reconhecido (nunca resolve para false silenciosamente): "%s"',
    (value) => {
      expect(() =>
        loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_FORCE_PATH_STYLE: value }),
      ).toThrow(/OBJECT_STORAGE_FORCE_PATH_STYLE inválido/);
    },
  );

  it('lê credenciais explícitas quando informadas (dev/teste — produção usa a cadeia padrão do SDK/IAM role, DEPLOY.md §3.1)', () => {
    const config = loadObjectStorageConfig({
      ...baseEnv,
      OBJECT_STORAGE_ACCESS_KEY_ID: 'test',
      OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test',
    });

    expect(config.accessKeyId).toBe('test');
    expect(config.secretAccessKey).toBe('test');
  });

  it('lê OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS customizado dentro do teto', () => {
    const config = loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: '120' });
    expect(config.signedUrlTtlSeconds).toBe(120);
  });

  it.each(['0', '-5', 'abc', '1.5'])(
    'rejeita OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS inválido: "%s"',
    (value) => {
      expect(() =>
        loadObjectStorageConfig({ ...baseEnv, OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: value }),
      ).toThrow(/OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS inválido/);
    },
  );

  it('rejeita OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS acima do teto de 15 min — nunca URL "quase permanente" (GUARDRAILS.md item 23)', () => {
    expect(() =>
      loadObjectStorageConfig({
        ...baseEnv,
        OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: String(MAX_SIGNED_URL_TTL_SECONDS + 1),
      }),
    ).toThrow(/excede o teto/);
  });

  it('aceita OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS exatamente no teto', () => {
    const config = loadObjectStorageConfig({
      ...baseEnv,
      OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS: String(MAX_SIGNED_URL_TTL_SECONDS),
    });
    expect(config.signedUrlTtlSeconds).toBe(MAX_SIGNED_URL_TTL_SECONDS);
  });
});
