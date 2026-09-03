import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { installMatchMediaMock } from '../../test/matchMedia'
import { MEDIA_QUERIES } from './breakpoints'
import { useBreakpoint } from './useBreakpoint'

describe('useBreakpoint (UX-SPEC.md §6.1)', () => {
  it('resolve "mobile" quando nenhuma media query min-width bate', () => {
    installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: false,
      [MEDIA_QUERIES.tabletUp]: false,
    })

    const { result } = renderHook(() => useBreakpoint())

    expect(result.current).toBe('mobile')
  })

  it('resolve "tablet" quando tabletUp bate mas desktop não', () => {
    installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: false,
      [MEDIA_QUERIES.tabletUp]: true,
    })

    const { result } = renderHook(() => useBreakpoint())

    expect(result.current).toBe('tablet')
  })

  it('resolve "desktop" quando ambas as media queries batem (desktop tem prioridade)', () => {
    installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: true,
      [MEDIA_QUERIES.tabletUp]: true,
    })

    const { result } = renderHook(() => useBreakpoint())

    expect(result.current).toBe('desktop')
  })

  it('reage a mudança de breakpoint em tempo real (resize simulado, mobile -> desktop)', () => {
    const mock = installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: false,
      [MEDIA_QUERIES.tabletUp]: false,
    })

    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')

    act(() => {
      mock.setMatches(MEDIA_QUERIES.tabletUp, true)
      mock.setMatches(MEDIA_QUERIES.desktop, true)
    })

    expect(result.current).toBe('desktop')
  })

  it('reage a mudança de breakpoint em tempo real (resize simulado, desktop -> mobile)', () => {
    const mock = installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: true,
      [MEDIA_QUERIES.tabletUp]: true,
    })

    const { result } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('desktop')

    act(() => {
      mock.setMatches(MEDIA_QUERIES.desktop, false)
      mock.setMatches(MEDIA_QUERIES.tabletUp, false)
    })

    expect(result.current).toBe('mobile')
  })
})
