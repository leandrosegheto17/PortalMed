import { describe, expect, it } from 'vitest'
import { lookupPatientByCpf } from './patientLookupApi'

describe('lookupPatientByCpf (mock-aware, ver comentário do módulo — BE-18 ainda não publicado)', () => {
  it('resolve de forma otimista (`found: true`) para qualquer CPF, na ausência de uma integração real (RF-14/BE-18)', async () => {
    await expect(lookupPatientByCpf('52998224725')).resolves.toEqual({ found: true })
    await expect(lookupPatientByCpf('00000000000')).resolves.toEqual({ found: true })
  })
})
