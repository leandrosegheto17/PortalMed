import { useEffect, useRef, useState } from 'react'
import type { AppliedBrandTokens } from './applyBrandTokens'
import { applyBrandTokens } from './applyBrandTokens'
import { fetchBrandingConfig } from './brandingApi'
import type { BrandingConfig } from './types'

export type BrandingTokensStatus = 'loading' | 'ready' | 'error'

export interface UseBrandingTokensResult {
  status: BrandingTokensStatus
  appliedTokens: AppliedBrandTokens | null
  error: Error | null
}

export interface UseBrandingTokensOptions {
  /**
   * Injeção de dependência para teste/reuso — por padrão usa
   * `fetchBrandingConfig` (mock-aware, ver `brandingApi.ts`).
   */
  fetchFn?: () => Promise<BrandingConfig>
  /** Elemento onde os custom properties são aplicados — por padrão `document.documentElement`. */
  target?: HTMLElement
}

/**
 * Busca `BRANDING_CONFIG` (hoje via mock, ver `brandingApi.ts`) e aplica os
 * tokens de marca dinâmicos assim que disponíveis (`applyBrandTokens.ts`).
 *
 * Não bloqueia a renderização da árvore enquanto carrega: o UX-SPEC.md não
 * define uma tela/estado dedicado para "branding carregando" (é
 * infraestrutural, não uma das 35 telas do §4) — enquanto a marca não chega,
 * `tokens.css` já define um fallback acessível para `--color-brand-primary`
 * (ver comentário no próprio arquivo), então a aplicação permanece legível.
 * Falha ao buscar a marca mantém esse mesmo fallback (não derruba a
 * aplicação) e expõe o erro em `error` para quem quiser tratar/logar.
 */
export function useBrandingTokens(
  options: UseBrandingTokensOptions = {},
): UseBrandingTokensResult {
  const { fetchFn = fetchBrandingConfig, target } = options
  const [status, setStatus] = useState<BrandingTokensStatus>('loading')
  const [appliedTokens, setAppliedTokens] = useState<AppliedBrandTokens | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    setStatus('loading')

    fetchFn()
      .then((branding) => {
        if (!isMountedRef.current) return
        const applied = applyBrandTokens(branding, target)
        setAppliedTokens(applied)
        setStatus('ready')
      })
      .catch((caughtError: unknown) => {
        if (!isMountedRef.current) return
        setError(
          caughtError instanceof Error ? caughtError : new Error(String(caughtError)),
        )
        setStatus('error')
      })

    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, target])

  return { status, appliedTokens, error }
}
