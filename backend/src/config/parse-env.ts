/**
 * Helpers de parsing de variável de ambiente **compartilhados** por toda
 * configuração de infraestrutura (`src/redis/redis-config.ts`,
 * `src/object-storage/object-storage-config.ts`, e qualquer config futura
 * do mesmo tipo). Extraído nesta correção (achado de revisão pós-
 * implementação de BE-08) porque `parsePositiveInt` estava duplicado
 * literalmente entre `redis-config.ts` (BE-05) e `object-storage-config.ts`
 * (BE-08) — mesmo corpo, mesmo formato de mensagem — o que criava risco de
 * divergência silenciosa entre os dois validadores ao longo do tempo.
 *
 * `src/config/` não é um bounded context (`SDD.md` §2.1) nem tem estado —
 * são funções puras, sem dependência de NestJS, sem necessidade de módulo
 * de DI. A regra de lint de fronteira de módulo (`no-deep-module-import`)
 * só avalia `src/modules/<nome>/` — não se aplica aqui.
 */

/**
 * Exige um inteiro positivo (`> 0`). String vazia/`undefined` usa
 * `fallback`; qualquer outro valor inválido (não numérico, não inteiro,
 * `<= 0`) lança erro explícito — nenhuma configuração inválida é aceita
 * silenciosamente (`TASK.md` §1.1).
 */
export function parsePositiveInt(value: string | undefined, envName: string, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `${envName} inválido: "${value}" — precisa ser um inteiro positivo (TASK.md §1.1, nenhuma configuração inválida é aceita silenciosamente).`,
    );
  }
  return parsed;
}

/**
 * Boolean **estrito**: só aceita literalmente `"true"` ou `"false"`.
 * String vazia/`undefined` usa `fallback`; qualquer outro valor (ex.:
 * `"True"`, `"1"`, `"yes"`) lança erro explícito — mesma filosofia de
 * `parsePositiveInt`, para não mascarar um valor de configuração
 * provavelmente errado atrás de um `false` silencioso (achado de revisão
 * pós-implementação de BE-08: um valor não reconhecido de
 * `OBJECT_STORAGE_FORCE_PATH_STYLE` resolvendo para `false` sem aviso
 * causaria falha confusa do SDK contra um provedor path-style-only, em vez
 * de um erro de configuração claro na inicialização).
 */
export function parseStrictBoolean(value: string | undefined, envName: string, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(
    `${envName} inválido: "${value}" — precisa ser exatamente "true" ou "false" (TASK.md §1.1, nenhuma configuração inválida é aceita silenciosamente).`,
  );
}
