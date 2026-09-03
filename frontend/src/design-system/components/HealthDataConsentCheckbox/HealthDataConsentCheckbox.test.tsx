import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TermsAcceptanceCheckbox } from '../TermsAcceptanceCheckbox/TermsAcceptanceCheckbox'
import { HealthDataConsentCheckbox } from './HealthDataConsentCheckbox'

function Harness() {
  const [checked, setChecked] = useState(false)
  return <HealthDataConsentCheckbox checked={checked} onChange={setChecked} />
}

describe('HealthDataConsentCheckbox', () => {
  it('é agrupado em role="group" com nome acessível próprio', () => {
    render(<Harness />)
    expect(
      screen.getByRole('group', { name: 'Consentimento específico para dado de saúde' }),
    ).toBeInTheDocument()
  })

  it('o accessible name do próprio checkbox combina o rótulo do grupo com o texto de consentimento (distinção programática, não só visual)', () => {
    render(<Harness />)
    const checkbox = screen.getByRole('checkbox', {
      name: 'Consentimento específico para dado de saúde: Autorizo especificamente o tratamento dos meus dados de saúde para os fins descritos na Política de Privacidade',
    })
    expect(checkbox).toBeInTheDocument()
  })

  it('exibe o selo textual + ícone de destaque (nunca só cor)', () => {
    render(<Harness />)
    const group = screen.getByRole('group', { name: 'Consentimento específico para dado de saúde' })
    expect(group.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
    expect(screen.getByText('Consentimento específico para dado de saúde')).toBeInTheDocument()
  })

  it('exibe o texto de apoio explicando a separação exigida por RN-02', () => {
    render(<Harness />)
    expect(
      screen.getByText(/exigido separadamente do aceite geral dos termos de uso/i),
    ).toBeInTheDocument()
  })

  it('é navegável e operável por teclado (Tab + Espaço)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveFocus()
    expect(checkbox).not.toBeChecked()

    await user.keyboard(' ')
    expect(checkbox).toBeChecked()
  })

  it('aceita rótulo/texto de apoio customizados', () => {
    render(
      <HealthDataConsentCheckbox
        checked={false}
        onChange={() => {}}
        label="Texto customizado de consentimento"
        helperText="Apoio customizado"
      />,
    )
    expect(screen.getByText('Apoio customizado')).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', {
        name: 'Consentimento específico para dado de saúde: Texto customizado de consentimento',
      }),
    ).toBeInTheDocument()
  })

  it('respeita disabled', () => {
    render(<HealthDataConsentCheckbox checked={false} onChange={() => {}} disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('omite o texto de apoio e o aria-describedby quando helperText é vazio', () => {
    render(<HealthDataConsentCheckbox checked={false} onChange={() => {}} helperText="" />)
    expect(
      screen.queryByText(/exigido separadamente do aceite geral dos termos de uso/i),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toHaveAttribute('aria-describedby')
  })

  describe('distinção em relação a TermsAcceptanceCheckbox (RN-02, critério de aceite de FE-03)', () => {
    function Both() {
      const [terms, setTerms] = useState(false)
      const [health, setHealth] = useState(false)
      return (
        <div>
          <TermsAcceptanceCheckbox checked={terms} onChange={setTerms} />
          <HealthDataConsentCheckbox checked={health} onChange={setHealth} />
        </div>
      )
    }

    it('renderiza dois checkboxes com nomes acessíveis distintos, e só um deles está dentro de um grupo nomeado', () => {
      render(<Both />)

      const termsCheckbox = screen.getByRole('checkbox', {
        name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
      })
      const healthCheckbox = screen.getByRole('checkbox', {
        name: /^Consentimento específico para dado de saúde:/,
      })

      expect(termsCheckbox).not.toBe(healthCheckbox)
      expect(screen.getAllByRole('checkbox')).toHaveLength(2)
      expect(screen.getAllByRole('group')).toHaveLength(1)

      const group = screen.getByRole('group', { name: 'Consentimento específico para dado de saúde' })
      expect(group.contains(healthCheckbox)).toBe(true)
      expect(group.contains(termsCheckbox)).toBe(false)
    })

    it('marcar um checkbox não afeta o estado do outro (registros independentes, RN-02)', async () => {
      const user = userEvent.setup()
      render(<Both />)

      const termsCheckbox = screen.getByRole('checkbox', {
        name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
      })
      const healthCheckbox = screen.getByRole('checkbox', {
        name: /^Consentimento específico para dado de saúde:/,
      })

      await user.click(termsCheckbox)
      expect(termsCheckbox).toBeChecked()
      expect(healthCheckbox).not.toBeChecked()

      await user.click(healthCheckbox)
      expect(termsCheckbox).toBeChecked()
      expect(healthCheckbox).toBeChecked()
    })
  })
})
