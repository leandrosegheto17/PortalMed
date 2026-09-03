import type { ReactNode } from 'react'
import { BrandingTokensContext } from './brandingTokensContext'
import type { UseBrandingTokensOptions } from './useBrandingTokens'
import { useBrandingTokens } from './useBrandingTokens'

export interface BrandTokensProviderProps extends UseBrandingTokensOptions {
  children: ReactNode
}

/**
 * Componente de fundação do design system: busca `BRANDING_CONFIG` (mock-aware,
 * ver `brandingApi.ts`) e aplica os tokens de marca dinâmicos globalmente
 * assim que disponíveis.
 *
 * Renderiza `children` imediatamente (não bloqueia no carregamento da marca) —
 * decisão documentada em `useBrandingTokens.ts`. Expõe o status via contexto
 * (`useBrandingTokensStatus`, em `brandingTokensContext.ts`) para componentes
 * que futuramente queiram reagir a ele (ex.: FE-02, Header institucional),
 * sem forçar essa reação aqui.
 */
export function BrandTokensProvider({ children, ...options }: BrandTokensProviderProps) {
  const brandingTokens = useBrandingTokens(options)

  return (
    <BrandingTokensContext.Provider value={brandingTokens}>
      {children}
    </BrandingTokensContext.Provider>
  )
}
