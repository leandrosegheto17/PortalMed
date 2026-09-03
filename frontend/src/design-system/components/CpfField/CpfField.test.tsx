import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { CpfField } from './CpfField'
import { formatCpf, isValidCpf } from './cpf'

// CPF válido de teste (dígito verificador correto, gerado com o algoritmo padrão).
const VALID_CPF = '52998224725'

function Harness({ externalError }: { externalError?: string | null }) {
  const [value, setValue] = useState('')
  return <CpfField value={value} onChange={setValue} externalError={externalError} />
}

describe('formatCpf', () => {
  it('formata progressivamente conforme os dígitos são digitados', () => {
    expect(formatCpf('5')).toBe('5')
    expect(formatCpf('529')).toBe('529')
    expect(formatCpf('5299822')).toBe('529.982.2')
    expect(formatCpf('529982247')).toBe('529.982.247')
    expect(formatCpf('52998224725')).toBe('529.982.247-25')
  })

  it('ignora dígitos além do 11º', () => {
    expect(formatCpf('529982247259999')).toBe('529.982.247-25')
  })
})

describe('isValidCpf', () => {
  it('aceita CPF com dígito verificador correto', () => {
    expect(isValidCpf(VALID_CPF)).toBe(true)
  })

  it('rejeita CPF incompleto', () => {
    expect(isValidCpf('529982247')).toBe(false)
  })

  it('rejeita CPF com dígito verificador incorreto', () => {
    expect(isValidCpf('52998224700')).toBe(false)
  })

  it('rejeita sequência de dígitos repetidos', () => {
    expect(isValidCpf('11111111111')).toBe(false)
  })
})

describe('CpfField', () => {
  it('associa o label ao campo programaticamente', () => {
    render(<Harness />)
    expect(screen.getByRole('textbox', { name: /cpf/i })).toBeInTheDocument()
  })

  it('é navegável e preenchível por teclado, exibindo a máscara conforme digita', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    const input = screen.getByRole('textbox', { name: /cpf/i })
    expect(input).toHaveFocus()

    await user.type(input, VALID_CPF)
    expect(input).toHaveValue('529.982.247-25')
  })

  it('ignora caracteres não numéricos digitados/colados', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('textbox', { name: /cpf/i })
    await user.type(input, '529.982.247-25abc')
    expect(input).toHaveValue('529.982.247-25')
  })

  it('não exibe erro antes do campo perder o foco (touched)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('textbox', { name: /cpf/i }), '123')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('exibe erro de formato ao perder o foco com CPF incompleto', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('textbox', { name: /cpf/i })
    await user.type(input, '123')
    await user.tab()

    expect(screen.getByRole('alert')).toHaveTextContent('CPF inválido. Verifique os números digitados.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('exibe erro de formato ao perder o foco com dígito verificador inválido', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('textbox', { name: /cpf/i })
    await user.type(input, '11111111111')
    await user.tab()

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('não exibe erro quando o CPF é válido e completo', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = screen.getByRole('textbox', { name: /cpf/i })
    await user.type(input, VALID_CPF)
    await user.tab()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('exibe erro externo (ex.: CPF não localizado no hospital) mesmo com formato válido', () => {
    render(<Harness externalError="CPF não localizado no sistema do hospital." />)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'CPF não localizado no sistema do hospital.',
    )
  })
})
