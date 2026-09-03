// Setup global para os testes do Vitest.
// Adiciona os matchers de acessibilidade/DOM do jest-dom (ex.: toBeInTheDocument,
// toHaveStyle) ao `expect` do Vitest.
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Desmonta a árvore React e limpa o DOM (`document.body`) após cada teste.
// Sem isso, `render()` de testes anteriores permanece acumulado no body entre
// testes do mesmo arquivo (a config deste projeto não usa `test.globals`, então
// o React Testing Library não registra o `afterEach` de limpeza sozinho) — o
// que gera falso positivo/negativo em queries por role/texto que se repetem
// entre componentes estruturais (ex.: `MessageBanner`/FE-02, múltiplas
// variantes renderizadas em `it.each`).
afterEach(cleanup)
