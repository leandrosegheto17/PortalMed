import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { GenericContainer, Network, Wait, type StartedNetwork, type StartedTestContainer } from 'testcontainers';
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
import { SERVICE_API_KEY_CONFIG } from '../../src/security/index.js';
import {
  buildRandomMinimalDicomInstanceDescriptor,
  generateTestDicomFile,
  sendDicomViaStoreScu,
} from './dicom-test-fixture.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LUA_SCRIPT_PATH = path.join(__dirname, '..', '..', 'imaging-gateway', 'on-stable-study.lua');

const ORTHANC_IMAGE = 'orthancteam/orthanc:26.8.2-full';
const TEST_SERVICE_API_KEY = 'chave-de-servico-e2e-orthanc';
const HTTP_PORT = 8042;
const DICOM_PORT = 4242;
const ORTHANC_AET = 'PORTALMED';
const CALLING_AET = 'HOSPE2EPACS';
const NETWORK_ALIAS = 'orthanc';

/**
 * BE-07 (`TASK.md`) — prova de ponta a ponta contra o Imaging Gateway
 * **real** (Orthanc, self-hosted, ADR-003), efêmero via `testcontainers` —
 * mesma disciplina de infraestrutura real já usada por BE-02 a BE-06/BE-08:
 * nenhum mock do Orthanc aqui. Cobre exatamente o critério de aceite da
 * tarefa: "Orthanc recebe DICOM de teste via C-STORE, converte para
 * JPEG/PNG de forma assíncrona, armazena original no Orthanc e convertido
 * no Object Storage; notificação ao core inclui RemoteAET nativo [...] +
 * UIDs [...] + referência ao arquivo convertido".
 *
 * Fluxo real exercitado: arquivo DICOM sintético (mínimo porém válido,
 * `dicom-test-fixture.ts`) enviado via **C-STORE real** (`storescu` do
 * toolkit de mercado `dcm4che`, mesmo racional de usar ferramental de
 * mercado em vez de implementar o protocolo DICOM à mão, ADR-002/ADR-003)
 * → Orthanc real aceita a associação, registra o `RemoteAET` nativamente e
 * fica "estável" após `StableAge` → script Lua real
 * (`backend/imaging-gateway/on-stable-study.lua`, o mesmo arquivo que
 * DevOps empacota na imagem de produção) dispara `OnStableStudy` e chama
 * `HttpPost` para `ImagingGatewayController` (rodando no processo de teste,
 * alcançável pelo container via `host.docker.internal`/`host-gateway`,
 * portável em Docker Desktop e runner Linux de CI) → fila BullMQ real
 * (Redis efêmero, BE-05) → `ImagingConversionProcessor` busca a prévia
 * **de fato convertida pelo Orthanc** (`GET /instances/{id}/preview`,
 * plugin GDCM/decodificação nativa — nenhum parser DICOM próprio) → grava
 * no Object Storage (LocalStack efêmero, BE-08) → publica a notificação
 * canônica em `/internal/imaging-ingest` (placeholder, BE-38 futuro).
 *
 * Timeout generoso (imagem Java do Orthanc + toolkit dcm4che, mesmo
 * raciocínio de `hl7v2-channel.e2e-spec.ts`, BE-06).
 *
 * **BE-09 (`TASK.md`)**: desde esta tarefa, `ImagingGatewayController`
 * exige `@UseGuards(ServiceApiKeyGuard)` — o script Lua real envia o header
 * `X-Service-Api-Key` (lido via `os.getenv('INTERNAL_SERVICE_API_KEY')`,
 * variável de ambiente do container definida abaixo com o mesmo valor configurado no
 * app via `SERVICE_API_KEY_CONFIG` sobrescrito). Este teste prova que o
 * emissor real (o Orthanc/Lua) — não só o dublê usado em
 * `imaging-gateway.e2e-spec.ts` — consegue de fato se autenticar.
 */
