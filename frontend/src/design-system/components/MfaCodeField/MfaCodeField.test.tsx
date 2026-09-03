import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MfaCodeField } from './MfaCodeField'

function Harness({
  length = 6,
  onComplete,
  externalError,
  disabled,
}: {
  length?: number
  onComplete?: (code: string) => void
  externalError?: string | null
  disabled?: boolean
}) {
  const [value, setValue] = useState('')
  return (
    <MfaCodeField
      length={length}
      value={value}
      onChange={setValue}
      onComplete={onComplete}
      externalError={externalError}
      disabled={disabled}
    />
  )
}

function getCells(length = 6) {
  return Array.from({ length }, (_, i) =>
    screen.getByRole('textbox', { name: `Dígito ${i + 1} de ${length} do código de verificação` }),
  )
}

describe('MfaCodeField', () => {
  it('renderiza 6 campos por padrão, cada um com aria-label distinto', () => {
    render(<Harness />)
    const cells = getCells()
    expect(cells).toHaveLength(6)
  })

  it('agrupa os campos com role="group" rotulado', () => {
    render(<Harness />)
    expect(screen.getByRole('group', { name: 'Código de verificação' })).toBeInTheDocument()
  })

  it('é navegável por teclado — Tab alcança o primeiro campo', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(getCells()[0]).toHaveFocus()
  })

  it('digitar um dígito avança automaticamente o foco para a próxima caixa', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cells = getCells()

    await user.click(cells[0])
    await user.keyboard('1')
    expect(cells[1]).toHaveFocus()
    await user.keyboard('2')
    expect(cells[2]).toHaveFocus()
  })

  it('Backspace em caixa vazia move o foco para a caixa anterior e a limpa', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cells = getCells()

    await user.click(cells[0])
    await user.keyboard('12')
    expect(cells[2]).toHaveFocus()

    await user.keyboard('{Backspace}')
    expect(cells[1]).toHaveFocus()
    expect(cells[1]).toHaveValue('')

    await user.keyboard('{Backspace}')
    expect(cells[0]).toHaveFocus()
    expect(cells[0]).toHaveValue('')
  })

  it('ArrowLeft/ArrowRight navegam entre as caixas sem depender de mouse', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cells = getCells()

    await user.click(cells[2])
    await user.keyboard('{ArrowLeft}')
    expect(cells[1]).toHaveFocus()
    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(cells[3]).toHaveFocus()
  })

  it('cola o código completo na primeira caixa e distribui por todas — chama onComplete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const cells = getCells()

    await user.click(cells[0])
    await user.paste('123456')

    cells.forEach((cell, index) => {
      expect(cell).toHaveValue(String(index + 1))
    })
    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('cola o código completo em uma caixa do meio e ainda assim preenche tudo (critério de aceite de FE-03)', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const cells = getCells()

    await user.click(cells[3])
    await user.paste('987654')

    cells.forEach((cell, index) => {
      expect(cell).toHaveValue(String('987654'[index]))
    })
    expect(onComplete).toHaveBeenCalledWith('987654')
  })

  it('paste com caracteres não numéricos é filtrado antes de distribuir', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cells = getCells()

    await user.click(cells[0])
    await user.paste('12-34 56')

    cells.forEach((cell, index) => {
      expect(cell).toHaveValue(String(index + 1))
    })
  })

  it('paste parcial (menos dígitos que o total) preenche a partir da primeira caixa sem chamar onComplete', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const cells = getCells()

    await user.click(cells[0])
    await user.paste('12')

    expect(cells[0]).toHaveValue('1')
    expect(cells[1]).toHaveValue('2')
    expect(cells[2]).toHaveValue('')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('digitar os 6 dígitos, um a um, também dispara onComplete ao terminar (não depende de paste)', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness onComplete={onComplete} />)
    const cells = getCells()

    await user.click(cells[0])
    await user.keyboard('123456')

    expect(onComplete).toHaveBeenCalledWith('123456')
  })

  it('apagar o dígito de uma caixa preenchida (sem passar pela caixa vazia seguinte) limpa só aquela caixa', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const cells = getCells()

    await user.click(cells[0])
    await user.keyboard('5')
    expect(cells[0]).toHaveValue('5')

    await user.click(cells[0])
    await user.keyboard('{Backspace}')
    expect(cells[0]).toHaveValue('')
  })

  it('múltiplos dígitos entregues de uma vez por um único evento de mudança (ex.: autofill/IME) também preenchem a partir da primeira caixa', () => {
    render(<Harness />)
    const cells = getCells()

    fireEvent.change(cells[2], { target: { value: '789' } })

    expect(cells[0]).toHaveValue('7')
    expect(cells[1]).toHaveValue('8')
    expect(cells[2]).toHaveValue('9')
  })

  it('respeita o comprimento customizado (ex.: 4 dígitos)', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<Harness length={4} onComplete={onComplete} />)
    const cells = getCells(4)
    expect(cells).toHaveLength(4)

    await user.click(cells[0])
    await user.paste('1234')
    expect(onComplete).toHaveBeenCalledWith('1234')
  })

  it('desabilita todos os campos quando disabled', () => {
    render(<Harness disabled />)
    for (const cell of getCells()) {
      expect(cell).toBeDisabled()
    }
  })

  it('exibe erro externo associado ao grupo, com role="alert"', () => {
    render(<Harness externalError="Código inválido ou expirado." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Código inválido ou expirado.')
    for (const cell of getCells()) {
      expect(cell).toHaveAttribute('aria-invalid', 'true')
    }
  })
})
