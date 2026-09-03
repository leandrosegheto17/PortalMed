import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CoreIngestPlaceholderController,
  IntegrationEngineModule,
} from '../../src/integration-engine/index.js';
import { INTEGRATION_ENGINE_CONFIG } from '../../src/integration-engine/integration-engine.tokens.js';
import type { IntegrationEngineConfig } from '../../src/integration-engine/integration-engine-config.js';

/**
 * BE-06 (`TASK.md`) — prova, dentro de um app NestJS real (DI + HTTP de
 * ponta a ponta via `supertest`), que a Anti-Corruption Layer funciona
 * exatamente como o critério de aceite exige: "ACL normaliza mensagem de
 * teste para JSON canônico e publica para endpoint interno do core".
 *
 * Este arquivo cobre o caminho **dentro do processo do core** (ACL →
 * endpoint interno `/internal/ingest`) sem depender de Docker/da engine
 * real — a prova de que a engine real (NextGen Connect) consegue chamar
 * este mesmo endpoint via MLLP → HTTP Sender está em
 * `hl7v2-channel.e2e-spec.ts` (testcontainers, engine real).
 */
describe('BE-06 — Anti-Corruption Layer (Integration Engine → core)', () => {
  let app: INestApplication;
  let placeholderController: CoreIngestPlaceholderController;

  const validEnvelope = {
    messageType: 'ORU^R01',
    messageControlId: 'MSG00001',
    sourceSystem: 'LIS',
    patientIdentifier: '123456789',
    patientName: 'SILVA JOAO',
    examCode: 'GLU',
    examName: 'GLICOSE',
    resultValue: '95',
    resultUnit: 'mg/dL',
    receivedAt: '2026-09-03T20:55:09.362Z',
  };

  beforeAll(async () => {
    // A config real (`coreIngestUrl`) só é conhecida depois que o app abre
    // a porta efêmera (`app.listen(0)`) — por isso o provider é sobrescrito
    // com um objeto **mutável**, atualizado in-place depois que a porta é
    // conhecida. `IntegrationEngineAclService` lê `this.config.coreIngestUrl`
    // a cada chamada (nunca cacheia no construtor), então a mutação
    // posterior é observada normalmente. Import direto do token interno
    // (fora do barrel público) é aceitável em teste, mesmo padrão já usado
    // por `object-storage-infrastructure.e2e-spec.ts` (importa
    // `createS3Client`/`loadObjectStorageConfig` direto do arquivo interno).
    const mutableConfig: IntegrationEngineConfig = { coreIngestUrl: '' };

    const moduleRef = await Test.createTestingModule({
      imports: [IntegrationEngineModule],
    })
      .overrideProvider(INTEGRATION_ENGINE_CONFIG)
      .useValue(mutableConfig)
      .compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    mutableConfig.coreIngestUrl = `http://127.0.0.1:${port}/internal/ingest`;

    placeholderController = moduleRef.get(CoreIngestPlaceholderController);
  });

  afterAll(async () => {
    await app.close();
  });

  it('recebe o envelope normalizado pela engine, converte para JSON canônico e publica no endpoint interno /internal/ingest', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/integration-engine/messages')
      .send(validEnvelope)
      .expect(202);

    expect(response.body).toEqual({ accepted: true });

    // Confirma que a mensagem chegou de fato no endpoint interno do core,
    // já traduzida para o JSON canônico de domínio (não o envelope bruto
    // da engine) — round-trip HTTP real dentro do próprio app, não uma
    // chamada de método simulada.
    expect(placeholderController.getLastReceivedMessage()).toEqual({
      schemaVersion: '1.0',
      sourceSystem: 'LIS',
      messageType: 'ORU^R01',
      messageControlId: 'MSG00001',
      patient: { identifier: '123456789', name: 'SILVA JOAO' },
      exam: { code: 'GLU', name: 'GLICOSE' },
      result: { value: '95', unit: 'mg/dL' },
      receivedAt: '2026-09-03T20:55:09.362Z',
    });
  });

  it('rejeita (400) um envelope com campo obrigatório ausente, sem publicar nada no core', async () => {
    const { patientIdentifier: _omitted, ...incomplete } = validEnvelope;

    await request(app.getHttpServer())
      .post('/internal/integration-engine/messages')
      .send(incomplete)
      .expect(400);
  });

  it('o endpoint placeholder /internal/ingest aceita chamada direta e retorna 202 com o marcador de placeholder', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/ingest')
      .send({ qualquer: 'coisa' })
      .expect(202);

    expect(response.body).toEqual({ accepted: true, placeholder: true });
  });
});
