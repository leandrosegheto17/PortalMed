import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import type { CadastroPersonalData } from '../CadastroDadosPessoaisPage/cadastroPersonalData'
import { CadastroTermosConsentimentoPage } from './CadastroTermosConsentimentoPage'
import type { TermsContent } from './termsApi'

const SAMPLE_TERMS: TermsContent = {
  version: '1.0.0',
  termsOfUseText: 'Texto completo dos Termos de Uso para teste.',
  privacyPolicyText: 'Texto completo da Política de Privacidade para teste.',
}

const SAMPLE_PERSONAL_DATA: CadastroPersonalData = {
  nome: 'Maria da Silva',
  cpf: '52998224725',
  dataNascimento: '1990-03-15',
  email: 'maria@example.com',
  celular: '11988887777',
}

function NextStepStub() {
  const location = useLocation()
  const state = location.state as
    | { personalData?: CadastroPersonalData; termsVersion?: string }
    | null
  return (
    <div>
      <h1>Definir Senha</h1>
      <p data-testid="forwarded-nome">{state?.personalData?.nome ?? '(sem nome)'}</p>
      <p data-testid="forwarded-terms-version">{state?.termsVersion ?? '(sem versão)'}</p>
    </div>
  )
}

function renderPage({
  fetchTerms,
  initialState,
}: {
  fetchTerms?: () => Promise<TermsContent>
  initialState?: { personalData?: CadastroPersonalData }
} = {}) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/criar-conta/termos', state: initialState ?? null }]}
    >
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <Routes>
          <Route
            path="/criar-conta/termos"
            element={<CadastroTermosConsentimentoPage fetchTerms={fetchTerms} />}
          />
          <Route path="/criar-conta/senha" element={<NextStepStub />} />
        </Routes>
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

async function loadReadyState(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('region', {
    name: 'Texto completo dos Termos de Uso e Política de Privacidade',
  })
  void user
}

describe('CadastroTermosConsentimentoPage (TL-05 — Termos e Consentimento LGPD, RF-12/RN-02)', () => {
  it('exibe skeleton de carregamento enquanto os termos carregam, sem checkboxes nem CTA', () => {
    const fetchTerms = vi.fn(() => new Promise<TermsContent>(() => {}))
    renderPage({ fetchTerms })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Concluir cadastro' })).not.toBeInTheDocument()
  })

  it('carrega e exibe o texto completo dos Termos de Uso e Política de Privacidade', async () => {
    const fetchTerms = vi.fn().mockResolvedValue(SAMPLE_TERMS)
    renderPage({ fetchTerms })

    expect(
      await screen.findByRole('region', {
        name: 'Texto completo dos Termos de Uso e Política de Privacidade',
      }),
    ).toHaveTextContent('Texto completo dos Termos de Uso para teste.')
    expect(screen.getByText('Texto completo da Política de Privacidade para teste.')).toBeInTheDocument()
  })

  it('renderiza dois controles de aceite distintos, com nomes acessíveis que nunca colidem (RN-02)', async () => {
    const user = userEvent.setup()
    renderPage({ fetchTerms: vi.fn().mockResolvedValue(SAMPLE_TERMS) })
    await loadReadyState(user)

    const termsCheckbox = screen.getByRole('checkbox', {
      name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
    })
    const healthCheckbox = screen.getByRole('checkbox', {
      name: /Consentimento específico para dado de saúde: Autorizo especificamente/,
    })

    expect(termsCheckbox).toBeInTheDocument()
    expect(healthCheckbox).toBeInTheDocument()
    expect(termsCheckbox).not.toBe(healthCheckbox)
    expect(screen.getByRole('group', { name: 'Consentimento específico para dado de saúde' })).toBeInTheDocument()
  })

  it('CTA "Concluir cadastro" permanece desabilitado até os dois aceites (nunca apenas um)', async () => {
    const user = userEvent.setup()
    renderPage({ fetchTerms: vi.fn().mockResolvedValue(SAMPLE_TERMS) })
    await loadReadyState(user)

    const submit = screen.getByRole('button', { name: 'Concluir cadastro' })
    const termsCheckbox = screen.getByRole('checkbox', {
      name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
    })
    const healthCheckbox = screen.getByRole('checkbox', {
      name: /Consentimento específico para dado de saúde: Autorizo especificamente/,
    })

    expect(submit).toBeDisabled()

    await user.click(termsCheckbox)
    expect(submit).toBeDisabled()

    await user.click(healthCheckbox)
    expect(submit).toBeEnabled()

    await user.click(healthCheckbox)
    expect(submit).toBeDisabled()
  })

  it('ao concluir com os dois aceites, navega para TL-06 repassando dados pessoais e a versão dos termos', async () => {
    const user = userEvent.setup()
    renderPage({
      fetchTerms: vi.fn().mockResolvedValue(SAMPLE_TERMS),
      initialState: { personalData: SAMPLE_PERSONAL_DATA },
    })
    await loadReadyState(user)

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
      }),
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: /Consentimento específico para dado de saúde: Autorizo especificamente/,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Concluir cadastro' }))

    expect(await screen.findByRole('heading', { name: 'Definir Senha' })).toBeInTheDocument()
    expect(screen.getByTestId('forwarded-nome')).toHaveTextContent('Maria da Silva')
    expect(screen.getByTestId('forwarded-terms-version')).toHaveTextContent('1.0.0')
  })

  it('falha ao carregar os termos exibe erro + "Tentar novamente", sem nenhum caminho de aceite disponível', async () => {
    const fetchTerms = vi.fn().mockRejectedValueOnce(new Error('network error'))
    renderPage({ fetchTerms })

    expect(
      await screen.findByText('Não foi possível carregar os Termos de Uso agora.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Concluir cadastro' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('"Tentar novamente" que falha de novo mantém o estado de erro, sem quebrar a tela', async () => {
    const user = userEvent.setup()
    const fetchTerms = vi.fn().mockRejectedValue(new Error('network error'))
    renderPage({ fetchTerms })

    await screen.findByRole('button', { name: 'Tentar novamente' })
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(fetchTerms).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByText('Não foi possível carregar os Termos de Uso agora.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })

  it('"Tentar novamente" reexecuta o carregamento e permite prosseguir após sucesso', async () => {
    const user = userEvent.setup()
    const fetchTerms = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(SAMPLE_TERMS)
    renderPage({ fetchTerms })

    await screen.findByRole('button', { name: 'Tentar novamente' })
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))

    await waitFor(() => expect(fetchTerms).toHaveBeenCalledTimes(2))
    expect(
      await screen.findByRole('region', {
        name: 'Texto completo dos Termos de Uso e Política de Privacidade',
      }),
    ).toBeInTheDocument()
  })

  it('formulário inteiro operável só por teclado, do checkbox de termos até o CTA', async () => {
    const user = userEvent.setup()
    renderPage({ fetchTerms: vi.fn().mockResolvedValue(SAMPLE_TERMS) })
    await loadReadyState(user)

    const termsCheckbox = screen.getByRole('checkbox', {
      name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
    })
    termsCheckbox.focus()
    expect(termsCheckbox).toHaveFocus()
    await user.keyboard(' ')
    expect(termsCheckbox).toBeChecked()

    await user.tab()
    const healthCheckbox = screen.getByRole('checkbox', {
      name: /Consentimento específico para dado de saúde: Autorizo especificamente/,
    })
    expect(healthCheckbox).toHaveFocus()
    await user.keyboard(' ')
    expect(healthCheckbox).toBeChecked()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Concluir cadastro' })).toHaveFocus()
  })
})
