import { describe, expect, it } from 'vitest'
import { isPasswordValid } from './passwordValidation'

describe('isPasswordValid', () => {
  it('rejeita senha curta demais', () => {
    expect(isPasswordValid('Ab1')).toBe(false)
  })

  it('rejeita senha sem maiúscula', () => {
    expect(isPasswordValid('abcdef12')).toBe(false)
  })

  it('rejeita senha sem minúscula', () => {
    expect(isPasswordValid('ABCDEF12')).toBe(false)
  })

  it('rejeita senha sem número', () => {
    expect(isPasswordValid('Abcdefgh')).toBe(false)
  })

  it('aceita senha que atende à política default (min. 8, maiúscula, minúscula, número)', () => {
    expect(isPasswordValid('Abcdef12')).toBe(true)
  })

  it('respeita uma política customizada (ex.: exigindo caractere especial)', () => {
    const policy = {
      minLength: 6,
      requireUppercase: false,
      requireLowercase: false,
      requireNumber: false,
      requireSpecialChar: true,
    }
    expect(isPasswordValid('abcdef', policy)).toBe(false)
    expect(isPasswordValid('abc!de', policy)).toBe(true)
  })
})
