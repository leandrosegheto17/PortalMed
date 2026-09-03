import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import type { CadastroPersonalData } from '../CadastroDadosPessoaisPage/cadastroPersonalData'
import { CadastroDefinirSenhaPage } from './CadastroDefinirSenhaPage'
import type { CadastroSubmissionResult } from './registrationApi'

const SAMPLE_PERSONAL_DATA: CadastroPersonalData = {
  nome: 'Maria da Silva',
  cpf: '52998224725',
  dataNascimento: '1990-03-15',
  email: 'maria@example.com',
  celular: '11988887777',
}

const VALID_PASSWORD = 'Abcdef12'

function ConfirmationStub() {
  const location = useLocation()
  const state = location.state as { nome?: string } | null
  return (
    <div>
      <h1>Confirmação de Cadastro</h1>
      <p data-testid="forwarded-nome">{state?.nome ?? '(sem nome)'}</p>
    </div>
  )
}

function renderPage({
  submitRegistration,
  initialState,
}: {
  submitRegistration?: (payload: {
    personalData?: CadastroPersonalData
    termsVersion?: string
    senha: string
  }) => Promise<CadastroSubmissionResult>
  initialState?: { personalData?: CadastroPersonalData; termsVersion?: string }
} = {}) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/criar-conta/senha', state: initialState ?? null }]}
    >
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <Routes>
          <Route
            path="/criar-conta/senha"
            element={<CadastroDefinirSenhaPage submitRegistration={submitRegistration} />}
          />
          <Route path="/criar-conta/sucesso" element={<ConfirmationStub />} />
        </Routes>
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('CadastroDefinirSenhaPage (TL-06 — Definir Senha)', () => {
  it('renderiza os campos de senha e confirmação e o CTA "Criar conta"', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Definir senha' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Senha/, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeInTheDocument()
  })

  it('sem submissão parcial: envio com política de senha não atendida revela erro inline e não chama submitRegistration', async () => {
    const user = userEvent.setup()
    const submitRegistration = vi.fn()
    renderPage({ submitRegistration })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), 'abc')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      screen.getByText('A senha não atende aos requisitos mínimos listados abaixo.'),
    ).toBeInTheDocument()
    expect(submitRegistration).not.toHaveBeenCalled()
  })

  it('senhas que não coincidem exibem erro inline no campo de confirmação e não submetem', async () => {
    const user = userEvent.setup()
    const submitRegistration = vi.fn()
    renderPage({ submitRegistration })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' }), 'Outra12345')
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(screen.getByText('As senhas não coincidem.')).toBeInTheDocument()
    expect(submitRegistration).not.toHaveBeenCalled()
  })

  it('submissão válida chama submitRegistration com os dados repassados de TL-02/TL-05 e navega para TL-07 sem autenticar', async () => {
    const user = userEvent.setup()
    const submitRegistration = vi.fn().mockResolvedValue({ success: true } satisfies CadastroSubmissionResult)
    renderPage({
      submitRegistration,
      initialState: { personalData: SAMPLE_PERSONAL_DATA, termsVersion: '1.0.0' },
    })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' }), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await waitFor(() =>
      expect(submitRegistration).toHaveBeenCalledWith({
        personalData: SAMPLE_PERSONAL_DATA,
        termsVersion: '1.0.0',
        senha: VALID_PASSWORD,
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Confirmação de Cadastro' })).toBeInTheDocument()
    expect(screen.getByTestId('forwarded-nome')).toHaveTextContent('Maria da Silva')
  })

  it('exibe spinner/estado de carregamento no botão durante a criação da conta (UX-SPEC.md TL-06)', async () => {
    const user = userEvent.setup()
    let resolveSubmit!: (result: CadastroSubmissionResult) => void
    const submitRegistration = vi.fn(
      () =>
        new Promise<CadastroSubmissionResult>((resolve) => {
          resolveSubmit = resolve
        }),
    )
    renderPage({ submitRegistration })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' }), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    const button = await screen.findByRole('button', { name: 'Criando conta…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    resolveSubmit({ success: true })
    await screen.findByRole('heading', { name: 'Confirmação de Cadastro' })
  })

  it('falha ao criar a conta exibe mensagem de erro inline e permite nova tentativa, sem navegar', async () => {
    const user = userEvent.setup()
    const submitRegistration = vi.fn().mockRejectedValue(new Error('network error'))
    renderPage({ submitRegistration })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' }), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    expect(
      await screen.findByText('Não foi possível concluir seu cadastro agora. Tente novamente em instantes.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Definir senha' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar conta' })).not.toBeDisabled()
  })

  it('não escreve nenhum token/sessão em localStorage, sessionStorage ou cookie após a submissão (login não automático)', async () => {
    const user = userEvent.setup()
    const submitRegistration = vi.fn().mockResolvedValue({ success: true } satisfies CadastroSubmissionResult)
    renderPage({ submitRegistration })

    await user.type(screen.getByLabelText(/^Senha/, { selector: 'input' }), VALID_PASSWORD)
    await user.type(screen.getByLabelText(/Confirmar senha/i, { selector: 'input' }), VALID_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))

    await screen.findByRole('heading', { name: 'Confirmação de Cadastro' })

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(document.cookie).toBe('')
  })
})
