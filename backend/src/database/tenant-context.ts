import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Lançado sempre que código de repositório tenta tocar o banco sem
 * `tenant_id` no contexto de execução — GUARDRAILS.md regra A.2 /
 * `TASK.md` BE-03. É a manifestação em runtime do guard estrutural: nenhuma
 * query roda antes desta checagem.
 */
export class MissingTenantContextError extends Error {
  constructor() {
    super(
      'Nenhum tenant_id no contexto de execução — toda query de repositório ' +
        'de tabela de domínio exige TenantContext.run(tenantId, fn) (ou já ' +
        'estar dentro de um) antes de tocar o banco (GUARDRAILS.md regra ' +
        'A.2 / TASK.md BE-03).',
    );
    this.name = 'MissingTenantContextError';
  }
}

interface TenantStore {
  readonly tenantId: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Contexto de tenant por operação assíncrona, via `AsyncLocalStorage`
 * (nativo do Node — sem dependência externa) — fonte única de verdade de
 * `tenant_id` consumida por `TenantScopedRepository` (BE-03).
 *
 * Quem popula este contexto a partir da sessão autenticada real (cookie
 * `HttpOnly`/Redis, ADR-007) é responsabilidade de uma tarefa futura de
 * Identity & Access (BE-14 sessão / BE-16 RBAC) — este módulo só fornece o
 * mecanismo em si. Não há wiring de middleware HTTP nesta tarefa porque não
 * existe sessão/autenticação implementada ainda (fora do critério de aceite
 * de BE-03, que é "o guard existe e é testado", não "a sessão popula o
 * guard" — decisão de escopo documentada em `backend/docs/
 * tenant-guard-and-rls.md`).
 */
export const TenantContext = {
  /** Executa `fn` com `tenantId` disponível para todo código chamado (síncrono ou assíncrono) dentro dele. */
  run<T>(tenantId: string, fn: () => T): T {
    if (!tenantId) {
      throw new MissingTenantContextError();
    }
    return storage.run({ tenantId }, fn);
  },

  /** `undefined` se nenhum `TenantContext.run(...)` estiver ativo na cadeia de chamada atual. */
  getTenantId(): string | undefined {
    return storage.getStore()?.tenantId;
  },

  /** Como `getTenantId()`, mas lança `MissingTenantContextError` em vez de retornar `undefined`. */
  requireTenantId(): string {
    const tenantId = storage.getStore()?.tenantId;
    if (!tenantId) {
      throw new MissingTenantContextError();
    }
    return tenantId;
  },
};