describe('BE-07 — Imaging Gateway real (Orthanc, C-STORE, testcontainers)', () => {
  let network: StartedNetwork;
  let orthancContainer: StartedTestContainer;
  let redisContainer: StartedRedisContainer;
  let localstackContainer: StartedLocalStackContainer;
  let s3Client: S3Client;
  let app: INestApplication;
  let placeholderController: CoreImagingIngestPlaceholderController;
  let originalEnv: NodeJS.ProcessEnv;

  const bucket = 'portalmed-imagens-orthanc-e2e';

  beforeAll(async () => {
    network = await new Network().start();
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
      BULLMQ_PREFIX: 'portalmed:bullmq:orthanc-e2e',
    });
    delete process.env.REDIS_PASSWORD;

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
    // Escuta em todas as interfaces (não só loopback) para ser alcançável
    // a partir do container do Orthanc via host.docker.internal — mesmo
    // raciocínio de `hl7v2-channel.e2e-spec.ts` (BE-06).
    await app.listen(0, '0.0.0.0');
    const address = app.getHttpServer().address();
    const nestPort = typeof address === 'object' && address ? address.port : 0;
    mutableConfig.coreImagingIngestUrl = `http://127.0.0.1:${nestPort}/internal/imaging-ingest`;
    placeholderController = moduleRef.get(CoreImagingIngestPlaceholderController);

    const luaScript = await readFile(LUA_SCRIPT_PATH, 'utf-8');
    const coreNotifyUrl = `http://host.docker.internal:${nestPort}/internal/imaging-gateway/notifications`;

    orthancContainer = await new GenericContainer(ORTHANC_IMAGE)
      .withNetwork(network)
      .withNetworkAliases(NETWORK_ALIAS)
      .withExposedPorts(HTTP_PORT, DICOM_PORT)
      .withExtraHosts([{ host: 'host.docker.internal', ipAddress: 'host-gateway' }])
      .withCopyContentToContainer([
        { content: luaScript, target: '/etc/orthanc/scripts/on-stable-study.lua' },
      ])
      .withEnvironment({
        ORTHANC__AUTHENTICATION_ENABLED: 'false',
        ORTHANC__DICOM_AET: ORTHANC_AET,
        ORTHANC__DICOM_ALWAYS_ALLOW_STORE: 'true',
        ORTHANC__STABLE_AGE: '1',
        ORTHANC__LUA_SCRIPTS: '["/etc/orthanc/scripts/on-stable-study.lua"]',
        ORTHANC_CORE_NOTIFY_ENDPOINT: coreNotifyUrl,
        // BE-09 (`TASK.md`) — lida pelo script Lua via `os.getenv`, mesmo
        // mecanismo de `ORTHANC_CORE_NOTIFY_ENDPOINT` (não é uma chave
        // nativa `ORTHANC__*`). Precisa ser o mesmo valor de
        // `SERVICE_API_KEY_CONFIG` sobrescrito acima no app de teste.
        // Nome `INTERNAL_SERVICE_API_KEY` (não `SERVICE_API_KEY`, nota de
        // correção pós-implementação, fix-loop BE-09) — casa com o nome já
        // provisionado por `infra/modules/secrets/main.tf`.
        INTERNAL_SERVICE_API_KEY: TEST_SERVICE_API_KEY,
      })
      .withWaitStrategy(Wait.forLogMessage(/Orthanc has started/))
      .withStartupTimeout(180_000)
      .start();

    mutableConfig.orthancBaseUrl = `http://127.0.0.1:${orthancContainer.getMappedPort(HTTP_PORT)}`;
  }, 300_000);

  afterAll(async () => {
    await app?.close();
    s3Client?.destroy();
    await orthancContainer?.stop();
    await localstackContainer?.stop();
    await redisContainer?.stop();
    await network?.stop();
    process.env = originalEnv;
  });

  it('DICOM real via C-STORE chega no Orthanc, fica estável, o Lua notifica o core e a imagem convertida termina no Object Storage + /internal/imaging-ingest', async () => {
    const descriptor = buildRandomMinimalDicomInstanceDescriptor();
    const { filePath } = await generateTestDicomFile(descriptor);

    await sendDicomViaStoreScu({
      networkName: network.getName(),
      calledAet: ORTHANC_AET,
      calledHost: NETWORK_ALIAS,
      calledPort: DICOM_PORT,
      callingAet: CALLING_AET,
      filePath,
    });

    await vi.waitFor(
      () => {
        expect(placeholderController.getLastReceivedMessage()).toBeDefined();
      },
      { timeout: 40_000, interval: 500 },
    );

    expect(placeholderController.getLastReceivedMessage()).toEqual({
      schemaVersion: '1.0',
      remoteAet: CALLING_AET,
      dicom: {
        studyInstanceUid: descriptor.studyInstanceUid,
        seriesInstanceUid: descriptor.seriesInstanceUid,
        sopInstanceUid: descriptor.sopInstanceUid,
      },
      convertedFile: {
        objectStorageKey: `imagens-convertidas/${descriptor.sopInstanceUid}.png`,
        contentType: 'image/png',
      },
      convertedAt: expect.any(String),
    });

    // Confirma que a imagem gravada no Object Storage é uma prévia PNG
    // *de fato* convertida pelo Orthanc a partir do DICOM real (assinatura
    // PNG nos primeiros bytes) — não um stub, diferente de
    // `imaging-gateway.e2e-spec.ts`.
    const stored = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `imagens-convertidas/${descriptor.sopInstanceUid}.png`,
      }),
    );
    const storedBytes = Buffer.from(await stored.Body!.transformToByteArray());
    expect(storedBytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }, 90_000);
});
