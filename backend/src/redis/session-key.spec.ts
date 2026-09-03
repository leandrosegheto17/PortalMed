import { describe, expect, it } from 'vitest';
import { buildSessionRedisKey } from './session-key.js';

/**
 * BE-05 (`TASK.md`) — estrutura de chave de sessão. A criação de sessão em
 * si (TTL deslizante, expiração por inatividade, logout) é BE-14; esta
 * função só define e documenta a convenção de nome de chave que BE-14 vai
 * consumir (ADR-007: sessão de usuário final em Redis, nunca JWT stateless).
 */
describe('buildSessionRedisKey', () => {
  it('monta a chave no formato "{prefixo}:session:{tenantId}:{sessionId}" (isolamento multi-tenant, ADR-004)', () => {
    const key = buildSessionRedisKey('portalmed:dev', {
      tenantId: 'tenant-a',
      sessionId: 'session-123',
    });

    expect(key).toBe('portalmed:dev:session:tenant-a:session-123');
  });

  it('produz chaves diferentes para tenants diferentes com o mesmo sessionId (nunca colidem entre tenants)', () => {
    const keyTenantA = buildSessionRedisKey('portalmed:dev', {
      tenantId: 'tenant-a',
      sessionId: 'same-session-id',
    });
    const keyTenantB = buildSessionRedisKey('portalmed:dev', {
      tenantId: 'tenant-b',
      sessionId: 'same-session-id',
    });

    expect(keyTenantA).not.toBe(keyTenantB);
  });

  it('lança erro se o prefixo estiver vazio (nunca monta chave sem namespace de ambiente)', () => {
    expect(() =>
      buildSessionRedisKey('', { tenantId: 'tenant-a', sessionId: 'session-123' }),
    ).toThrow(/prefixo/i);
  });

  it('lança erro se tenantId estiver vazio (GUARDRAILS.md — isolamento multi-tenant nunca opcional)', () => {
    expect(() =>
      buildSessionRedisKey('portalmed:dev', { tenantId: '', sessionId: 'session-123' }),
    ).toThrow(/tenantId/);
  });

  it('lança erro se sessionId estiver vazio', () => {
    expect(() =>
      buildSessionRedisKey('portalmed:dev', { tenantId: 'tenant-a', sessionId: '' }),
    ).toThrow(/sessionId/);
  });
});
