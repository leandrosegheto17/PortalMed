import { createContext, useContext } from 'react'
import type { UseBrandingTokensResult } from './useBrandingTokens'

/**
 * Contexto separado do componente `BrandTokensProvider` (arquivo próprio)
 * para manter cada arquivo exportando um único tipo de coisa — evita o aviso
 * de lint `react(only-export-components)` (Fast Refresh do React só recarrega
 * de forma confiável arquivos que exportam somente componentes).
 */
export const BrandingTokensContext = createContext<UseBrandingTokensResult | null>(null)

/** Acesso ao status/resultado da busca de branding a partir de qualquer componente descendente de `BrandTokensProvider`. */
export function useBrandingTokensStatus(): UseBrandingTokensResult {
  const context = useContext(BrandingTokensContext)
  if (!context) {
    throw new Error(
      'useBrandingTokensStatus precisa ser usado dentro de <BrandTokensProvider>.',
    )
  }
  return context
}
