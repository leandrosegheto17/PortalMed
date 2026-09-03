import { parsePositiveInt, parseStrictBoolean } from '../config/parse-env.js';

/**
 * BE-08 (`TASK.md`) — toda configuração do Object Storage (bucket, região,
 * endpoint/estilo de path para provedores S3-compatíveis, credenciais,
 * duração da URL assinada) vem de env/config, nunca hardcoded (`TASK.md`
 * §1.1). `loadObjectStorageConfig` recebe o objeto de env explicitamente
 * (default `process.env`) em vez de lê-lo direto, para ser testável sem
 * mutar o ambiente do processo — mesmo padrão de `redis-config.ts` (BE-05).
 */
export interface ObjectStorageConfig {
  /** Nome do bucket (provisionado via Terraform pelo DevOps, `infra/modules/object-storage/`). */
  bucket: string;
  /**
   * Região de nuvem (ADR-010/GUARDRAILS.md item 24 — obrigatoriamente
   * Brasil). Validada contra `KNOWN_BRAZIL_REGIONS` — ver nota abaixo.
   */
  region: string;
  /**
   * Endpoint customizado do S3 — só usado para provedor S3-compatível
   * self-hosted/local (ex.: LocalStack em teste, `object-storage.md`).
   * `undefined` em produção: o SDK resolve o endpoint padrão da AWS a
   * partir de `region`. **Bloqueado quando `NODE_ENV` é `production`/
   * `staging`** — ver `assertEndpointOverrideAllowed` abaixo (achado de
   * revisão pós-implementação de BE-08).
   */
  endpoint: string | undefined;
  /** Exigido por provedores S3-compatíveis que não suportam virtual-hosted-style (ex.: LocalStack). */
  forcePathStyle: boolean;
  /**
   * Credenciais explícitas — só para desenvolvimento local/teste. Em
   * produção permanecem `undefined` de propósito: o AWS SDK resolve
   * credenciais via a cadeia padrão (IAM role da task ECS, `DEPLOY.md`
   * §3.1 — nenhum secret literal em variável de ambiente).
   */
  accessKeyId: string | undefined;
  secretAccessKey: string | undefined;
  /**
   * Duração (segundos) da URL assinada de leitura quando o chamador não
   * informa um valor explícito. Default 300s (5 min) — "a confirmar" em
   * nenhum artefato de origem (nem `PRD-TECNICO.md`, nem `SDD.md`,
   * `UX-SPEC.md`), então tratado como decisão de detalhe do Backend dentro
   * de sua autoridade (mesmo padrão de `TASK.md` §1.7): configurável via
   * `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS`, nunca hardcoded, documentada
   * em `TASK.md`/`object-storage.md`.
   */
  signedUrlTtlSeconds: number;
}

/**
 * Teto absoluto (não configurável) para qualquer URL assinada de leitura —
 * default ou override explícito do chamador. GUARDRAILS.md item 23/RN
 * correspondente exige "URL assinada de curta duração", nunca uma
 * "praticamente permanente" só porque tecnicamente não é pública: 15
 * minutos é o teto superior da faixa sugerida como razoável para este
 * projeto. Decisão de detalhe do Backend, não configurável por env de
 * propósito — um teto que pudesse ser mudado por variável de ambiente
 * deixaria de ser uma garantia estrutural.
 */
export const MAX_SIGNED_URL_TTL_SECONDS = 15 * 60;

/**
 * Regiões de nuvem no Brasil conhecidas/suportadas por este código (ADR-010
 * exige "região no Brasil", sem comprometer provedor — `DEPLOY.md` §2
 * escolheu AWS `sa-east-1`). Validação em código é defesa em profundidade
 * complementar ao que a infraestrutura como código (Terraform,
 * `infra/modules/object-storage/`) já garante — não a única camada, mesmo
 * raciocínio já aplicado a RLS (ADR-006/SPK-04).
 */
export const KNOWN_BRAZIL_REGIONS = ['sa-east-1'] as const;

/**
 * Valores de `NODE_ENV` que representam um ambiente real (com dado de
 * saúde de verdade) — mesma variável e mesmos valores literais que
 * `infra/environments/{staging,production}/main.tf` já define
 * explicitamente na task definition do ECS (`NODE_ENV = "production"`/
 * `"staging"`), convenção já existente no projeto para diferenciar
 * ambiente real de dev/teste local.
 */
