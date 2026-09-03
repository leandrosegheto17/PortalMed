import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import { CadastroConfirmacaoPage } from './CadastroConfirmacaoPage'

function renderPage(state: { nome?: string } | null = null) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/criar-conta/sucesso', state }]}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <CadastroConfirmacaoPage />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('CadastroConfirmacaoPage (TL-07 — Confirmação de Cadastro)', () => {
  it('exibe a mensagem de sucesso e o CTA único "Ir para o login"', () => {
    renderPage()

    expect(screen.getByText('Sucesso:')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Conta criada com sucesso!' })).toBeInTheDocument()
    expect(screen.getAllByRole('link').filter((el) => el.closest('main'))).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/entrar')
  })

  it('personaliza a saudação quando o nome é repassado por TL-06', () => {
    renderPage({ nome: 'Maria da Silva' })

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conta criada, Maria da Silva!' }),
    ).toBeInTheDocument()
  })

  it('não autentica automaticamente: nenhum token/sessão em localStorage, sessionStorage ou cookie', () => {
    renderPage({ nome: 'Maria da Silva' })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })

  it('move o foco para o título ao entrar na tela (anúncio a leitor de tela)', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus()
  })

  it('o CTA "Ir para o login" é alcançável e ativável só por teclado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveFocus()
  })
})
