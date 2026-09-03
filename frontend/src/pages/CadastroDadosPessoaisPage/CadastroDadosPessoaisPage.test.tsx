import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import { CadastroBloqueioMenorIdadePage } from '../CadastroBloqueioMenorIdadePage/CadastroBloqueioMenorIdadePage'
import { CadastroCpfNaoLocalizadoPage } from '../CadastroCpfNaoLocalizadoPage/CadastroCpfNaoLocalizadoPage'
import { CadastroDadosPessoaisPage } from './CadastroDadosPessoaisPage'
import type { PatientLookupResult } from './patientLookupApi'

const VALID_CPF = '52998224725'
const CURRENT_YEAR = new Date().getFullYear()
// Larga margem (30/5 anos) para nunca depender de qual é o dia "hoje" do
// ambiente de CI em relação ao aniversário — evita teste instável por data.
const ADULT_YEAR = String(CURRENT_YEAR - 30)
const MINOR_YEAR = String(CURRENT_YEAR - 5)

function TestRoutes({
  lookupPatientByCpf,
}: {
  lookupPatientByCpf?: (cpf: string) => Promise<PatientLookupResult>
}) {
  return (
    <Routes>
      <Route
        path="/criar-conta"
        element={<CadastroDadosPessoaisPage lookupPatientByCpf={lookupPatientByCpf} />}
      />
      <Route path="/criar-conta/bloqueio-idade" element={<CadastroBloqueioMenorIdadePage />} />
      <Route
        path="/criar-conta/cpf-nao-localizado"
        element={<CadastroCpfNaoLocalizadoPage />}
      />
      <Route path="/criar-conta/termos" element={<h1>Termos e Consentimento</h1>} />
      <Route path="/" element={<h1>Bem-vindo(a) ao Portal de Resultados de Exames</h1>} />
      <Route path="/entrar" element={<h1>Entrar</h1>} />
    </Routes>
  )
}

