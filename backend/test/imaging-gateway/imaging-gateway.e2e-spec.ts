import 'reflect-metadata';
import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import { CreateBucketCommand, GetObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { LocalstackContainer, type StartedLocalStackContainer } from '@testcontainers/localstack';
import {
  CoreImagingIngestPlaceholderController,
  ImagingGatewayModule,
} from '../../src/imaging-gateway/index.js';
import { IMAGING_GATEWAY_CONFIG } from '../../src/imaging-gateway/imaging-gateway.tokens.js';
import type { ImagingGatewayConfig } from '../../src/imaging-gateway/imaging-gateway-config.js';
import { createS3Client } from '../../src/object-storage/s3-client.js';
import { loadObjectStorageConfig, type ObjectStorageConfig } from '../../src/object-storage/object-storage-config.js';
import { SERVICE_API_KEY_CONFIG, SERVICE_API_KEY_HEADER } from '../../src/security/index.js';

const STUB_PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const ORTHANC_INSTANCE_ID = 'b866515e-fd9962f4-a43d054d-38596491-79e610ab';
const TEST_SERVICE_API_KEY = 'chave-de-servico-e2e';

const VALID_NOTIFICATION = {
  remoteAet: 'HOSP_PACS_01',
  studyInstanceUid: '1.2.826.0.1.3680043.8.498.11111111111111111111111111111111',
  seriesInstanceUid: '1.2.826.0.1.3680043.8.498.22222222222222222222222222222222',
  sopInstanceUid: '1.2.826.0.1.3680043.8.498.33333333333333333333333333333333',
  orthancInstanceId: ORTHANC_INSTANCE_ID,
};

/**
 * BE-07 (`TASK.md`) — prova, dentro de um app NestJS real (DI + HTTP de
 * ponta a ponta), que a Anti-Corruption Layer do Imaging Gateway funciona
 * exatamente como o critério de aceite exige: recebe a notificação de
 * instância estável, converte de forma assíncrona (fila BullMQ real,
 * Redis efêmero via `testcontainers` — BE-05), grava a imagem convertida
 * no Object Storage (LocalStack efêmero via `testcontainers` — BE-08,
 * `ObjectStorageService` consumida sem mudança de assinatura) e notifica
 * o endpoint interno do core com `RemoteAET` + UIDs DICOM + referência ao
 * arquivo (ADR-012).
 *
 * O Orthanc real (REST API de prévia) é substituído aqui por um stub HTTP
 * mínimo — este arquivo cobre o caminho **dentro do processo do core**
 * (webhook → fila → worker → Object Storage → `/internal/imaging-ingest`),
 * mesmo raciocínio de `integration-engine.e2e-spec.ts` (BE-06). A prova
 * contra o Orthanc **real** (deploy, C-STORE, conversão, Lua) está em
 * `orthanc-imaging-gateway.e2e-spec.ts`.
 *
 * Nenhum mock de Redis/BullMQ/S3 — infraestrutura real e efêmera, mesma
 * disciplina de BE-02 a BE-06/BE-08.
 */
describe('BE-07 — Anti-Corruption Layer (Imaging Gateway → core)', () => {
  let redisContainer: StartedRedisContainer;
  let localstackContainer: StartedLocalStackContainer;
  let s3Client: S3Client;
  let stubOrthanc: http.Server;
  let stubOrthancRequests: string[];
  let app: INestApplication;
  let placeholderController: CoreImagingIngestPlaceholderController;
  let originalEnv: NodeJS.ProcessEnv;

  const bucket = 'portalmed-imagens-e2e';

  beforeAll(async () => {
    redisContainer = await new RedisContainer('redis:7-alpine').start();
    localstackContainer = await new LocalstackContainer('localstack/localstack:3').start();

    const objectStorageEnv = {
      OBJECT_STORAGE_BUCKET: bucket,
      OBJECT_STORAGE_REGION: 'sa-east-1',
      OBJECT_STORAGE_ENDPOINT: localstackContainer.getConnectionUri(),
      OBJECT_STORAGE_FORCE_PATH_STYLE: 'true',
      OBJECT_STORAGE_ACCESS_KEY_ID: 'test',
      OBJECT_STORAGE_SECRET_ACCESS_KEY: 'test',
    };
    const objectStorageConfig: ObjectStorageConfig = loadObjectStorageConfig(objectStorageEnv);
    s3Client = createS3Client(objectStorageConfig);
    await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));

    originalEnv = { ...process.env };
    Object.assign(process.env, objectStorageEnv, {
      REDIS_HOST: redisContainer.getHost(),
      REDIS_PORT: String(redisContainer.getPort()),
      REDIS_TLS: 'false',
      BULLMQ_PREFIX: 'portalmed:bullmq:imaging-gateway-e2e',
    });
    delete process.env.REDIS_PASSWORD;

    // Stub mínimo da API REST do Orthanc — só o endpoint que a ACL
    // consome (`GET /instances/{id}/preview`). O Orthanc real (Lua,
    // C-STORE, conversão de fato) é exercitado em
    // `orthanc-imaging-gateway.e2e-spec.ts`.
    stubOrthancRequests = [];
    stubOrthanc = http.createServer((req, res) => {
      stubOrthancRequests.push(req.url ?? '');
      if (req.url === `/instances/${ORTHANC_INSTANCE_ID}/preview`) {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(STUB_PNG_BYTES);
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => stubOrthanc.listen(0, '127.0.0.1', resolve));
    const stubOrthancAddress = stubOrthanc.address();
    const stubOrthancPort = typeof stubOrthancAddress === 'object' && stubOrthancAddress ? stubOrthancAddress.port : 0;

    const mutableConfig: ImagingGatewayConfig = { orthancBaseUrl: '', coreImagingIngestUrl: '' };
    const moduleRef = await Test.createTestingModule({
      imports: [ImagingGatewayModule],
    })
      .overrideProvider(IMAGING_GATEWAY_CONFIG)
      .useValue(mutableConfig)
      .overrideProvider(SERVICE_API_KEY_CONFIG)
      .useValue({ serviceApiKey: TEST_SERVICE_API_KEY })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;

    mutableConfig.orthancBaseUrl = `http://127.0.0.1:${stubOrthancPort}`;
    mutableConfig.coreImagingIngestUrl = `http://127.0.0.1:${port}/internal/imaging-ingest`;

    placeholderController = moduleRef.get(CoreImagingIngestPlaceholderController);
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    stubOrthanc?.close();
    s3Client?.destroy();
    await localstackContainer?.stop();
    await redisContainer?.stop();
    process.env = originalEnv;
  });

  it('webhook do Orthanc (Content-Type application/x-www-form-urlencoded, mesmo do produto real) é aceito e a conversão é assíncrona (202 imediato)', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/imaging-gateway/notifications')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(JSON.stringify(VALID_NOTIFICATION))
      .expect(202);

    expect(response.body).toEqual({ accepted: true });
  });

  it('de ponta a ponta: busca a prévia no Orthanc, grava no Object Storage e publica a notificação canônica em /internal/imaging-ingest', async () => {
    await vi.waitFor(
      () => {
        expect(placeholderController.getLastReceivedMessage()).toBeDefined();
      },
      { timeout: 20_000, interval: 200 },
    );

    expect(stubOrthancRequests).toContain(`/instances/${ORTHANC_INSTANCE_ID}/preview`);

    expect(placeholderController.getLastReceivedMessage()).toEqual({
      schemaVersion: '1.0',
      remoteAet: 'HOSP_PACS_01',
      dicom: {
        studyInstanceUid: VALID_NOTIFICATION.studyInstanceUid,
        seriesInstanceUid: VALID_NOTIFICATION.seriesInstanceUid,
        sopInstanceUid: VALID_NOTIFICATION.sopInstanceUid,
      },
      convertedFile: {
        objectStorageKey: `imagens-convertidas/${VALID_NOTIFICATION.sopInstanceUid}.png`,
        contentType: 'image/png',
      },
      convertedAt: expect.any(String),
    });

    const stored = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `imagens-convertidas/${VALID_NOTIFICATION.sopInstanceUid}.png`,
      }),
    );
    const storedBytes = Buffer.from(await stored.Body!.transformToByteArray());
    expect(storedBytes).toEqual(STUB_PNG_BYTES);
  }, 30_000);

  /**
   * `SEC-BUG-002` (Bloqueio 005, DevSecOps — Lote 2, `SECURITY-REVIEW.md`
   * "Lote 2" Seção 4) — o achado original foi levantado contra
   * `CoreIngestPlaceholderController` (BE-06); o DevSecOps confirmou que
   * `CanonicalImagingNotificationMessage` não carrega dado pessoal
   * identificável, então este controller não gerou achado de compliance —
   * só um ponto de atenção de estilo (mesmo `JSON.stringify(body)`
   * irrestrito). Corrigido pela mesma causa raiz: este teste confirma que
   * o log deste placeholder também deixou de serializar o payload inteiro,
   * citando só os campos técnicos pontuais equivalentes ao novo padrão de
   * BE-06.
   */
  it('[SEC-BUG-002] o placeholder /internal/imaging-ingest não loga o payload inteiro (JSON.stringify) — só metadado técnico pontual', async () => {
    const secondNotification = {
      ...VALID_NOTIFICATION,
      sopInstanceUid: '1.2.826.0.1.3680043.8.498.44444444444444444444444444444444',
    };

    const logSpy = vi.spyOn(Logger.prototype, 'log');
    logSpy.mockClear();

    await request(app.getHttpServer())
      .post('/internal/imaging-gateway/notifications')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(JSON.stringify(secondNotification))
      .expect(202);

    await vi.waitFor(
      () => {
        expect(placeholderController.getLastReceivedMessage()?.dicom.sopInstanceUid).toBe(
          secondNotification.sopInstanceUid,
        );
      },
      { timeout: 20_000, interval: 200 },
    );

    const loggedMessages = logSpy.mock.calls.map((call) => String(call[0]));
    const placeholderMessages = loggedMessages.filter((message) => message.includes('BE-07 placeholder'));
    expect(placeholderMessages.length).toBeGreaterThan(0);

    for (const message of placeholderMessages) {
      // Nunca o `JSON.stringify` do payload inteiro (nenhuma chave de
      // objeto serializado, ex.: `"dicom":`/`"convertedFile":`).
      expect(message).not.toContain('"dicom"');
      expect(message).not.toContain('"convertedFile"');
      expect(message).toContain(`sopInstanceUid=${secondNotification.sopInstanceUid}`);
      expect(message).toContain(`remoteAet=${secondNotification.remoteAet}`);
    }

    logSpy.mockRestore();
  }, 30_000);

  it('rejeita (400) uma notificação com campo obrigatório ausente, sem enfileirar nada', async () => {
    const { remoteAet: _omitted, ...incomplete } = VALID_NOTIFICATION;

    await request(app.getHttpServer())
      .post('/internal/imaging-gateway/notifications')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
      .send(JSON.stringify(incomplete))
      .expect(400);
  });

  it('o endpoint placeholder /internal/imaging-ingest aceita chamada direta (com a API key de serviço) e retorna 202 com o marcador de placeholder', async () => {
    const response = await request(app.getHttpServer())
      .post('/internal/imaging-ingest')
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
    {
      nome: '/internal/imaging-gateway/notifications (hop 1)',
      path: '/internal/imaging-gateway/notifications',
      contentType: 'application/x-www-form-urlencoded',
      body: JSON.stringify(VALID_NOTIFICATION),
    },
    {
      nome: '/internal/imaging-ingest (hop 2, placeholder do core)',
      path: '/internal/imaging-ingest',
      contentType: 'application/json',
      body: { qualquer: 'coisa' },
    },
  ])('BE-09 — ServiceApiKeyGuard em $nome', ({ path, contentType, body }) => {
    it('rejeita (401) quando o header X-Service-Api-Key está ausente', async () => {
      await request(app.getHttpServer()).post(path).set('Content-Type', contentType).send(body).expect(401);
    });

    it('rejeita (401) quando o header X-Service-Api-Key está vazio', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set('Content-Type', contentType)
        .set(SERVICE_API_KEY_HEADER, '')
        .send(body)
        .expect(401);
    });

    it('rejeita (401) quando o header X-Service-Api-Key tem valor incorreto', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set('Content-Type', contentType)
        .set(SERVICE_API_KEY_HEADER, 'chave-errada')
        .send(body)
        .expect(401);
    });

    it('aceita quando o header X-Service-Api-Key tem o valor correto', async () => {
      await request(app.getHttpServer())
        .post(path)
        .set('Content-Type', contentType)
        .set(SERVICE_API_KEY_HEADER, TEST_SERVICE_API_KEY)
        .send(body)
        .expect(202);
    });
  });
});
