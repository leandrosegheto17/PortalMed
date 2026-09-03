import { describe, expect, it } from 'vitest'
import { formatPhone, isValidPhoneDigits, onlyDigits } from './phone'

describe('onlyDigits', () => {
  it('remove tudo que não é dígito', () => {
    expect(onlyDigits('(11) 98888-7777')).toBe('11988887777')
  })
})

describe('formatPhone', () => {
  it('formata progressivamente conforme os dígitos são digitados', () => {
    expect(formatPhone('1')).toBe('(1')
    expect(formatPhone('11')).toBe('(11')
    expect(formatPhone('119')).toBe('(11) 9')
    expect(formatPhone('1198888')).toBe('(11) 9-8888')
    expect(formatPhone('11988887777')).toBe('(11) 98888-7777')
  })

  it('formata um telefone fixo (10 dígitos, sem 9 inicial)', () => {
    expect(formatPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('ignora dígitos além do 11º', () => {
    expect(formatPhone('119888877779999')).toBe('(11) 98888-7777')
  })

  it('ignora caracteres não numéricos', () => {
    expect(formatPhone('(11) 98888-7777')).toBe('(11) 98888-7777')
  })

  it('retorna vazio para entrada vazia', () => {
    expect(formatPhone('')).toBe('')
  })
})

describe('isValidPhoneDigits', () => {
  it('aceita celular válido (11 dígitos, 9 após o DDD)', () => {
    expect(isValidPhoneDigits('11988887777')).toBe(true)
  })

  it('aceita fixo válido (10 dígitos)', () => {
    expect(isValidPhoneDigits('1133334444')).toBe(true)
  })

  it('rejeita 11 dígitos sem o 9 na posição correta', () => {
    expect(isValidPhoneDigits('11888887777')).toBe(false)
  })

  it('rejeita quantidade de dígitos incompleta', () => {
    expect(isValidPhoneDigits('119888')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidPhoneDigits('')).toBe(false)
  })
})
