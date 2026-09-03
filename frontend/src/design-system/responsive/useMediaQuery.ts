import { useEffect, useState } from 'react'

/**
 * Hook de baixo nível para consumir uma media query CSS em React, via
 * `window.matchMedia` — base de `useBreakpoint` (`breakpoints.ts`) e de
 * qualquer necessidade futura de responsividade orientada por JS (ex.: o
 * colapso lista→card de `ResponsiveDataList`).
 *
 * Decisão de arquitetura (dentro da autoridade deste agente): o colapso
 * *estrutural* de DOM (trocar uma árvore inteira por outra, não só um
 * detalhe visual) é decidido em JS via este hook, não em CSS puro `@media`
 * como `Navigation`/`ConfirmationModal` (FE-02) já fazem para trocas
 * puramente visuais — ver `ResponsiveDataList.tsx` para o racional completo.
 * Este hook não substitui `@media` para os casos que já funcionam bem hoje.
 */
interface MediaQueryState {
  query: string
  matches: boolean
}

export function useMediaQuery(query: string): boolean {
  const [state, setState] = useState<MediaQueryState>(() => ({
    query,
    matches: getMatchesNow(query),
  }))

  // `query` pode mudar entre renderizações (ex.: composição condicional de
  // media query por um componente consumidor). Em vez de recalcular dentro
  // de um efeito — que exigiria chamar `setState` de forma síncrona logo no
  // corpo do efeito, padrão sinalizado pelo lint como gerador de
  // re-render em cascata desnecessário — ajustamos o estado durante a
  // própria renderização quando `query` diverge do último valor computado.
  // É o padrão recomendado pelo React para "ajustar estado quando uma prop
  // muda" (react.dev, "You Might Not Need an Effect"): a chamada a
  // `setState` aqui interrompe a renderização atual e já recomeça com o
  // valor correto, sem commit intermediário nem round-trip por um efeito.
  if (state.query !== query) {
    setState({ query, matches: getMatchesNow(query) })
  }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQueryList = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setState({ query, matches: event.matches })

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', listener)
      return () => mediaQueryList.removeEventListener('change', listener)
    }

    // Fallback: API legada (Safari < 14) — RNF-14/UX-SPEC §6.1 deixam
    // compatibilidade de navegador como "a confirmar"; este fallback evita
    // que o hook simplesmente pare de reagir a mudança de viewport nesses
    // navegadores mais antigos.
    mediaQueryList.addListener(listener)
    return () => mediaQueryList.removeListener(listener)
  }, [query])

  return state.matches
}

function getMatchesNow(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(query).matches
}