export const PRODUCTION_LIKE_NODE_ENVS = ['production', 'staging'] as const;

const DEFAULTS = {
  region: 'sa-east-1',
  forcePathStyle: false,
  signedUrlTtlSeconds: 300,
} as const;

/**
 * Achado mais sério da revisão pós-implementação de BE-08:
 * `OBJECT_STORAGE_ENDPOINT` sobrescreve o endpoint real do SDK e **ganha
 * prioridade sobre `region`** quando ambos estão setados
 * (`s3-client.ts`/`S3Client`) — então um `.env` mal configurado (ex.:
 * copiado de um setup local com LocalStack) aplicado por engano em
 * `staging`/`production` faria todo o tráfego S3 (upload e geração de URL
 * assinada) ir para um host fora do Brasil/fora da AWS, **contornando
 * silenciosamente** a validação de região feita logo acima
 * (`KNOWN_BRAZIL_REGIONS`), já que essa validação só olha a string
 * `OBJECT_STORAGE_REGION`, não o destino real do tráfego. Falha fechada:
 * `OBJECT_STORAGE_ENDPOINT` só é aceito quando `NODE_ENV` **não** é um dos
 * `PRODUCTION_LIKE_NODE_ENVS` — nenhuma outra variável de ambiente permite
 * desativar esta checagem.
 */
function assertEndpointOverrideAllowed(
  endpoint: string,
  nodeEnv: string | undefined,
): void {
  if (PRODUCTION_LIKE_NODE_ENVS.includes(nodeEnv as (typeof PRODUCTION_LIKE_NODE_ENVS)[number])) {
    throw new Error(
      `OBJECT_STORAGE_ENDPOINT não pode ser definido quando NODE_ENV="${nodeEnv}" — endpoint customizado é permitido só fora de ambiente real (production/staging), para evitar que um .env mal configurado (ex.: copiado de um setup local com LocalStack) redirecione silenciosamente todo o tráfego S3 para fora do Brasil/fora da AWS, contornando a validação de OBJECT_STORAGE_REGION (ADR-010/GUARDRAILS.md item 24). Remova OBJECT_STORAGE_ENDPOINT deste ambiente.`,
    );
  }
}

export function loadObjectStorageConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): ObjectStorageConfig {
  const bucket = env.OBJECT_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error(
      'OBJECT_STORAGE_BUCKET obrigatório — nome do bucket provisionado pelo DevOps (infra/modules/object-storage/), nunca hardcoded (TASK.md §1.1).',
    );
  }

  const region = env.OBJECT_STORAGE_REGION || DEFAULTS.region;
  if (!KNOWN_BRAZIL_REGIONS.includes(region as (typeof KNOWN_BRAZIL_REGIONS)[number])) {
    throw new Error(
      `OBJECT_STORAGE_REGION inválido: "${region}" — ADR-010/GUARDRAILS.md item 24 exigem região de nuvem no Brasil; regiões conhecidas: ${KNOWN_BRAZIL_REGIONS.join(', ')}. Provisionar fora do Brasil exige nova decisão explícita do CTO, não uma mudança silenciosa de config.`,
    );
  }

  const endpoint = env.OBJECT_STORAGE_ENDPOINT || undefined;
  if (endpoint) {
    assertEndpointOverrideAllowed(endpoint, env.NODE_ENV);
  }

  const signedUrlTtlSeconds = parsePositiveInt(
    env.OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS,
    'OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS',
    DEFAULTS.signedUrlTtlSeconds,
  );
  if (signedUrlTtlSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
    throw new Error(
      `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS inválido: ${signedUrlTtlSeconds}s excede o teto de ${MAX_SIGNED_URL_TTL_SECONDS}s (15 min) — acesso a arquivo de laudo/imagem é sempre via URL assinada de curta duração, nunca "quase permanente" (GUARDRAILS.md item 23).`,
    );
  }

  return {
    bucket,
    region,
    endpoint,
    forcePathStyle: parseStrictBoolean(
      env.OBJECT_STORAGE_FORCE_PATH_STYLE,
      'OBJECT_STORAGE_FORCE_PATH_STYLE',
      DEFAULTS.forcePathStyle,
    ),
    accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY_ID || undefined,
    secretAccessKey: env.OBJECT_STORAGE_SECRET_ACCESS_KEY || undefined,
    signedUrlTtlSeconds,
  };
}
