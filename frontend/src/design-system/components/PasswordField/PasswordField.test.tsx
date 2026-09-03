import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'
import { DEFAULT_PASSWORD_POLICY } from './passwordPolicy'

function Harness({ externalError }: { externalError?: string | null }) {
  const [value, setValue] = useState('')
  return <PasswordField value={value} onChange={setValue} externalError={externalError} />
}

describe('PasswordField', () => {
  it('associa o label ao campo e começa como type="password"', () => {
    render(<Harness />)
    const input = screen.getByLabelText(/senha/i, { selector: 'input' })
    expect(input).toHaveAttribute('type', 'password')
  })

  it('é navegável por teclado (Tab alcança o campo e o botão de mostrar/ocultar)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    expect(screen.getByLabelText(/senha/i, { selector: 'input' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Mostrar senha' })).toHaveFocus()
  })

  it('alterna a visibilidade da senha, refletindo em type e em aria-pressed', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByLabelText(/senha/i, { selector: 'input' })
    const toggle = screen.getByRole('button', { name: 'Mostrar senha' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('não exibe o indicador de força enquanto o campo está vazio', () => {
    render(<Harness />)
    expect(screen.queryByText(/força da senha/i)).not.toBeInTheDocument()
  })

  it('classifica senha fraca e mostra os critérios pendentes como texto, não só cor', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText(/senha/i, { selector: 'input' }), 'abc')

    expect(screen.getByText('Força da senha: Fraca')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Requisitos de senha' })
    const items = within(list).getAllByRole('listitem')
    // "Uma letra minúscula" já atendido, os demais pendentes — cada item carrega o texto de status.
    const numberItem = items.find((item) => item.textContent?.includes('Um número'))
    expect(numberItem?.textContent).toContain('pendente')
  })

  it('classifica senha forte quando todos os critérios padrão são atendidos', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText(/senha/i, { selector: 'input' }), 'Abcdef12')

    expect(screen.getByText('Força da senha: Forte')).toBeInTheDocument()
    const list = screen.getByRole('list', { name: 'Requisitos de senha' })
    const items = within(list).getAllByRole('listitem')
    for (const item of items) {
      expect(item.textContent).toContain('atendido')
    }
  })

  it('renderiza um item de checklist por critério ativo da política padrão', () => {
    render(<Harness />)
    const list = screen.getByRole('list', { name: 'Requisitos de senha' })
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(4) // minLength + upper + lower + number (special char desligado por padrão)
    expect(screen.getByText(`Pelo menos ${DEFAULT_PASSWORD_POLICY.minLength} caracteres`)).toBeInTheDocument()
  })

  it('aceita política customizada, adicionando o requisito de caractere especial', () => {
    render(
      <PasswordField
        value=""
        onChange={() => {}}
        policy={{ ...DEFAULT_PASSWORD_POLICY, requireSpecialChar: true }}
      />,
    )
    expect(screen.getByText(/um caractere especial/i)).toBeInTheDocument()
  })

  it('exibe erro externo (ex.: falha ao criar conta)', () => {
    render(<Harness externalError="Não foi possível definir a senha." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível definir a senha.')
  })
})
