/**
 * Camada 2 do sistema de tokens (UX-SPEC.md §3.3) — tokens de sistema, FIXOS,
 * independentes de tenant, já verificados WCAG 2.1 AA. Fonte única de verdade
 * dos valores hexadecimais.
 *
 * Por que estes valores existem tanto aqui (TS) quanto em `tokens.css`:
 * - `tokens.css` é o formato de consumo em estilo (custom properties CSS,
 *   `var(--color-text-primary)` etc.), padrão pedido implicitamente pelo
 *   UX-SPEC (nomes de token já no formato `--color-*`).
 * - Este módulo TS é o formato de consumo em lógica (o algoritmo de contraste
 *   dinâmico de `applyBrandTokens.ts` precisa de um valor hex tipado em
 *   runtime para decidir a cor de texto sobre `--color-brand-primary`; ler o
 *   valor computado da CSSOM em vez disso acoplaria uma decisão crítica de
 *   acessibilidade à ordem de carregamento do CSS/ao suporte de custom
 *   properties do ambiente de teste, o que é frágil).
 *
 * `fixedTokenValues.sync.test.ts` garante que os dois arquivos não divergem —
 * decisão de detalhe deste agente, documentada aqui em vez de introduzir uma
 * etapa de geração de CSS a partir do TS (desproporcional ao escopo de FE-01,
 * 5 dp).
 */
export const FIXED_TOKEN_VALUES = {
  colorTextPrimary: '#1A2733',
  colorBgDefault: '#FFFFFF',
  colorSuccess: '#1E7A34',
  colorError: '#B3261E',
  colorWarning: '#8A5A00',
  colorInfo: '#1D5DB3',
} as const

export type FixedTokenName = keyof typeof FIXED_TOKEN_VALUES

/**
 * Tom de texto escuro fixo do sistema usado como candidata na regra de
 * contraste dinâmico sobre `--color-brand-primary` (UX-SPEC.md §3.3).
 */
export const SYSTEM_DARK_TEXT_TOKEN = FIXED_TOKEN_VALUES.colorTextPrimary

/** Cor de texto clara candidata (a outra ponta da regra de contraste dinâmico). */
export const SYSTEM_LIGHT_TEXT_TOKEN = '#FFFFFF'
