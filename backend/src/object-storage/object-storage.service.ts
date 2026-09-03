import { Inject, Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { MAX_SIGNED_URL_TTL_SECONDS, type ObjectStorageConfig } from './object-storage-config.js';
import { OBJECT_STORAGE_CLIENT, OBJECT_STORAGE_CONFIG } from './s3-client.js';

/**
 * BE-08 (`TASK.md`) — única forma sancionada de ler/escrever objeto no
 * bucket de laudo/imagem. `getReadSignedUrl` é o **único** caminho de
 * leitura: não existe (e não deve existir) nenhum método que devolva uma
 * URL pública permanente (GUARDRAILS.md item 23) — a própria classe não
 * conhece a forma de uma URL "pública" do bucket, só sabe pedir ao SDK uma
 * URL assinada com expiração.
 *
 * `putObject` é uma abstração mínima de upload, usada por tarefas futuras
 * (BE-07, Imaging Gateway armazenando imagem convertida) — nenhuma lógica
 * de negócio de qual bucket-key usar (convenção de nome, prefixo por
 * tenant) é decidida aqui; é o chamador (BE-07/BE-21/BE-22/BE-23) que
 * decide a `key`, mesmo espírito de `EXAM_FILE.object_storage_key` já ser
 * uma string opaca no `SDD.md` §5.
 */
@Injectable()
export class ObjectStorageService {
  constructor(
    @Inject(OBJECT_STORAGE_CLIENT) private readonly client: S3Client,
    @Inject(OBJECT_STORAGE_CONFIG) private readonly config: ObjectStorageConfig,
  ) {}

  /**
   * Gera uma URL assinada de leitura (GET) de curta duração para `key`.
   * `expirySecondsOverride`, se informado, precisa ser um inteiro positivo
   * e nunca pode exceder `MAX_SIGNED_URL_TTL_SECONDS` (15 min) — teto não
   * configurável, GUARDRAILS.md item 23.
   */
  async getReadSignedUrl(key: string, expirySecondsOverride?: number): Promise<string> {
    if (!key) {
      throw new Error('getReadSignedUrl: key obrigatória para gerar URL assinada de leitura.');
    }

    const expiresIn = expirySecondsOverride ?? this.config.signedUrlTtlSeconds;
    if (!Number.isInteger(expiresIn) || expiresIn <= 0) {
      throw new Error(
        `getReadSignedUrl: expiração inválida (${expiresIn}s) — precisa ser um inteiro positivo.`,
      );
    }
    if (expiresIn > MAX_SIGNED_URL_TTL_SECONDS) {
      throw new Error(
        `getReadSignedUrl: expiração (${expiresIn}s) excede o teto de ${MAX_SIGNED_URL_TTL_SECONDS}s (15 min) — acesso a arquivo de laudo/imagem é sempre via URL assinada de curta duração, nunca URL pública/quase permanente (GUARDRAILS.md item 23).`,
      );
    }

    const command = new GetObjectCommand({ Bucket: this.config.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Upload básico. `ServerSideEncryption: 'aws:kms'` é reforçado aqui em
   * runtime como defesa em profundidade — a bucket policy real
   * (`infra/modules/object-storage/main.tf`, `DenyUnEncryptedObjectUploads`)
   * já nega qualquer `PutObject` sem esse algoritmo; esta camada de
   * aplicação só evita depender exclusivamente da rejeição no servidor.
   */
  async putObject(key: string, body: Buffer | Uint8Array | string, contentType?: string): Promise<void> {
    if (!key) {
      throw new Error('putObject: key obrigatória para upload.');
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
      }),
    );
  }
}
