import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // BE-07 (`TASK.md`) — `AppModule` agora importa `ImagingGatewayModule`,
    // que por sua vez importa `ObjectStorageModule` (BE-08); o `useFactory`
    // de `ObjectStorageModule` (`loadObjectStorageConfig`) falha
    // explicitamente sem `OBJECT_STORAGE_BUCKET` (decisão de detalhe de
    // BE-08 — nunca um bucket "adivinhado"). Mesmo ajuste já aplicado a
    // `app.module.spec.ts`.
    originalEnv = { ...process.env };
    process.env.OBJECT_STORAGE_BUCKET = 'portalmed-exames-e2e-wiring-test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
    process.env = originalEnv;
  });
});
