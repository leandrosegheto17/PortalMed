import type { Breakpoint } from './breakpoints'
import { MEDIA_QUERIES } from './breakpoints'
import { useMediaQuery } from './useMediaQuery'

/**
 * Resolve o breakpoint atual (UX-SPEC.md §6.1) a partir de duas media
 * queries `min-width`, deliberadamente não sobrepostas em termos de decisão
 * (a prioridade de `desktop` sobre `tabletUp` evita ambiguidade quando as
 * duas batem ao mesmo tempo): `desktop` (>= 1024px) decide primeiro; senão
 * `tabletUp` (>= 600px) decide "tablet"; abaixo disso é sempre "mobile" — o
 * hook nunca retorna um quarto estado "indefinido".
 */
export function useBreakpoint(): Breakpoint {
  const isDesktop = useMediaQuery(MEDIA_QUERIES.desktop)
  const isTabletUp = useMediaQuery(MEDIA_QUERIES.tabletUp)

  if (isDesktop) return 'desktop'
  if (isTabletUp) return 'tablet'
  return 'mobile'
}
