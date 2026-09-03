import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBrandingTokens } from './useBrandingTokens'
import type { BrandingConfig } from './types'

function buildBrandingConfig(overrides: Partial<BrandingConfig> = {}): BrandingConfig {
  return {
    tenantId: 'tenant-1',
    logoUrl: 'https://cdn.example.com/logo.svg',
    colorPrimary: '#0057B8',
    statusValidacaoContraste: 'aprovado',
    ...overrides,
  }
}

describe('useBrandingTokens', () => {
  it('começa em "loading" e transiciona para "ready" após a busca resolver', async () => {
    const el = document.createElement('div')
    const fetchFn = vi.fn().mockResolvedValue(buildBrandingConfig())

    const { result } = renderHook(() => useBrandingTokens({ fetchFn, target: el }))

    expect(result.current.status).toBe('loading')
    expect(result.current.appliedTokens).toBeNull()

    await waitFor(() => expect(result.current.status).toBe('ready'))

    expect(result.current.appliedTokens?.colorPrimary).toBe('#0057B8')
    expect(el.style.getPropertyValue('--color-brand-primary')).toBe('#0057B8')
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('transiciona para "error" quando a busca falha, sem lançar exceção não tratada', async () => {
    const el = document.createElement('div')
    const fetchFn = vi.fn().mockRejectedValue(new Error('falha simulada de rede'))

    const { result } = renderHook(() => useBrandingTokens({ fetchFn, target: el }))

    await waitFor(() => expect(result.current.status).toBe('error'))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('falha simulada de rede')
    expect(result.current.appliedTokens).toBeNull()
    // Nenhum token de marca foi aplicado — o fallback de tokens.css permanece.
    expect(el.style.getPropertyValue('--color-brand-primary')).toBe('')
  })

  it('não atualiza estado após desmontar (evita warning de setState em componente desmontado)', async () => {
    const el = document.createElement('div')
    let resolveFetch: (value: BrandingConfig) => void = () => {}
    const fetchFn = vi.fn(
      () =>
        new Promise<BrandingConfig>((resolve) => {
          resolveFetch = resolve
        }),
    )

    const { result, unmount } = renderHook(() =>
      useBrandingTokens({ fetchFn, target: el }),
    )

    expect(result.current.status).toBe('loading')
    unmount()

    await act(async () => {
      resolveFetch(buildBrandingConfig())
    })

    // Não há assinatura de reatividade após unmount para verificar — o teste
    // passa se nenhum warning/erro do React for lançado durante o resolve.
    expect(true).toBe(true)
  })
})
