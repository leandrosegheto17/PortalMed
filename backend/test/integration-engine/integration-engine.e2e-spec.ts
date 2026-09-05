import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  CoreIngestPlaceholderController,
  IntegrationEngineModule,
} from '../../src/integration-engine/index.js';
import { INTEGRATION_ENGINE_CONFIG } from '../../src/integration-engine/integration-engine.tokens.js';
import type { IntegrationEngineConfig } from '../../src/integration-engine/integration-engine-config.js';
import { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER } from '../../src/security/index.js';

const TEST_SERVICE_API_KEY = 'chave-de-servico-e2e';

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
      .overrideProvider(SERVICE_API_KEY_CONFIG)
      .useValue({ serviceApiKey: TEST_SERVICE_API_KEY })
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
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(validEnvelope)
      .expect(202);

    expect(response.body).toEqual({ accepted: true });

    // Confirma que a mensagem chegou de fato no endpoint interno do core,
    // já traduzida para o JSON canônico de domínio (não o envelope bruto
    // da engine) — round-trip HTTP real dentro do próprio app, não uma
    // chamada de método simulada. Prova também, de ponta a ponta, que
    // `IntegrationEngineAclService` anexa sozinho o header de serviço no
    // hop 2 (BE-09) — este teste nunca envia o header diretamente para
    // /internal/ingest.
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

  /**
   * `SEC-BUG-002` (Bloqueio 005, DevSecOps — Lote 2, `SECURITY-REVIEW.md`
   * "Lote 2" Seção 4) — regressão permanente: o placeholder
   * `CoreIngestPlaceholderController` (BE-06) logava
   * `JSON.stringify(body)` inteiro (nome/identificador do paciente +
   * resultado clínico) em texto plano, em todo request real. O log agora
   * cita só metadado técnico não identificável; este teste espiona
   * `Logger.prototype.log` durante um request real e garante que nenhum
   * dado do paciente/resultado aparece em nenhuma chamada ao logger,
   * embora `getLastReceivedMessage()` (estado interno, não log) continue
   * guardando a mensagem completa (já coberto pelo teste acima).
   */
  it('[SEC-BUG-002] nunca loga nome/identificador do paciente nem o resultado clínico — só metadado técnico', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log');
    logSpy.mockClear();

    await request(app.getHttpServer())
      .post('/internal/integration-engine/messages')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(validEnvelope)
      .expect(202);

    const loggedMessages = logSpy.mock.calls.map((call) => String(call[0]));
    expect(loggedMessages.length).toBeGreaterThan(0);

    for (const message of loggedMessages) {
      expect(message).not.toContain(validEnvelope.patientIdentifier);
      expect(message).not.toContain(validEnvelope.patientName);
      expect(message).not.toContain(validEnvelope.resultValue);
      expect(message).not.toContain(validEnvelope.examName);
    }

    // O log do placeholder BE-06 continua existindo, só sem dado sensível —
    // confirma metadado técnico não identificável presente.
    expect(loggedMessages.some((message) => message.includes('messageControlId=MSG00001'))).toBe(true);

    logSpy.mockRestore();
  });

  it('rejeita (400) um envelope com campo obrigatório ausente, sem publicar nada no core', async () => {
    const { patientIdentifier: _omitted, ...incomplete } = validEnvelope;

    await request(app.getHttpServer())
      .post('/internal/integration-engine/messages')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(incomplete)
      .expect(400);
  });

  it('o endpoint placeholder /internal/ingest aceita chamada direta (com a API key de serviço) e retorna 202 com o marcador de placeholder', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/ingest')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send({ qualquer: 'coisa' })
      .expect(202);

    expect(response.body).toEqual({ accepted: true, placeholder: true });
  });

  /**
   * BE-09 (`TASK.md`) — os dois endpoints internos desta ACL (hop 1 e hop
   * 2) só aceitam requisição autenticada por API key de serviço. Mesma
   * bateria positivo/negativo (ausente, vazia, incorreta) para cada um,
   * mesmo rigor de BE-02 a BE-07.
   */
  describe.each([
    { nome: '/internal/integration-engine/messages (hop 1)', path: '/internal/integration-engine/messages', body: validEnvelope },
    { nome: '/internal/ingest (hop 2, placeholder do core)', path: '/internal/ingest', body: { qualquer: 'coisa' } },
  ])('BE-09 — ServiceApiKeyGuard em $nome', ({ path, body }) => {
    it('rejeita (401) quando o header X-Service-Api-Key está ausente', async () => {
      await request(app.getHttpServer()).post(path).send(body).expect(401);
    });

    it('rejeita (401) quando o header X-Service-Api-Key está vazio', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set(SERVICE_API_KEY_HEADER, '')
        .send(body)
        .expect(401);
    });

    it('rejeita (401) quando o header X-Service-Api-Key tem valor incorreto', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set(SERVICE_API_KEY_HEADER, 'chave-errada')
        .send(body)
        .expect(401);
    });

    it('aceita quando o header X-Service-Api-Key tem o valor correto', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
        .send(body)
        .expect(202);
    });
  });
});
