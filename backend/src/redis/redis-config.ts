import { parsePositiveInt, parseStrictBoolean } from '../config/parse-env.js';

/**
 * BE-05 (`TASK.md`) — toda configuração de Redis (host, porta, senha, TLS,
 * TTL de inatividade de sessão, prefixo de chave) vem de env/config, nunca
 * hardcoded (`TASK.md` §1.1). `loadRedisConfig` recebe o objeto de env
 * explicitamente (default `process.env`) em vez de lê-lo direto, para ser
 * testável sem mutar o ambiente do processo (mesmo padrão de
 * `tenant-context.spec.ts`/testes unitários já existentes no projeto).
 *
 * `parsePositiveInt`/`parseStrictBoolean` vêm de `../config/parse-env.js`
 * — compartilhados com `object-storage-config.ts` (BE-08) desde a
 * correção de duplicação/validação lenient apontada na revisão
 * pós-implementação de BE-08 (fix-loop, tentativa 2 de 2: `REDIS_TLS`
 * usava o padrão antigo `env.REDIS_TLS === 'true'` — um valor não
 * reconhecido como `"True"`/`"1"`/`"yes"` caía silenciosamente em
 * `tls: false`, estabelecendo conexão Redis não criptografada carregando
 * dado de sessão sem nenhum erro no startup, mesmo anti-padrão já
 * corrigido em `OBJECT_STORAGE_FORCE_PATH_STYLE`).
 */
export interface RedisConfig {
  host: string;
  port: number;
  password: string | undefined;
  tls: boolean;
  /**
   * Prefixo de toda chave própria da aplicação no Redis (ex.: sessão,
   * BE-14) — ver `session-key.ts`. Independente de `bullmqPrefix` abaixo,
   * já que o BullMQ gerencia sua própria convenção interna de chaves.
   */
  keyPrefix: string;
  /**
   * RF-04 (`TASK.md` §1.7) — timeout de sessão por inatividade, default 15
   * minutos (900s). Valor "a confirmar" no `PRD-TECNICO.md`, tratado como
   * configurável (nunca hardcoded) mesmo não tendo consumidor nesta tarefa
   * — quem usa é BE-14 (TTL deslizante da sessão no Redis).
   */
  sessionInactivityTtlSeconds: number;
  /** Prefixo de chave (`opções prefix`) usado pelo Queue/Worker do BullMQ. */
  bullmqPrefix: string;
}

const DEFAULTS = {
  host: 'localhost',
  port: 6379,
  tls: false,
  keyPrefix: 'portalmed:dev',
  sessionInactivityTtlSeconds: 900,
  bullmqPrefix: 'portalmed:bullmq:dev',
} as const;

export function loadRedisConfig(
  env: Partial<Record<string, string | undefined>> = process.env,
): RedisConfig {
  return {
    host: env.REDIS_HOST || DEFAULTS.host,
    port: parsePositiveInt(env.REDIS_PORT, 'REDIS_PORT', DEFAULTS.port),
    password: env.REDIS_PASSWORD || undefined,
    tls: parseStrictBoolean(env.REDIS_TLS, 'REDIS_TLS', DEFAULTS.tls),
    keyPrefix: env.REDIS_KEY_PREFIX || DEFAULTS.keyPrefix,
    sessionInactivityTtlSeconds: parsePositiveInt(
      env.SESSION_INACTIVITY_TTL_SECONDS,
      'SESSION_INACTIVITY_TTL_SECONDS',
      DEFAULTS.sessionInactivityTtlSeconds,
    ),
    bullmqPrefix: env.BULLMQ_PREFIX || DEFAULTS.bullmqPrefix,
  };
}