function renderPage(lookupPatientByCpf?: (cpf: string) => Promise<PatientLookupResult>) {
  return render(
    <MemoryRouter initialEntries={['/criar-conta']}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <TestRoutes lookupPatientByCpf={lookupPatientByCpf} />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

async function fillValidForm(user: UserEvent, birthYear: string) {
  await user.type(screen.getByRole('textbox', { name: /nome completo/i }), 'Maria da Silva')
  await user.type(screen.getByRole('textbox', { name: /cpf/i }), VALID_CPF)
  await user.selectOptions(screen.getByLabelText('Dia'), '15')
  await user.selectOptions(screen.getByLabelText('Mês'), 'Março')
  await user.selectOptions(screen.getByLabelText('Ano'), birthYear)
  await user.type(screen.getByRole('textbox', { name: /e-mail/i }), 'maria@example.com')
  await user.type(screen.getByRole('textbox', { name: /celular/i }), '11988887777')
}

describe('CadastroDadosPessoaisPage (TL-02)', () => {
  it('renderiza todos os campos do formulário com rótulo programático e o CTA único "Continuar"', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /nome completo/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /cpf/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: /data de nascimento/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /e-mail/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /celular/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('exibe o texto de apoio explicando o motivo da coleta da data de nascimento (RN-01, transparência)', () => {
    renderPage()

    expect(
      screen.getByText(/confirmar que você tem 18 anos ou mais/i),
    ).toBeInTheDocument()
  })

  it('sem submissão parcial: clicar em "Continuar" com o formulário vazio revela erro em todos os campos obrigatórios e não navega', async () => {
    const user = userEvent.setup()
    const lookup = vi.fn()
    renderPage(lookup)

    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByText('Informe seu nome completo.')).toBeInTheDocument()
    expect(screen.getByText('CPF inválido. Verifique os números digitados.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua data de nascimento completa.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu celular.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    expect(lookup).not.toHaveBeenCalled()
  })

  it('exibe erro de formato de e-mail inline ao perder o foco com valor incompleto', async () => {
    const user = userEvent.setup()
    renderPage()

    const emailInput = screen.getByRole('textbox', { name: /e-mail/i })
    await user.type(emailInput, 'nao-e-um-email')
    await user.tab()

    expect(
      screen.getByText('E-mail inválido. Verifique o endereço digitado.'),
    ).toBeInTheDocument()
  })

  it('exibe erro de celular inline ao perder o foco com número incompleto/inválido (não só vazio)', async () => {
    const user = userEvent.setup()
    renderPage()

    const celularInput = screen.getByRole('textbox', { name: /celular/i })
    await user.type(celularInput, '1198888')
    await user.tab()

    expect(
      screen.getByText('Celular inválido. Verifique o número digitado (com DDD).'),
    ).toBeInTheDocument()
  })

  it('máscara o celular progressivamente conforme os dígitos são digitados', async () => {
    const user = userEvent.setup()
    renderPage()

    const celularInput = screen.getByRole('textbox', { name: /celular/i })
    await user.type(celularInput, '11988887777')

    expect(celularInput).toHaveValue('(11) 98888-7777')
  })

  describe('RN-01 — bloqueio de menor de idade, sem exceção', () => {
    it('idade < 18 anos bloqueia o cadastro e navega para TL-03, sem nenhuma chamada ao serviço de match de CPF', async () => {
      const user = userEvent.setup()
      const lookup = vi.fn().mockResolvedValue({ found: true } satisfies PatientLookupResult)
      renderPage(lookup)

      await fillValidForm(user, MINOR_YEAR)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(
        await screen.findByRole('heading', {
          level: 1,
          name: 'Autoatendimento digital indisponível para menores de idade',
        }),
      ).toBeInTheDocument()
      expect(lookup).not.toHaveBeenCalled()
    }, 15000)

    it('a tela de bloqueio (TL-03) não oferece nenhum caminho de volta ao formulário para tentar outra data — único CTA é "Voltar à página inicial"', async () => {
      const user = userEvent.setup()
      renderPage(vi.fn().mockResolvedValue({ found: true }))

      await fillValidForm(user, MINOR_YEAR)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))
      await screen.findByRole('heading', { name: 'Autoatendimento digital indisponível para menores de idade' })

      expect(screen.getAllByRole('link').filter((el) => el.closest('main'))).toHaveLength(1)
      expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveAttribute(
        'href',
        '/',
      )
      expect(screen.queryByText(/outra data/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/tentar novamente/i)).not.toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    }, 15000)
  })

  describe('RF-15 — CPF não localizado no sistema do hospital (TL-04)', () => {
    it('idade válida + CPF não localizado navega para TL-04, orientando a recepção do hospital', async () => {
      const user = userEvent.setup()
      const lookup = vi.fn().mockResolvedValue({ found: false } satisfies PatientLookupResult)
      renderPage(lookup)

      await fillValidForm(user, ADULT_YEAR)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'CPF não localizado' }),
      ).toBeInTheDocument()
      expect(screen.getByText(/recepção do hospital/i)).toBeInTheDocument()
      expect(lookup).toHaveBeenCalledWith(VALID_CPF)
      expect(screen.getByRole('link', { name: 'Já tenho cadastro, entrar' })).toHaveAttribute(
        'href',
        '/entrar',
      )
    }, 15000)

    it('idade válida + CPF localizado avança para a próxima etapa do fluxo (TL-05, placeholder de FE-07)', async () => {
      const user = userEvent.setup()
      const lookup = vi.fn().mockResolvedValue({ found: true } satisfies PatientLookupResult)
      renderPage(lookup)

      await fillValidForm(user, ADULT_YEAR)
      await user.click(screen.getByRole('button', { name: 'Continuar' }))

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Termos e Consentimento' }),
      ).toBeInTheDocument()
    }, 15000)
  })

  it('exibe um spinner/estado de carregamento no botão "Continuar" durante a validação de CPF (UX-SPEC.md TL-02)', async () => {
    const user = userEvent.setup()
    let resolveLookup!: (result: PatientLookupResult) => void
    const lookup = vi.fn(
      () =>
        new Promise<PatientLookupResult>((resolve) => {
          resolveLookup = resolve
        }),
    )
    renderPage(lookup)

    await fillValidForm(user, ADULT_YEAR)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    const button = await screen.findByRole('button', { name: 'Validando…' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    resolveLookup({ found: true })
    await screen.findByRole('heading', { level: 1, name: 'Termos e Consentimento' })
  }, 15000)

  it('falha ao validar o CPF (erro de rede do serviço mock) exibe mensagem de erro inline e permite nova tentativa, sem navegar', async () => {
    const user = userEvent.setup()
    const lookup = vi.fn().mockRejectedValue(new Error('network error'))
    renderPage(lookup)

    await fillValidForm(user, ADULT_YEAR)
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(
      await screen.findByText('Não foi possível validar seus dados agora. Tente novamente em instantes.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Criar conta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).not.toBeDisabled()
  }, 15000)

  it('todo o formulário é preenchível e submetível apenas por teclado (Tab + digitação + Enter), sem depender de mouse', async () => {
    const user = userEvent.setup()
    const lookup = vi.fn().mockResolvedValue({ found: true } satisfies PatientLookupResult)
    renderPage(lookup)

    await user.tab() // nome completo
    expect(screen.getByRole('textbox', { name: /nome completo/i })).toHaveFocus()
    await user.keyboard('Maria da Silva')

    await user.tab() // CPF
    expect(screen.getByRole('textbox', { name: /cpf/i })).toHaveFocus()
    await user.keyboard(VALID_CPF)

    await user.tab() // Dia
    await user.selectOptions(screen.getByLabelText('Dia'), '15')
    await user.tab() // Mês
    await user.selectOptions(screen.getByLabelText('Mês'), 'Março')
    await user.tab() // Ano
    await user.selectOptions(screen.getByLabelText('Ano'), ADULT_YEAR)

    await user.tab() // e-mail
    expect(screen.getByRole('textbox', { name: /e-mail/i })).toHaveFocus()
    await user.keyboard('maria@example.com')

    await user.tab() // celular
    expect(screen.getByRole('textbox', { name: /celular/i })).toHaveFocus()
    await user.keyboard('11988887777')

    await user.tab() // botão Continuar
    expect(screen.getByRole('button', { name: 'Continuar' })).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(lookup).toHaveBeenCalledWith(VALID_CPF))
  }, 15000)
})
