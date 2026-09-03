import { describe, expect, it } from 'vitest'
import {
  InvalidHexColorError,
  WCAG_AA_NORMAL_TEXT_MIN_CONTRAST,
  contrastRatio,
  hexToRgb,
  pickAccessibleTextColor,
  relativeLuminance,
} from './contrast'

describe('hexToRgb', () => {
  it('converte hex de 6 dígitos com "#"', () => {
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#0057B8')).toEqual({ r: 0, g: 87, b: 184 })
  })

  it('converte hex de 6 dígitos sem "#"', () => {
    expect(hexToRgb('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('expande hex de 3 dígitos (shorthand)', () => {
    expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 })
    expect(hexToRgb('#000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#0AF')).toEqual({ r: 0, g: 170, b: 255 })
  })

  it('é case-insensitive', () => {
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 })
  })

  it.each(['', '#12', '#12345', '#GGGGGG', 'não é cor', '#1234567'])(
    'lança InvalidHexColorError para entrada inválida: %s',
    (invalid) => {
      expect(() => hexToRgb(invalid)).toThrow(InvalidHexColorError)
    },
  )
})

describe('relativeLuminance', () => {
  it('branco puro tem luminância 1', () => {
    expect(relativeLuminance(hexToRgb('#FFFFFF'))).toBeCloseTo(1, 5)
  })

  it('preto puro tem luminância 0', () => {
    expect(relativeLuminance(hexToRgb('#000000'))).toBeCloseTo(0, 5)
  })
})

describe('contrastRatio', () => {
  it('preto sobre branco é 21:1 (contraste máximo)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1)
  })

  it('uma cor contra ela mesma é 1:1 (contraste mínimo)', () => {
    expect(contrastRatio('#0057B8', '#0057B8')).toBeCloseTo(1, 5)
  })

  it('é simétrico independente da ordem dos argumentos', () => {
    expect(contrastRatio('#0057B8', '#FFFFFF')).toBeCloseTo(
      contrastRatio('#FFFFFF', '#0057B8'),
      5,
    )
  })

  it('reproduz o valor de referência conhecido do WCAG para #767676 sobre branco (~4.54:1)', () => {
    // #767676 é o cinza de referência historicamente citado como o limiar de
    // 4.5:1 contra branco em ferramentas WCAG (WebAIM contrast checker).
    expect(contrastRatio('#767676', '#FFFFFF')).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio('#767676', '#FFFFFF')).toBeLessThan(4.6)
  })
})

describe('pickAccessibleTextColor', () => {
  it('escolhe branco sobre um fundo de marca escuro', () => {
    const result = pickAccessibleTextColor('#0B2545') // azul bem escuro
    expect(result.color).toBe('#FFFFFF')
    expect(result.meetsAA).toBe(true)
    expect(result.usedGuaranteedFallback).toBe(false)
  })

  it('escolhe a cor escura candidata sobre um fundo de marca claro', () => {
    const darkToken = '#1A2733'
    const result = pickAccessibleTextColor('#FDE68A', {
      // amarelo claro
      darkCandidate: darkToken,
    })
    expect(result.color).toBe(darkToken)
    expect(result.meetsAA).toBe(true)
  })

  it('nunca assume a priori que a marca é clara ou escura — decide por cálculo', () => {
    const darkToken = '#111827'
    const lightBg = pickAccessibleTextColor('#F5F5F5', { darkCandidate: darkToken })
    const darkBg = pickAccessibleTextColor('#0F172A', { darkCandidate: darkToken })
    expect(lightBg.color).toBe(darkToken)
    expect(darkBg.color).toBe('#FFFFFF')
  })

  it('sempre atinge >= 4.5:1 (WCAG 2.1 AA) para uma amostra ampla de cores de marca', () => {
    const darkToken = '#1A2733'
    const sampleBrandColors = [
      '#FFFFFF',
      '#000000',
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#00FFFF',
      '#FF00FF',
      '#808080',
      '#C0C0C0',
      '#0057B8',
      '#7A1F2B',
      '#2E7D32',
      '#F5A623',
      '#6B7280',
      '#111827',
      '#FDE68A',
      '#EF4444',
      '#10B981',
      '#3B82F6',
    ]

    for (const brandColor of sampleBrandColors) {
      const result = pickAccessibleTextColor(brandColor, { darkCandidate: darkToken })
      expect(
        result.contrastRatio,
        `contraste insuficiente para fundo ${brandColor}: obteve ${result.contrastRatio}`,
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL_TEXT_MIN_CONTRAST)
      expect(result.meetsAA).toBe(true)
    }
  })

  it('usa o fallback de garantia (preto/branco puro) quando nenhuma candidata configurada atinge 4.5:1', () => {
    // Candidatas deliberadamente "fracas" (cinzas médios) para forçar o
    // caminho de rede de segurança contra um fundo de contraste médio.
    const result = pickAccessibleTextColor('#9AA0A6', {
      lightCandidate: '#CCCCCC',
      darkCandidate: '#555555',
    })
    expect(result.usedGuaranteedFallback).toBe(true)
    expect(result.meetsAA).toBe(true)
    expect(['#FFFFFF', '#000000']).toContain(result.color)
  })

  it('respeita um minContrast customizado', () => {
    const result = pickAccessibleTextColor('#FFFFFF', { minContrast: 3 })
    expect(result.contrastRatio).toBeGreaterThanOrEqual(3)
  })
})
