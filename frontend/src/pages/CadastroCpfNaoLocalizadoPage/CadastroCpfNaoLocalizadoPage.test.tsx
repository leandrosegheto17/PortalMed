import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import { CadastroCpfNaoLocalizadoPage } from './CadastroCpfNaoLocalizadoPage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/criar-conta/cpf-nao-localizado']}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <CadastroCpfNaoLocalizadoPage />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('CadastroCpfNaoLocalizadoPage (TL-04 — Erro: CPF não localizado, RF-15)', () => {
  it('renderiza a mensagem com tom de "ação necessária" (aviso, não erro/culpa do paciente)', () => {
    renderPage()

    expect(screen.getByText('Aviso:')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'CPF não localizado' })).toBeInTheDocument()
  })

  it('orienta o paciente a procurar a recepção do hospital para verificar o cadastro', () => {
    renderPage()

    expect(screen.getByText(/recepção do hospital/i)).toBeInTheDocument()
  })

  it('oferece o CTA "Voltar à página inicial" e o link secundário "Já tenho cadastro, entrar"', () => {
    renderPage()

    expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByRole('link', { name: 'Já tenho cadastro, entrar' })).toHaveAttribute(
      'href',
      '/entrar',
    )
  })

  it('não contém nenhum formulário nem campo de CPF para reenviar', () => {
    renderPage()

    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('os dois CTAs são alcançáveis e ativáveis só por teclado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Já tenho cadastro, entrar' })).toHaveFocus()
  })
})
