import { describe, expect, it } from 'vitest'
import { fetchActiveTerms } from './termsApi'

describe('fetchActiveTerms (mock-aware, ver comentário do módulo — BE-19 ainda não publicado)', () => {
  it('resolve conteúdo de Termos de Uso e Política de Privacidade com uma versão definida', async () => {
    const result = await fetchActiveTerms()

    expect(result.version).toBe('1.0.0')
    expect(result.termsOfUseText.length).toBeGreaterThan(0)
    expect(result.privacyPolicyText.length).toBeGreaterThan(0)
  })
})
