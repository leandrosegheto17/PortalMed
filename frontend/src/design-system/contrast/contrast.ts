/**
 * Cálculo de contraste WCAG 2.1 (critério 1.4.3) e seleção automática de cor de
 * texto (branco vs. um tom escuro fixo do sistema) sobre uma cor de fundo
 * dinâmica (`--color-brand-primary`, UX-SPEC.md §3.3).
 *
 * Referência: https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * Este módulo não depende de DOM/CSSOM de propósito — o cálculo de luminância
 * relativa/razão de contraste é matemática pura sobre valores hex, o que o
 * torna testável isoladamente e reutilizável tanto no client (aplicação do
 * token dinâmico) quanto em qualquer ferramenta de build/lint futura que queira
 * validar paletas antes do deploy.
 */

const HEX_COLOR_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** Relação de contraste mínima exigida pelo WCAG 2.1 AA para texto normal (1.4.3). */
export const WCAG_AA_NORMAL_TEXT_MIN_CONTRAST = 4.5

export interface RgbColor {
  r: number
  g: number
  b: number
}

export class InvalidHexColorError extends Error {
  constructor(value: string) {
    super(
      `Cor inválida: "${value}" não é um hex válido (formatos aceitos: #RGB ou #RRGGBB).`,
    )
    this.name = 'InvalidHexColorError'
  }
}

/**
 * Normaliza e converte uma cor hex (#RGB ou #RRGGBB, com ou sem "#") em
 * componentes RGB (0-255). Lança `InvalidHexColorError` para entrada fora do
 * formato — cor de marca vem de configuração de tenant (`BRANDING_CONFIG`),
 * nunca deve ser assumida válida sem checagem.
 */
export function hexToRgb(hex: string): RgbColor {
  if (!HEX_COLOR_PATTERN.test(hex)) {
    throw new InvalidHexColorError(hex)
  }

  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized

  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
  }
}

/** Converte um canal sRGB (0-255) para o espaço linear usado na fórmula de luminância. */
function channelToLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

/**
 * Luminância relativa (0 a 1) de uma cor, conforme fórmula do WCAG 2.1
 * (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance).
 */
export function relativeLuminance(color: RgbColor): number {
  const r = channelToLinear(color.r)
  const g = channelToLinear(color.g)
  const b = channelToLinear(color.b)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Razão de contraste entre duas cores hex, conforme WCAG 2.1 (1.4.3).
 * Resultado sempre >= 1 (independe da ordem dos argumentos).
 */
export function contrastRatio(hexA: string, hexB: string): number {
  const luminanceA = relativeLuminance(hexToRgb(hexA))
  const luminanceB = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(luminanceA, luminanceB)
  const darker = Math.min(luminanceA, luminanceB)
  return (lighter + 0.05) / (darker + 0.05)
}

export interface AccessibleTextColorResult {
  /** Cor de texto escolhida (uma das duas candidatas, ou o fallback de garantia). */
  color: string
  /** Razão de contraste resultante entre `color` e a cor de fundo avaliada. */
  contrastRatio: number
  /** Se o resultado atinge o mínimo WCAG 2.1 AA para texto normal (4.5:1). */
  meetsAA: boolean
  /** true apenas se nenhuma das duas candidatas configuradas atingiu 4.5:1 e foi necessário usar o fallback de garantia (preto/branco puro). */
  usedGuaranteedFallback: boolean
}

/**
 * Escolhe automaticamente, entre uma cor clara e uma cor escura candidatas, a
 * que atinge a maior relação de contraste sobre uma cor de fundo dinâmica —
 * implementa a "regra de contraste dinâmico" do UX-SPEC.md §3.3 sobre
 * `--color-brand-primary`: nunca assume que a marca será sempre clara ou
 * sempre escura.
 *
 * Prova matemática de que o resultado sempre atinge >= 4.5:1 quando
 * `darkCandidate` é suficientemente escuro (luminância próxima de 0): o ponto
 * de cruzamento entre o contraste do branco puro e do preto puro contra
 * qualquer luminância de fundo L é sempre >= ~4.58:1 (> 4.5:1). Por segurança —
 * caso um token de marca ou uma cor escura de sistema pouco convencional
 * quebre essa premissa — há um fallback de garantia (preto/branco puro) que é
 * sempre matematicamente suficiente.
 */
export function pickAccessibleTextColor(
  backgroundHex: string,
  options: {
    lightCandidate?: string
    darkCandidate?: string
    minContrast?: number
  } = {},
): AccessibleTextColorResult {
  const {
    lightCandidate = '#FFFFFF',
    darkCandidate = '#000000',
    minContrast = WCAG_AA_NORMAL_TEXT_MIN_CONTRAST,
  } = options

  const lightContrast = contrastRatio(backgroundHex, lightCandidate)
  const darkContrast = contrastRatio(backgroundHex, darkCandidate)

  const best =
    lightContrast >= darkContrast
      ? { color: lightCandidate, contrastRatio: lightContrast }
      : { color: darkCandidate, contrastRatio: darkContrast }

  if (best.contrastRatio >= minContrast) {
    return { ...best, meetsAA: true, usedGuaranteedFallback: false }
  }

  // Rede de segurança: nenhuma das duas candidatas configuradas atingiu o
  // mínimo. Preto/branco puro garante matematicamente >= 4.5:1 contra
  // qualquer cor de fundo válida (ver prova na documentação acima) — nunca
  // deve, na prática, deixar a marca sem texto legível.
  const guaranteedWhite = contrastRatio(backgroundHex, '#FFFFFF')
  const guaranteedBlack = contrastRatio(backgroundHex, '#000000')
  const guaranteed =
    guaranteedWhite >= guaranteedBlack
      ? { color: '#FFFFFF', contrastRatio: guaranteedWhite }
      : { color: '#000000', contrastRatio: guaranteedBlack }

  return {
    ...guaranteed,
    meetsAA: guaranteed.contrastRatio >= minContrast,
    usedGuaranteedFallback: true,
  }
}
