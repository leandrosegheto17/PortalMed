import { Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import type { S3Client } from '@aws-sdk/client-s3';
import { createS3Client, OBJECT_STORAGE_CLIENT, OBJECT_STORAGE_CONFIG } from './s3-client.js';
import { loadObjectStorageConfig } from './object-storage-config.js';
import { ObjectStorageService } from './object-storage.service.js';

/**
 * Módulo de infraestrutura transversal (BE-08, `TASK.md`) — não é um
 * bounded context (`SDD.md` §2.1); mesma categoria de `src/database/`,
 * `src/redis/`, `src/queue/` (BE-01 a BE-05). Fornece `ObjectStorageService`
 * — único ponto de acesso exposto pelo barrel público — sobre o bucket S3
 * criptografado SSE-KMS/região Brasil já provisionado pelo DevOps
 * (`infra/modules/object-storage/`, `DEPLOY.md` §3).
 *
 * Configuração sempre via env (`loadObjectStorageConfig`,
 * `object-storage-config.ts`) — nunca hardcoded (`TASK.md` §1.1).
 *
 * Consumidores futuros: BE-07 (Imaging Gateway grava imagem convertida),
 * BE-21/BE-22 (exibição de laudo/imagem), BE-23 (download com URL assinada
 * + auditoria) — nenhuma lógica de negócio dessas tarefas é implementada
 * aqui.
 */
@Module({
  providers: [
    {
      provide: OBJECT_STORAGE_CONFIG,
      useFactory: () => loadObjectStorageConfig(),
    },
    {
      provide: OBJECT_STORAGE_CLIENT,
      useFactory: (config: ReturnType<typeof loadObjectStorageConfig>) => createS3Client(config),
      inject: [OBJECT_STORAGE_CONFIG],
    },
    ObjectStorageService,
  ],
  exports: [ObjectStorageService],
})
export class ObjectStorageModule implements OnModuleDestroy {
  constructor(@Inject(OBJECT_STORAGE_CLIENT) private readonly client: unknown) {}

  onModuleDestroy(): void {
    (this.client as S3Client | undefined)?.destroy?.();
  }
}
