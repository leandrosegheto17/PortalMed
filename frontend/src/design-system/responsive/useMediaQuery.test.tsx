import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { installMatchMediaMock } from '../../test/matchMedia'
import { useMediaQuery } from './useMediaQuery'

describe('useMediaQuery', () => {
  it('retorna o valor inicial de matches configurado para a query', () => {
    installMatchMediaMock({ '(min-width: 1024px)': true })

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(result.current).toBe(true)
  })

  it('retorna false por padrão para uma query não configurada como match', () => {
    installMatchMediaMock()

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(result.current).toBe(false)
  })

  it('atualiza o valor quando a media query muda (resize simulado)', () => {
    const mock = installMatchMediaMock({ '(min-width: 1024px)': false })
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(result.current).toBe(false)

    act(() => {
      mock.setMatches('(min-width: 1024px)', true)
    })

    expect(result.current).toBe(true)
  })

  it('remove o listener ao desmontar (sem listener pendurado após unmount)', () => {
    const mock = installMatchMediaMock({ '(min-width: 1024px)': false })
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(mock.listenerCount('(min-width: 1024px)')).toBe(1)

    unmount()

    expect(mock.listenerCount('(min-width: 1024px)')).toBe(0)
  })

  it('funciona com a API legada de MediaQueryList (addListener/removeListener, sem addEventListener) — fallback de compatibilidade', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    const legacyMql = {
      media: '(min-width: 1024px)',
      matches: false,
      addListener: (listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeListener: (listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    }
    window.matchMedia = vi.fn(() => legacyMql) as unknown as typeof window.matchMedia

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'))
    expect(result.current).toBe(false)

    act(() => {
      legacyMql.matches = true
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent))
    })
    expect(result.current).toBe(true)

    expect(listeners.size).toBe(1)
    unmount()
    expect(listeners.size).toBe(0)
  })

  it('não quebra e retorna false quando window.matchMedia não está disponível no ambiente', () => {
    const original = window.matchMedia
    // @ts-expect-error — simula um ambiente sem suporte a matchMedia.
    delete window.matchMedia

    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'))

    expect(result.current).toBe(false)

    window.matchMedia = original
  })

  it('re-assina o listener correto ao trocar a string da query em uma nova renderização', () => {
    const mock = installMatchMediaMock({
      '(min-width: 600px)': true,
      '(min-width: 1024px)': false,
    })
    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 600px)' },
    })

    expect(result.current).toBe(true)

    rerender({ query: '(min-width: 1024px)' })

    expect(result.current).toBe(false)
    expect(mock.listenerCount('(min-width: 600px)')).toBe(0)
    expect(mock.listenerCount('(min-width: 1024px)')).toBe(1)
  })
})
