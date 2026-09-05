import 'reflect-metadata';
import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import {
  CoreIngestPlaceholderController,
  IntegrationEngineModule,
} from '../../src/integration-engine/index.js';
import { INTEGRATION_ENGINE_CONFIG } from '../../src/integration-engine/integration-engine.tokens.js';
import type { IntegrationEngineConfig } from '../../src/integration-engine/integration-engine-config.js';
import { SERVICE_API_KEY_CONFIG } from '../../src/security/index.js';
// Import direto do script de deploy (fora de src/test/migrations de
// propósito — não é código de runtime da aplicação, ver
// backend/docs/integration-engine.md). `.mjs` puro, sem necessidade de
// compilação — Vitest/Vite resolve módulos ESM simples normalmente.
import { deployHl7v2TestChannel } from '../../integration-engine/deploy-channel.mjs';

const ENGINE_IMAGE = 'nextgenhealthcare/connect:4.5.2';
const TEST_SERVICE_API_KEY = 'chave-de-servico-e2e-nextgen-connect';
const ADMIN_PORT = 8443;
const MLLP_PORT = 6661;
const MLLP_START = 0x0b;
const MLLP_END_1 = 0x1c;
const MLLP_END_2 = 0x0d;

/**
 * Envia uma mensagem HL7 v2.x via MLLP real (sem nenhuma biblioteca HL7 —
 * só o enquadramento MLLP puro, `node:net`). Não aguarda o ACK de volta
 * (fora do escopo deste teste, que valida a normalização/publicação, não o
 * protocolo de confirmação do MLLP) — fecha a conexão assim que o SO
 * confirma o envio ou depois de um timeout curto.
 */
function sendMllpMessage(host: string, port: number, hl7Message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ host, port }, () => {
      const framed = Buffer.concat([
        Buffer.from([MLLP_START]),
        Buffer.from(hl7Message, 'latin1'),
        Buffer.from([MLLP_END_1, MLLP_END_2]),
      ]);
      client.write(framed, () => {
        setTimeout(() => client.destroy(), 500);
      });
    });
    client.on('close', () => resolve());
    client.on('error', reject);
  });
}

function buildOruR01Message(): string {
  return (
    [
      'MSH|^~\\&|LIS|HOSPITAL|PORTALMED|PORTALMED|20260903120000||ORU^R01|MSG00001|P|2.3',
      'PID|1||123456789^^^HOSPITAL^MR||SILVA^JOAO||19800101|M',
      'OBR|1|ORD001|RES001|GLU^GLICOSE^L|||20260903100000',
      'OBX|1|NM|GLU^GLICOSE^L||95|mg/dL|70-99|H|||F',
    ].join('\r') + '\r'
  );
}

/**
 * BE-06 (`TASK.md`) — prova de ponta a ponta contra a Integration Engine
 * **real** (NextGen Connect, self-hosted, ADR-002), efêmera via
 * `testcontainers` — mesmo padrão já usado por BE-02/BE-03/BE-04
 * (PostgreSQL), BE-05 (Redis) e BE-08 (LocalStack): nenhum mock do motor de
 * integração aqui. Cobre exatamente o critério de aceite da tarefa: "Engine
 * deployada [...]; ao menos 1 canal de teste HL7 v2.x [...] configurado;
 * ACL normaliza mensagem de teste para JSON canônico e publica para
 * endpoint interno do core".
 *
 * Fluxo real exercitado: mensagem HL7 v2.x ORU^R01 enviada via socket TCP
 * bruto com enquadramento MLLP → canal real da engine (`TCP Listener` em
 * modo MLLP, port 6661 — mesma porta já reservada em
 * `infra/modules/network/main.tf` para o canal do hospital piloto) →
 * transformer step JavaScript nativo do motor extrai os campos HL7 → HTTP
 * Sender da engine faz `POST` real para o app NestJS real (rodando numa
 * porta efêmera do processo de teste, alcançável pelo container via
 * `host.docker.internal`/`host-gateway`, portável em Docker Desktop e em
 * runner Linux de CI) → `IntegrationEngineController`/`IntegrationEngineAclService`
 * (ACL real) → `POST /internal/ingest` (placeholder, BE-24 futuro).
 *
 * Timeout generoso (a engine é uma aplicação Java que leva ~15-20s para
 * subir, medido empiricamente durante esta implementação) — mesmo
 * raciocínio de `object-storage-infrastructure.e2e-spec.ts` (LocalStack).
 *
 * **BE-09 (`TASK.md`)**: desde esta tarefa, `IntegrationEngineController`
 * exige `@UseGuards(ServiceApiKeyGuard)` — o canal real
 * (`hl7v2-oru-canonical-test-channel.xml`) envia o header
 * `X-Service-Api-Key` (substituído em tempo de deploy pelo mesmo mecanismo
 * de `__CORE_INGEST_ACL_URL__`), com o mesmo valor configurado no app via
 * `SERVICE_API_KEY_CONFIG` sobrescrito abaixo. Este teste prova que o
 * emissor real (a engine) — não só o dublê usado em
 * `integration-engine.e2e-spec.ts` — consegue de fato se autenticar.
 */
