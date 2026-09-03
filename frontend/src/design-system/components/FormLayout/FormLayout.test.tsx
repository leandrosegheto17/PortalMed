import { fireEvent, render, screen } from '@testing-library/react'
import type { FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
// Importação `?raw`: mesmo recurso do Vite/Vitest já usado em
// `fixedTokenValues.sync.test.ts` (FE-01) para ler o conteúdo textual de um
// arquivo CSS em vez de processá-lo como módulo.
// eslint-disable-next-line import/no-unresolved
import formLayoutCss from './FormLayout.module.css?raw'
import { FormLayout } from './FormLayout'

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

describe('FormLayout (UX-SPEC.md §6.2 — formulários sempre em coluna única)', () => {
  it('renderiza um <form> nativo com nome acessível, preservando a ordem dos filhos (campos)', () => {
    render(
      <FormLayout aria-label="Formulário de teste">
        <label htmlFor="a">Campo A</label>
        <input id="a" />
        <label htmlFor="b">Campo B</label>
        <input id="b" />
      </FormLayout>,
    )

    const form = screen.getByRole('form', { name: 'Formulário de teste' })
    const childTagNames = Array.from(form.children).map((el) => el.tagName)
    expect(childTagNames).toEqual(['LABEL', 'INPUT', 'LABEL', 'INPUT'])
  })

  it('repassa atributos nativos de <form> (ex.: onSubmit)', () => {
    const handleSubmit = vi.fn((event: FormEvent) => event.preventDefault())
    render(
      <FormLayout aria-label="Formulário de teste" onSubmit={handleSubmit}>
        <button type="submit">Enviar</button>
      </FormLayout>,
    )

    fireEvent.submit(screen.getByRole('form', { name: 'Formulário de teste' }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it('não define nenhuma regra @media que troque a coluna única por layout de múltiplas colunas em nenhum breakpoint', () => {
    // Remove comentários de bloco antes de checar: o comentário do próprio
    // arquivo cita "@media"/"grid-template-columns" em texto explicativo
    // (documentando a ausência deliberada), o que não deve contar como uma
    // regra CSS real usando esses termos.
    const css = stripCssComments(formLayoutCss)

    expect(css).not.toMatch(/@media/)
    expect(css).toMatch(/flex-direction:\s*column/)
    expect(css).not.toMatch(/flex-direction:\s*row/)
    expect(css).not.toMatch(/grid-template-columns/)
  })
})
