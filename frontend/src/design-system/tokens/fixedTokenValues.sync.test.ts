import { describe, expect, it } from 'vitest'
// Importação `?raw`: recurso nativo do Vite/Vitest para importar o conteúdo
// textual de um arquivo em vez de processá-lo como módulo/CSS.
// eslint-disable-next-line import/no-unresolved
import tokensCss from './tokens.css?raw'
import { FIXED_TOKEN_VALUES } from './fixedTokenValues'

/**
 * Guarda de sincronização: `fixedTokenValues.ts` (fonte de verdade usada pelo
 * algoritmo de contraste) e `tokens.css` (fonte de verdade usada pela
 * estilização) precisam declarar exatamente os mesmos valores hex para os
 * tokens fixos (Camada 2). Este teste falha o build se alguém alterar um
 * arquivo sem replicar no outro.
 */
describe('sincronia entre fixedTokenValues.ts e tokens.css', () => {
  const cssCustomPropertyByToken: Record<keyof typeof FIXED_TOKEN_VALUES, string> = {
    colorTextPrimary: '--color-text-primary',
    colorBgDefault: '--color-bg-default',
    colorSuccess: '--color-success',
    colorError: '--color-error',
    colorWarning: '--color-warning',
    colorInfo: '--color-info',
  }

  it.each(Object.entries(FIXED_TOKEN_VALUES))(
    '%s tem o mesmo valor hex em tokens.css',
    (tokenName, expectedHex) => {
      const cssProperty =
        cssCustomPropertyByToken[tokenName as keyof typeof FIXED_TOKEN_VALUES]
      const pattern = new RegExp(`${cssProperty}:\\s*(#[0-9a-fA-F]{3,6})\\s*;`)
      const match = tokensCss.match(pattern)

      expect(
        match,
        `propriedade CSS "${cssProperty}" não encontrada em tokens.css`,
      ).not.toBeNull()
      expect(match?.[1].toLowerCase()).toBe(expectedHex.toLowerCase())
    },
  )
})
