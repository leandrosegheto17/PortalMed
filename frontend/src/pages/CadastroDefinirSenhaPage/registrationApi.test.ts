import { describe, expect, it } from 'vitest'
import { submitRegistration } from './registrationApi'

describe('submitRegistration (mock-aware, ver comentário do módulo — BE-18/BE-19 ainda não publicados)', () => {
  it('resolve com sucesso e nunca retorna token/sessão (garantia estrutural de login não automático)', async () => {
    const result = await submitRegistration({ senha: 'Abcdef12' })

    expect(result).toEqual({ success: true })
    expect(Object.keys(result)).toEqual(['success'])
  })
})
