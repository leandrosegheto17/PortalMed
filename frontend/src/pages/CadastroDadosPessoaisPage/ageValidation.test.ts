import { describe, expect, it } from 'vitest'
import { MINIMUM_AGE_YEARS, calculateAge, isAdult } from './ageValidation'

describe('calculateAge', () => {
  it('calcula a idade quando o aniversário do ano já passou', () => {
    expect(calculateAge('2000-03-15', new Date(2026, 8, 2))).toBe(26)
  })

  it('calcula a idade no próprio dia do aniversário (inclusive)', () => {
    expect(calculateAge('2008-09-02', new Date(2026, 8, 2))).toBe(18)
  })

  it('não soma o ano corrente quando o aniversário ainda não chegou (um dia antes)', () => {
    expect(calculateAge('2008-09-03', new Date(2026, 8, 2))).toBe(17)
  })

  it('trata corretamente aniversário em 29 de fevereiro contra ano de referência não bissexto', () => {
    // 2008 é bissexto; 2026-03-01 (um dia após o "aniversário" em ano não
    // bissexto, onde o dia 29/fev não existe) já é considerado "passado".
    expect(calculateAge('2008-02-29', new Date(2026, 2, 1))).toBe(18)
    expect(calculateAge('2008-02-29', new Date(2026, 1, 28))).toBe(17)
  })

  it('produz idade negativa para data de nascimento no futuro (nunca normaliza silenciosamente)', () => {
    expect(calculateAge('2030-01-01', new Date(2026, 8, 2))).toBeLessThan(0)
  })

  it('rejeita string em formato inválido', () => {
    expect(() => calculateAge('02/09/2000')).toThrow(/Data de nascimento inválida/)
  })

  it('rejeita data inexistente no calendário (ex.: 31 de abril)', () => {
    expect(() => calculateAge('2000-04-31')).toThrow(/não existe no calendário/)
  })

  it('rejeita 29 de fevereiro em ano não bissexto', () => {
    expect(() => calculateAge('2001-02-29')).toThrow(/não existe no calendário/)
  })
})

describe('isAdult', () => {
  it(`é true a partir de ${MINIMUM_AGE_YEARS} anos completos, inclusive no próprio dia`, () => {
    expect(isAdult('2008-09-02', new Date(2026, 8, 2))).toBe(true)
  })

  it('é false com 17 anos e 364 dias (um dia antes do 18º aniversário)', () => {
    expect(isAdult('2008-09-03', new Date(2026, 8, 2))).toBe(false)
  })

  it('é false para uma criança recém-nascida', () => {
    expect(isAdult('2026-01-01', new Date(2026, 8, 2))).toBe(false)
  })

  it('é true para um paciente claramente idoso', () => {
    expect(isAdult('1950-01-01', new Date(2026, 8, 2))).toBe(true)
  })
})
