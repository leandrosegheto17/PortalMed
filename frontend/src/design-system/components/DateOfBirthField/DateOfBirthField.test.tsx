import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { DateOfBirthField } from './DateOfBirthField'

function Harness({ externalError }: { externalError?: string | null }) {
  const [value, setValue] = useState('')
  return (
    <div>
      <DateOfBirthField value={value} onChange={setValue} externalError={externalError} />
      <p data-testid="value">{value}</p>
    </div>
  )
}

describe('DateOfBirthField', () => {
  it('agrupa os três seletores sob um fieldset/legend com o texto informado', () => {
    render(<DateOfBirthField value="" onChange={() => {}} legend="Data de nascimento" />)
    expect(screen.getByRole('group', { name: /data de nascimento/i })).toBeInTheDocument()
  })

  it('expõe Dia, Mês e Ano como três selects com rótulo próprio', () => {
    render(<DateOfBirthField value="" onChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: 'Dia' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Mês' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Ano' })).toBeInTheDocument()
  })

  it('é totalmente navegável e operável por teclado (Tab entre selects, seleção via teclado)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.tab()
    const dayField = screen.getByRole('combobox', { name: 'Dia' })
    expect(dayField).toHaveFocus()

    await user.selectOptions(dayField, '15')
    await user.tab()
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveFocus()
  })

  it('só notifica onChange com data ISO completa quando dia, mês e ano estão preenchidos', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Dia' }), '15')
    expect(screen.getByTestId('value')).toHaveTextContent('')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), 'Março')
    expect(screen.getByTestId('value')).toHaveTextContent('')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ano' }), '2000')
    expect(screen.getByTestId('value')).toHaveTextContent('2000-03-15')
  })

  it('preserva as seleções de dia/ano já feitas ao trocar apenas o mês', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const dayField = screen.getByRole('combobox', { name: 'Dia' })
    const monthField = screen.getByRole('combobox', { name: 'Mês' })
    const yearField = screen.getByRole('combobox', { name: 'Ano' })

    await user.selectOptions(dayField, '10')
    await user.selectOptions(monthField, 'Janeiro')
    await user.selectOptions(yearField, '1990')
    expect(screen.getByTestId('value')).toHaveTextContent('1990-01-10')

    await user.selectOptions(monthField, 'Maio')

    expect(dayField).toHaveValue('10')
    expect(yearField).toHaveValue('1990')
    expect(screen.getByTestId('value')).toHaveTextContent('1990-05-10')
  })

  it('reseta apenas o dia quando ele deixa de existir no mês/ano recém-selecionado (ex.: 31 de janeiro -> fevereiro)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const dayField = screen.getByRole('combobox', { name: 'Dia' })
    const monthField = screen.getByRole('combobox', { name: 'Mês' })
    const yearField = screen.getByRole('combobox', { name: 'Ano' })

    await user.selectOptions(monthField, 'Janeiro')
    await user.selectOptions(yearField, '2021')
    await user.selectOptions(dayField, '31')
    expect(screen.getByTestId('value')).toHaveTextContent('2021-01-31')

    await user.selectOptions(monthField, 'Fevereiro')

    expect(dayField).toHaveValue('')
    expect(monthField).toHaveValue('02')
    expect(yearField).toHaveValue('2021')
    expect(screen.getByTestId('value')).toHaveTextContent('')
  })

  it('limita as opções de dia ao número de dias do mês/ano selecionado (fevereiro não bissexto = 28 dias)', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.selectOptions(screen.getByRole('combobox', { name: 'Mês' }), 'Fevereiro')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Ano' }), '2021')

    const dayField = screen.getByRole('combobox', { name: 'Dia' }) as HTMLSelectElement
    const optionValues = Array.from(dayField.options).map((o) => o.value)
    expect(optionValues).toContain('28')
    expect(optionValues).not.toContain('29')
  })

  it('exibe o texto de apoio (RN-01) associado ao grupo', () => {
    render(<DateOfBirthField value="" onChange={() => {}} helperText="Explicação da coleta." />)
    expect(screen.getByText('Explicação da coleta.')).toBeInTheDocument()
  })

  it('exibe erro externo associado ao grupo', () => {
    render(<Harness externalError="Data inválida." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Data inválida.')
  })

  it('omite o marcador de obrigatoriedade quando required é false', () => {
    render(<DateOfBirthField value="" onChange={() => {}} required={false} />)
    expect(screen.queryByText('*')).not.toBeInTheDocument()
  })

  it('desabilita os três selects quando disabled', () => {
    render(<DateOfBirthField value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('combobox', { name: 'Dia' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Mês' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Ano' })).toBeDisabled()
  })
})
