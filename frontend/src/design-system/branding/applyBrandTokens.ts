import type { AccessibleTextColorResult } from '../contrast/contrast'
import { pickAccessibleTextColor } from '../contrast/contrast'
import {
  SYSTEM_DARK_TEXT_TOKEN,
  SYSTEM_LIGHT_TEXT_TOKEN,
} from '../tokens/fixedTokenValues'
import type { BrandingConfig } from './types'

export interface AppliedBrandTokens {
  colorPrimary: string
  logoUrl: string
  contrastText: AccessibleTextColorResult
}

/**
 * Aplica os tokens de marca (Camada 1, UX-SPEC.md §3.3) como CSS custom
 * properties sobre `target` (por padrão, `document.documentElement`, ou seja,
 * `:root` — visível globalmente para qualquer componente que use
 * `var(--color-brand-primary)`).
 *
 * Implementa a "regra de contraste dinâmico" (critério de aceite de FE-01):
 * `--color-brand-primary-contrast-text` nunca é um valor hardcoded — é
 * calculado a cada aplicação, escolhendo entre branco e o tom de texto escuro
 * fixo do sistema (`--color-text-primary`) o que atinge >= 4.5:1 (WCAG 2.1
 * AA) contra a cor de marca recebida.
 */
export function applyBrandTokens(
  branding: BrandingConfig,
  target: HTMLElement = document.documentElement,
): AppliedBrandTokens {
  const contrastText = pickAccessibleTextColor(branding.colorPrimary, {
    lightCandidate: SYSTEM_LIGHT_TEXT_TOKEN,
    darkCandidate: SYSTEM_DARK_TEXT_TOKEN,
  })

  target.style.setProperty('--color-brand-primary', branding.colorPrimary)
  target.style.setProperty('--brand-logo-url', `url("${branding.logoUrl}")`)
  target.style.setProperty(
    '--color-brand-primary-contrast-text',
    contrastText.color,
  )

  return {
    colorPrimary: branding.colorPrimary,
    logoUrl: branding.logoUrl,
    contrastText,
  }
}
