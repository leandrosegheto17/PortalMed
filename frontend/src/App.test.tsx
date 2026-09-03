import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { BrandTokensProvider } from './design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from './design-system/branding/types'
import { appRoutes } from './routes'

/**
 * Teste de integração de FE-05 (critério de aceite: "CTAs 'Entrar'/'Criar
 * conta' funcionais"): reproduz a mesma árvore de rotas de `App.tsx`
 * (`appRoutes`) trocando só `BrowserRouter` por `MemoryRouter`, para poder
 * controlar a URL inicial e inspecionar a navegação sem um DOM real de
 * navegador.
 */
function TestRoutes() {
  return useRoutes(appRoutes)
}

function renderApp(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <TestRoutes />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('App (montagem real de produção, com BrowserRouter)', () => {
  it('monta com o BrowserRouter real (mesma composição de main.tsx) e renderiza a landing pública na raiz', () => {
    render(
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <App />
      </BrandTokensProvider>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: /Portal de Resultados de Exames/ }),
    ).toBeInTheDocument()
  })
})

describe('Roteamento da aplicação (FE-05 — primeira introdução de roteamento no projeto)', () => {
  it('renderiza a landing pública (TL-01) na rota raiz', () => {
    renderApp(['/'])

    expect(
      screen.getByRole('heading', { level: 1, name: /Portal de Resultados de Exames/ }),
    ).toBeInTheDocument()
  })

  it('CTA "Entrar" navega para a rota /entrar', async () => {
    const user = userEvent.setup()
    renderApp(['/'])

    await user.click(screen.getByRole('link', { name: 'Entrar' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it('CTA "Criar conta" navega para a rota /criar-conta, agora a tela real de cadastro (TL-02, FE-06)', async () => {
    const user = userEvent.setup()
    renderApp(['/'])

    await user.click(screen.getByRole('link', { name: 'Criar conta' }))

    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome completo/i })).toBeInTheDocument()
  })

  it('rota /entrar renderiza o placeholder de login até FE-08 existir', () => {
    renderApp(['/entrar'])

    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
    expect(screen.getByText('Esta tela ainda não foi implementada.')).toBeInTheDocument()
  })

  it('rota /criar-conta/termos renderiza a tela real de Termos e Consentimento (TL-05, FE-07)', async () => {
    renderApp(['/criar-conta/termos'])

    expect(
      screen.getByRole('heading', { level: 1, name: 'Termos e Consentimento' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('region', {
        name: 'Texto completo dos Termos de Uso e Política de Privacidade',
      }),
    ).toBeInTheDocument()
  })

  it('rota /criar-conta/senha renderiza a tela real de Definir Senha (TL-06, FE-07)', () => {
    renderApp(['/criar-conta/senha'])

    expect(screen.getByRole('heading', { level: 1, name: 'Definir senha' })).toBeInTheDocument()
  })

  it('rota /criar-conta/sucesso renderiza a tela real de Confirmação de Cadastro (TL-07, FE-07), sem autenticar automaticamente', () => {
    renderApp(['/criar-conta/sucesso'])

    expect(
      screen.getByRole('heading', { level: 1, name: 'Conta criada com sucesso!' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/entrar')
    expect(localStorage.length).toBe(0)
  })

  it('rota /criar-conta/bloqueio-idade renderiza a tela real de bloqueio de menor de idade (TL-03, FE-06)', () => {
    renderApp(['/criar-conta/bloqueio-idade'])

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Autoatendimento digital indisponível para menores de idade',
      }),
    ).toBeInTheDocument()
  })

  it('rota /criar-conta/cpf-nao-localizado renderiza a tela real de erro de CPF não localizado (TL-04, FE-06)', () => {
    renderApp(['/criar-conta/cpf-nao-localizado'])

    expect(screen.getByRole('heading', { level: 1, name: 'CPF não localizado' })).toBeInTheDocument()
  })

  it('link "Voltar à página inicial" do placeholder retorna para a landing pública', async () => {
    const user = userEvent.setup()
    renderApp(['/entrar'])

    await user.click(screen.getByRole('link', { name: 'Voltar à página inicial' }))

    expect(
      screen.getByRole('heading', { level: 1, name: /Portal de Resultados de Exames/ }),
    ).toBeInTheDocument()
  })
})