describe('BE-06 — canal HL7 v2.x MLLP real da Integration Engine (NextGen Connect, testcontainers)', () => {
  let container: StartedTestContainer;
  let app: INestApplication;
  let placeholderController: CoreIngestPlaceholderController;

  beforeAll(async () => {
    container = await new GenericContainer(ENGINE_IMAGE)
      .withExposedPorts(ADMIN_PORT, MLLP_PORT)
      // Portabilidade Docker Desktop (Windows/Mac, já resolve nativamente)
      // vs. runner Linux de CI (`ubuntu-latest`, exige o mapeamento
      // explícito `host-gateway`, suportado desde Docker Engine 20.10) —
      // sem isso, o HTTP Sender da engine (rodando dentro do container)
      // não alcançaria o app NestJS do processo de teste.
      .withExtraHosts([{ host: 'host.docker.internal', ipAddress: 'host-gateway' }])
      .withWaitStrategy(Wait.forLogMessage(/successfully started/))
      .withStartupTimeout(180_000)
      .start();

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
    // Precisa escutar em todas as interfaces (não só loopback) para ser
    // alcançável a partir do container via host.docker.internal.
    await app.listen(0, '0.0.0.0');
    const address = app.getHttpServer().address();
    const nestPort = typeof address === 'object' && address ? address.port : 0;
    mutableConfig.coreIngestUrl = `http://127.0.0.1:${nestPort}/internal/ingest`;
    placeholderController = moduleRef.get(CoreIngestPlaceholderController);

    const adminBaseUrl = `https://localhost:${container.getMappedPort(ADMIN_PORT)}`;
    const coreIngestAclUrl = `http://host.docker.internal:${nestPort}/internal/integration-engine/messages`;

    await deployHl7v2TestChannel({
      adminBaseUrl,
      adminUsername: 'admin',
      adminPassword: 'admin',
      coreIngestAclUrl,
      allowInsecureTls: true,
      // BE-09 (`TASK.md`) — o `HTTP Sender` do canal real precisa enviar o
      // mesmo header/valor validado pelo `ServiceApiKeyGuard` do app (
      // `SERVICE_API_KEY_CONFIG` sobrescrito acima com o mesmo valor).
      serviceApiKey: TEST_SERVICE_API_KEY,
    });
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('mensagem HL7 v2.x ORU^R01 real via MLLP chega na engine, é normalizada pelo motor e o JSON canônico chega no endpoint interno do core', async () => {
    await sendMllpMessage('127.0.0.1', container.getMappedPort(MLLP_PORT), buildOruR01Message());

    // A cadeia MLLP → engine → HTTP Sender → ACL → /internal/ingest é
    // assíncrona (fila do destino da engine) — poll com timeout generoso em
    // vez de assumir sincronismo.
    const deadline = Date.now() + 20_000;
    let received = placeholderController.getLastReceivedMessage();
    while (!received && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      received = placeholderController.getLastReceivedMessage();
    }

    expect(received).toEqual({
      schemaVersion: '1.0',
      sourceSystem: 'LIS',
      messageType: 'ORU^R01',
      messageControlId: 'MSG00001',
      patient: { identifier: '123456789', name: 'SILVA JOAO' },
      exam: { code: 'GLU', name: 'GLICOSE' },
      result: { value: '95', unit: 'mg/dL' },
      receivedAt: expect.any(String),
    });
  }, 40_000);
});
