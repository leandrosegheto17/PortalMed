import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import { CadastroBloqueioMenorIdadePage } from './CadastroBloqueioMenorIdadePage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/criar-conta/bloqueio-idade']}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <CadastroBloqueioMenorIdadePage />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('CadastroBloqueioMenorIdadePage (TL-03 — Bloqueio de Menor de Idade, RN-01)', () => {
  it('renderiza a mensagem de bloqueio com tom informativo (não de erro/alerta), sem indicar falha do paciente', () => {
    renderPage()

    expect(screen.getByText('Informação:')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Autoatendimento digital indisponível para menores de idade',
      }),
    ).toBeInTheDocument()
  })

  it('orienta o contato com a recepção do hospital', () => {
    renderPage()

    expect(screen.getByText(/recepção do hospital/i)).toBeInTheDocument()
  })

  it('tem um único CTA — "Voltar à página inicial" — sem nenhuma opção de tentar novamente com outra data (RN-01/EXCEPTION: "Nenhuma nesta release")', () => {
    renderPage()

    const linksInMain = screen.getAllByRole('link').filter((el) => el.closest('main'))
    expect(linksInMain).toHaveLength(1)
    expect(linksInMain[0]).toHaveTextContent('Voltar à página inicial')
    expect(linksInMain[0]).toHaveAttribute('href', '/')
  })

  it('não contém nenhum formulário, campo de data ou texto sugerindo nova tentativa', () => {
    renderPage()

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByText(/tentar novamente/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/corrigir/i)).not.toBeInTheDocument()
  })

  it('o CTA é alcançável e ativável só por teclado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveFocus()
  })
})
