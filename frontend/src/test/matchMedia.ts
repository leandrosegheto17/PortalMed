import { vi } from 'vitest'

type MediaQueryListener = (event: MediaQueryListEvent) => void

// `Omit<..., 'matches'>` + `matches: boolean` (mutável): a interface real
// `MediaQueryList` declara `matches` como `readonly` (correto para consumo
// pelo hook, que nunca deveria escrever nela) — mas este mock precisa
// escrever nela para simular um resize. O tipo interno do mock é
// deliberadamente diferente do tipo público exposto via `window.matchMedia`
// (que continua compatível com `MediaQueryList`, `readonly` incluso).
interface MockMediaQueryList extends Omit<MediaQueryList, 'matches'> {
  matches: boolean
  __listeners: Set<MediaQueryListener>
}

/**
 * Mock de `window.matchMedia` para testar hooks/componentes orientados a
 * media query (`useMediaQuery`, `useBreakpoint`, `ResponsiveDataList`) sem
 * depender do motor de CSS do jsdom avaliar `@media` a partir de
 * `window.innerWidth` — a mesma limitação de ambiente já documentada em
 * `Navigation.test.tsx` (FE-02). Este mock simula a API real de
 * `MediaQueryList` (`matches`, `addEventListener('change', ...)`, com
 * fallback para a API legada `addListener`/`removeListener`), permitindo aos
 * testes controlar o resultado por query e disparar mudanças (`setMatches`,
 * equivalente observável a um resize real no navegador).
 *
 * Fica em `src/test/` (fora de `src/design-system/`) porque é utilitário só
 * de teste — a mesma pasta já excluída da cobertura em `vite.config.ts`.
 */
export function installMatchMediaMock(initialMatches: Record<string, boolean> = {}) {
  const registry = new Map<string, MockMediaQueryList>()

  function getOrCreate(query: string): MockMediaQueryList {
    const existing = registry.get(query)
    if (existing) return existing

    const listeners = new Set<MediaQueryListener>()
    const mql = {
      media: query,
      matches: initialMatches[query] ?? false,
      onchange: null,
      addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.add(listener as MediaQueryListener)
      },
      removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
        listeners.delete(listener as MediaQueryListener)
      },
      addListener: (listener: MediaQueryListener) => {
        listeners.add(listener)
      },
      removeListener: (listener: MediaQueryListener) => {
        listeners.delete(listener)
      },
      dispatchEvent: () => true,
      __listeners: listeners,
    } as unknown as MockMediaQueryList

    registry.set(query, mql)
    return mql
  }

  window.matchMedia = vi.fn((query: string) => getOrCreate(query)) as unknown as typeof window.matchMedia

  return {
    /** Atualiza `matches` da query e notifica os listeners registrados. */
    setMatches(query: string, matches: boolean) {
      const mql = getOrCreate(query)
      mql.matches = matches
      const event = { matches, media: query } as MediaQueryListEvent
      mql.__listeners.forEach((listener) => listener(event))
    },
    /** Nº de listeners ativos numa query — usado para validar cleanup (unmount removendo o listener). */
    listenerCount(query: string) {
      return getOrCreate(query).__listeners.size
    },
  }
}
