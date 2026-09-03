/**
 * Framework responsivo (FE-04, UX-SPEC.md §6.1) — fonte única de verdade dos
 * três breakpoints do projeto (mobile/tablet/desktop), consumida tanto por
 * lógica JS (`useMediaQuery`/`useBreakpoint`, `ResponsiveDataList`) quanto
 * como referência documentada para qualquer CSS Module que precise expressar
 * a mesma faixa via `@media` puro.
 *
 * Por que os valores não são compartilhados com o CSS via uma única fonte
 * automática (ex.: variável CSS dentro da própria condição de media query):
 * nenhum navegador com suporte hoje aceita `var(--algo)` como valor de
 * `min-width`/`max-width` de um `@media` (ausência de `@custom-media` via
 * PostCSS neste projeto — introduzir uma etapa de build só para isso seria
 * desproporcional ao escopo desta tarefa, 3 dp). Qualquer CSS Module novo que
 * expressar um destes breakpoints deve replicar o valor em pixel exato
 * documentado abaixo — mesmo padrão já em uso, de forma consistente, por
 * `Navigation.module.css`/`ConfirmationModal.module.css` (FE-02, que já usam
 * `599px` para o limite de mobile). O par "TS é a fonte de verdade lógica,
 * CSS replica o valor" é o mesmo padrão já estabelecido por
 * `fixedTokenValues.ts`/`tokens.css` (FE-01).
 */
export const BREAKPOINTS = {
  /** UX-SPEC.md §6.1 — "Mobile: até 599px". */
  mobileMax: 599,
  /** UX-SPEC.md §6.1 — "Tablet: 600px–1023px". */
  tabletMin: 600,
  tabletMax: 1023,
  /** UX-SPEC.md §6.1 — "Desktop: >= 1024px". */
  desktopMin: 1024,
} as const

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'

/**
 * Strings de media query prontas para uso com `window.matchMedia`/
 * `useMediaQuery` — derivadas de `BREAKPOINTS`, nunca redigitadas à mão em
 * mais de um lugar da lógica JS do projeto.
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobileMax}px)`,
  tablet: `(min-width: ${BREAKPOINTS.tabletMin}px) and (max-width: ${BREAKPOINTS.tabletMax}px)`,
  /** >= 600px — usado por `useBreakpoint` combinado com `desktop` para decidir "tablet". */
  tabletUp: `(min-width: ${BREAKPOINTS.tabletMin}px)`,
  desktop: `(min-width: ${BREAKPOINTS.desktopMin}px)`,
} as const
