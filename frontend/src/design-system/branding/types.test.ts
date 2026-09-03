import { describe, expect, it } from 'vitest'
import { InvalidBrandingConfigError, mapRawToBrandingConfig } from './types'
import type { RawBrandingConfigDTO } from './types'

function buildRaw(overrides: Partial<RawBrandingConfigDTO> = {}): RawBrandingConfigDTO {
  return {
    id: 'branding-1',
    tenant_id: 'tenant-hospital-piloto',
    logo_url: 'https://cdn.example.com/hospital-piloto/logo.png',
    paleta_cores: JSON.stringify({ primary: '#0057B8' }),
    status_validacao_contraste: 'aprovado',
    metodo_validacao: 'automatizado',
    validado_por: 'account-equipe-interna',
    validado_em: '2026-08-01T10:00:00Z',
    observacoes_validacao: null,
    ...overrides,
  }
}

describe('mapRawToBrandingConfig', () => {
  it('mapeia o DTO bruto (snake_case, formato SDD.md) para o tipo interno', () => {
    const result = mapRawToBrandingConfig(buildRaw())

    expect(result).toEqual({
      tenantId: 'tenant-hospital-piloto',
      logoUrl: 'https://cdn.example.com/hospital-piloto/logo.png',
      colorPrimary: '#0057B8',
      statusValidacaoContraste: 'aprovado',
    })
  })

  it('lança InvalidBrandingConfigError quando paleta_cores não é JSON válido', () => {
    expect(() =>
      mapRawToBrandingConfig(buildRaw({ paleta_cores: 'não é json' })),
    ).toThrow(InvalidBrandingConfigError)
  })

  it('lança InvalidBrandingConfigError quando paleta_cores.primary está ausente', () => {
    expect(() =>
      mapRawToBrandingConfig(buildRaw({ paleta_cores: JSON.stringify({}) })),
    ).toThrow(InvalidBrandingConfigError)
  })

  it('lança InvalidBrandingConfigError quando paleta_cores.primary não é um hex válido', () => {
    expect(() =>
      mapRawToBrandingConfig(
        buildRaw({ paleta_cores: JSON.stringify({ primary: 'azul' }) }),
      ),
    ).toThrow(InvalidBrandingConfigError)
  })

  it('lança InvalidBrandingConfigError quando logo_url está ausente', () => {
    expect(() => mapRawToBrandingConfig(buildRaw({ logo_url: '' }))).toThrow(
      InvalidBrandingConfigError,
    )
  })

  it('aceita hex shorthand de 3 dígitos', () => {
    const result = mapRawToBrandingConfig(
      buildRaw({ paleta_cores: JSON.stringify({ primary: '#0AF' }) }),
    )
    expect(result.colorPrimary).toBe('#0AF')
  })
})
