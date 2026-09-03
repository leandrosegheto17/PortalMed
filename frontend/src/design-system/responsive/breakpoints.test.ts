import { describe, expect, it } from 'vitest'
import { BREAKPOINTS, MEDIA_QUERIES } from './breakpoints'

describe('BREAKPOINTS/MEDIA_QUERIES (UX-SPEC.md §6.1)', () => {
  it('reflete os valores de UX-SPEC.md §6.1 (mobile até 599px, tablet 600-1023px, desktop >= 1024px)', () => {
    expect(BREAKPOINTS.mobileMax).toBe(599)
    expect(BREAKPOINTS.tabletMin).toBe(600)
    expect(BREAKPOINTS.tabletMax).toBe(1023)
    expect(BREAKPOINTS.desktopMin).toBe(1024)
  })

  it('cobre o intervalo completo sem lacuna nem sobreposição entre mobile e tablet', () => {
    expect(BREAKPOINTS.tabletMin).toBe(BREAKPOINTS.mobileMax + 1)
  })

  it('cobre o intervalo completo sem lacuna nem sobreposição entre tablet e desktop', () => {
    expect(BREAKPOINTS.desktopMin).toBe(BREAKPOINTS.tabletMax + 1)
  })

  it('gera exatamente as strings de media query esperadas', () => {
    expect(MEDIA_QUERIES.mobile).toBe('(max-width: 599px)')
    expect(MEDIA_QUERIES.tablet).toBe('(min-width: 600px) and (max-width: 1023px)')
    expect(MEDIA_QUERIES.tabletUp).toBe('(min-width: 600px)')
    expect(MEDIA_QUERIES.desktop).toBe('(min-width: 1024px)')
  })
})
