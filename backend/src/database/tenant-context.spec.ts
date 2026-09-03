import { MissingTenantContextError, TenantContext } from './tenant-context.js';

/**
 * BE-03 (`TASK.md`) — unitário, sem banco: cobre só o mecanismo de contexto
 * (`AsyncLocalStorage`) que `TenantScopedRepository` usa para decidir, antes
 * de qualquer query, se há `tenant_id` disponível. O comportamento real do
 * guard contra o banco (RLS + filtro de aplicação) é coberto por
 * `test/database/tenant-guard-and-rls.e2e-spec.ts` com PostgreSQL real —
 * este arquivo não duplica isso, só a lógica pura do contexto em si.
 */
describe('TenantContext', () => {
  it('getTenantId() retorna undefined fora de qualquer TenantContext.run()', () => {
    expect(TenantContext.getTenantId()).toBeUndefined();
  });

  it('requireTenantId() lança MissingTenantContextError fora de TenantContext.run()', () => {
    expect(() => TenantContext.requireTenantId()).toThrow(MissingTenantContextError);
  });

  it('dentro de run(tenantId, fn), getTenantId()/requireTenantId() retornam o tenantId informado', () => {
    TenantContext.run('tenant-a', () => {
      expect(TenantContext.getTenantId()).toBe('tenant-a');
      expect(TenantContext.requireTenantId()).toBe('tenant-a');
    });
  });

  it('propaga o tenantId para código assíncrono chamado dentro de run()', async () => {
    await TenantContext.run('tenant-b', async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(TenantContext.getTenantId()).toBe('tenant-b');
    });
  });

  it('fora de run(), o contexto volta a ser undefined', () => {
    TenantContext.run('tenant-c', () => {
      expect(TenantContext.getTenantId()).toBe('tenant-c');
    });
    expect(TenantContext.getTenantId()).toBeUndefined();
  });

  it('run("") lança MissingTenantContextError — tenantId vazio nunca é um contexto válido', () => {
    expect(() => TenantContext.run('', () => undefined)).toThrow(
      MissingTenantContextError,
    );
  });

  it('duas execuções concorrentes com tenants diferentes não vazam contexto entre si (garantia de AsyncLocalStorage)', async () => {
    const observed: string[] = [];

    async function runFor(tenantId: string, delayMs: number) {
      await TenantContext.run(tenantId, async () => {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        observed.push(`${tenantId}:${TenantContext.getTenantId()}`);
      });
    }

    await Promise.all([runFor('tenant-x', 10), runFor('tenant-y', 0)]);

    expect(observed).toContain('tenant-x:tenant-x');
    expect(observed).toContain('tenant-y:tenant-y');
  });

  it('MissingTenantContextError tem mensagem explicando o guard (GUARDRAILS.md regra A.2)', () => {
    try {
      TenantContext.requireTenantId();
      throw new Error('deveria ter lançado MissingTenantContextError');
    } catch (error) {
      expect(error).toBeInstanceOf(MissingTenantContextError);
      expect((error as Error).message).toMatch(/tenant_id/);
      expect((error as Error).name).toBe('MissingTenantContextError');
    }
  });
});
