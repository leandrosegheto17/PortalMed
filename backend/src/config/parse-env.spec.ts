import { describe, expect, it } from 'vitest';
import { parsePositiveInt, parseStrictBoolean } from './parse-env.js';

/**
 * Achado de revisão pós-implementação de BE-08 (fix-loop, tentativa 1):
 * `parsePositiveInt` estava duplicado literalmente em
 * `src/redis/redis-config.ts` e `src/object-storage/object-storage-config.ts`
 * — extraído para cá e reutilizado nos dois lugares. `parseStrictBoolean`
 * é novo (substitui o `parseBoolean` lenient que existia só em
 * `object-storage-config.ts`).
 */
describe('parsePositiveInt', () => {
  it('usa o fallback quando o valor é undefined ou string vazia', () => {
    expect(parsePositiveInt(undefined, 'X', 10)).toBe(10);
    expect(parsePositiveInt('', 'X', 10)).toBe(10);
  });

  it('faz parse de um inteiro positivo válido', () => {
    expect(parsePositiveInt('42', 'X', 10)).toBe(42);
  });

  it.each(['abc', '-1', '0', '1.5', 'NaN'])(
    'lança erro explícito, citando o nome da env var, para valor inválido: "%s"',
    (value) => {
      expect(() => parsePositiveInt(value, 'MEU_ENV', 10)).toThrow(/MEU_ENV inválido/);
    },
  );
});

describe('parseStrictBoolean', () => {
  it('usa o fallback quando o valor é undefined ou string vazia', () => {
    expect(parseStrictBoolean(undefined, 'X', false)).toBe(false);
    expect(parseStrictBoolean('', 'X', true)).toBe(true);
  });

  it('aceita literalmente "true"/"false"', () => {
    expect(parseStrictBoolean('true', 'X', false)).toBe(true);
    expect(parseStrictBoolean('false', 'X', true)).toBe(false);
  });

  it.each(['True', 'FALSE', '1', '0', 'yes', 'no'])(
    'lança erro explícito, citando o nome da env var, para valor não reconhecido: "%s"',
    (value) => {
      expect(() => parseStrictBoolean(value, 'MEU_ENV', false)).toThrow(/MEU_ENV inválido/);
    },
  );
});
