import { S3Client } from '@aws-sdk/client-s3';
import type { ObjectStorageConfig } from './object-storage-config.js';

/**
 * Tokens de injeção internos (conexão real `S3Client` + config resolvida).
 * Deliberadamente **não** reexportados por `index.ts` (barrel público de
 * `src/object-storage/`) — mesma disciplina já aplicada a `REDIS_CONNECTION`
 * (`src/redis/redis-connection.ts`, BE-05) e `KYSELY_CONNECTION`
 * (`src/database/kysely-connection.ts`, correção de `QA-BUG-002`, BE-03):
 * o Object Storage guarda laudo/imagem de paciente, e um cliente S3 de uso
 * geral exposto livremente a qualquer provider do NestJS permitiria, numa
 * implementação futura descuidada, ler/escrever qualquer objeto do bucket
 * por fora de `ObjectStorageService` — inclusive contornando a garantia de
 * "acesso só via URL assinada de curta duração" (GUARDRAILS.md item 23) ao
 * chamar `GetObjectCommand` diretamente sem passar por
 * `getReadSignedUrl`/expiração. Só `object-storage.service.ts` e
 * `object-storage.module.ts` (mesmo diretório) referenciam estes símbolos.
 */
export const OBJECT_STORAGE_CLIENT = Symbol('OBJECT_STORAGE_CLIENT');
export const OBJECT_STORAGE_CONFIG = Symbol('OBJECT_STORAGE_CONFIG');

/**
 * Cria a instância real do `S3Client` — só chamada por `ObjectStorageModule`.
 * `credentials` fica `undefined` quando não há chave explícita em config
 * (produção): o SDK resolve pela cadeia padrão (IAM role da task ECS,
 * `DEPLOY.md` §3.1) — nenhum secret literal é lido/atribuído aqui.
 */
export function createS3Client(config: ObjectStorageConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
        : undefined,
  });
}
