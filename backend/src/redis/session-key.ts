/**
 * BE-05 (`TASK.md`) — estrutura de chave de sessão no Redis (ADR-007:
 * sessão de usuário final vive em Redis, revogável, nunca JWT stateless).
 *
 * A criação de sessão em si (TTL deslizante, expiração por inatividade de
 * 15 min default/`TASK.md` §1.7, logout) é escopo de **BE-14**, tarefa
 * futura — esta função só define e documenta a **convenção de nome de
 * chave** que BE-14 vai consumir, para que a decisão de formato não fique
 * implícita/espalhada quando a lógica de sessão for implementada.
 *
 * Formato: `{prefixo}:session:{tenantId}:{sessionId}`.
 *
 * - `{prefixo}` vem de `REDIS_KEY_PREFIX` (`redis-config.ts`) — isola
 *   ambientes que porventura compartilhem a mesma instância/cluster Redis
 *   (ex.: dev local); defesa em profundidade barata mesmo quando cada
 *   ambiente real tem sua própria instância dedicada (`SDD.md` §7.5).
 * - `{tenantId}` **sempre** presente e nunca opcional — multi-tenancy é a
 *   "regra de maior severidade" do projeto (`TASK.md` §1.3/ADR-004); uma
 *   chave de sessão sem `tenantId` no próprio nome tornaria trivial um
 *   acesso cross-tenant por adivinhação de `sessionId` sozinho. Incluir o
 *   `tenantId` na chave não substitui nenhuma outra camada de segurança de
 *   sessão (ex.: `sessionId` ainda precisa ser um valor opaco de alta
 *   entropia — decisão de BE-14), mas garante que uma mesma string de
 *   `sessionId` jamais colide entre tenants diferentes.
 * - `{sessionId}` é o identificador opaco da sessão (gerado por BE-14).
 */
export interface SessionKeyParams {
  tenantId: string;
  sessionId: string;
}

export function buildSessionRedisKey(
  keyPrefix: string,
  { tenantId, sessionId }: SessionKeyParams,
): string {
  if (!keyPrefix) {
    throw new Error(
      'buildSessionRedisKey: prefixo de chave (REDIS_KEY_PREFIX) não pode ser vazio.',
    );
  }
  if (!tenantId) {
    throw new Error(
      'buildSessionRedisKey: tenantId é obrigatório — chave de sessão nunca é montada sem isolamento multi-tenant (TASK.md §1.3/ADR-004).',
    );
  }
  if (!sessionId) {
    throw new Error('buildSessionRedisKey: sessionId é obrigatório.');
  }

  return `${keyPrefix}:session:${tenantId}:${sessionId}`;
}
