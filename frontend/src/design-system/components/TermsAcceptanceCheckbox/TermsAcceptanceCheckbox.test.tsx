import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { TermsAcceptanceCheckbox } from './TermsAcceptanceCheckbox'

function Harness() {
  const [checked, setChecked] = useState(false)
  return <TermsAcceptanceCheckbox checked={checked} onChange={setChecked} />
}

describe('TermsAcceptanceCheckbox', () => {
  it('renderiza um checkbox com o texto padrão de aceite geral dos Termos', () => {
    render(<Harness />)
    expect(
      screen.getByRole('checkbox', {
        name: 'Li e aceito os Termos de Uso e a Política de Privacidade',
      }),
    ).toBeInTheDocument()
  })

  it('não é agrupado em role="group" — distinto do consentimento de dado de saúde', () => {
    render(<Harness />)
    expect(screen.queryByRole('group')).not.toBeInTheDocument()
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

  it('aceita rótulo customizado', () => {
    render(
      <TermsAcceptanceCheckbox checked={false} onChange={() => {}} label="Texto customizado" />,
    )
    expect(screen.getByRole('checkbox', { name: 'Texto customizado' })).toBeInTheDocument()
  })

  it('respeita disabled', () => {
    render(<TermsAcceptanceCheckbox checked={false} onChange={() => {}} disabled />)
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })
})
