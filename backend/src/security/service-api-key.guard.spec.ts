import { describe, expect, it } from 'vitest';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ServiceApiKeyGuard, isServiceApiKeyValid } from './service-api-key.guard.js';
import { SERVICE_API_KEY_HEADER } from './service-api-key.tokens.js';

const EXPECTED_KEY = 'chave-de-servico-de-teste';

/** Fabrica um `ExecutionContext` mínimo o suficiente para `canActivate` — mesmo padrão de dublê leve já usado por `IntegrationEngineAclService.spec.ts` (fetch global como dublê, sem framework de mock adicional). */
function buildContext(headers: Record<string, string | string[] | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
      getResponse: () => undefined,
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

describe('ServiceApiKeyGuard', () => {
  const guard = new ServiceApiKeyGuard({ serviceApiKey: EXPECTED_KEY });

  it('aceita (retorna true) quando o header traz a API key de serviço correta', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: EXPECTED_KEY });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejeita quando o header está ausente', () => {
    const context = buildContext({});

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejeita quando o header está vazio', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: '' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejeita quando a API key é incorreta', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: 'chave-errada' });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rejeita quando a API key correta vem com capitalização diferente (comparação é sensível a case, credencial não é normalizada)', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: EXPECTED_KEY.toUpperCase() });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('não vaza informação sobre o valor esperado na mensagem de erro', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: 'chave-errada' });

    try {
      guard.canActivate(context);
      expect.unreachable('deveria ter lançado UnauthorizedException');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      const message = (error as UnauthorizedException).message;
      expect(message).not.toContain(EXPECTED_KEY);
      expect(message).toMatchInlineSnapshot(`"Credencial de serviço ausente ou inválida."`);
    }
  });

  it('usa só o primeiro valor quando o header chega duplicado (array)', () => {
    const context = buildContext({ [SERVICE_API_KEY_HEADER]: [EXPECTED_KEY, 'chave-errada'] });

    expect(guard.canActivate(context)).toBe(true);
  });
});

describe('isServiceApiKeyValid', () => {
  it('retorna true para valores idênticos', () => {
    expect(isServiceApiKeyValid('abc123', 'abc123')).toBe(true);
  });

  it('retorna false para valores diferentes, incluindo tamanhos diferentes (sem lançar exceção)', () => {
    expect(isServiceApiKeyValid('abc123', 'abc1234')).toBe(false);
    expect(isServiceApiKeyValid('', 'abc123')).toBe(false);
    expect(isServiceApiKeyValid('abc123', '')).toBe(false);
  });
});
