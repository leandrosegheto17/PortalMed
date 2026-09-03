import { describe, expect, it } from 'vitest'
import { applyBrandTokens } from './applyBrandTokens'
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

describe('applyBrandTokens', () => {
  it('define --color-brand-primary com a cor recebida, nunca hardcoded', () => {
    const el = document.createElement('div')
    applyBrandTokens(buildBrandingConfig({ colorPrimary: '#7A1F2B' }), el)

    expect(el.style.getPropertyValue('--color-brand-primary')).toBe('#7A1F2B')
  })

  it('define --brand-logo-url a partir da URL recebida, envolvida em url()', () => {
    const el = document.createElement('div')
    applyBrandTokens(
      buildBrandingConfig({ logoUrl: 'https://cdn.example.com/hospital/logo.png' }),
      el,
    )

    expect(el.style.getPropertyValue('--brand-logo-url')).toBe(
      'url("https://cdn.example.com/hospital/logo.png")',
    )
  })

  it('escolhe texto branco sobre uma marca escura', () => {
    const el = document.createElement('div')
    const applied = applyBrandTokens(buildBrandingConfig({ colorPrimary: '#0B2545' }), el)

    expect(applied.contrastText.color).toBe('#FFFFFF')
    expect(applied.contrastText.meetsAA).toBe(true)
    expect(el.style.getPropertyValue('--color-brand-primary-contrast-text')).toBe(
      '#FFFFFF',
    )
  })

  it('escolhe texto escuro sobre uma marca clara', () => {
    const el = document.createElement('div')
    const applied = applyBrandTokens(buildBrandingConfig({ colorPrimary: '#FDE68A' }), el)

    expect(applied.contrastText.meetsAA).toBe(true)
    expect(applied.contrastText.color).not.toBe('#FFFFFF')
    expect(el.style.getPropertyValue('--color-brand-primary-contrast-text')).toBe(
      applied.contrastText.color,
    )
  })

  it('usa document.documentElement como alvo padrão quando nenhum target é passado', () => {
    applyBrandTokens(buildBrandingConfig({ colorPrimary: '#123456' }))

    expect(
      document.documentElement.style.getPropertyValue('--color-brand-primary'),
    ).toBe('#123456')

    // limpeza para não vazar estado entre testes
    document.documentElement.style.removeProperty('--color-brand-primary')
    document.documentElement.style.removeProperty('--brand-logo-url')
    document.documentElement.style.removeProperty(
      '--color-brand-primary-contrast-text',
    )
  })

  it('sempre retorna um resultado que atinge WCAG 2.1 AA (4.5:1), qualquer que seja a cor de marca', () => {
    const el = document.createElement('div')
    const brandColors = ['#FFFFFF', '#000000', '#808080', '#FF0000', '#2E7D32']

    for (const colorPrimary of brandColors) {
      const applied = applyBrandTokens(buildBrandingConfig({ colorPrimary }), el)
      expect(applied.contrastText.meetsAA).toBe(true)
    }
  })
})
