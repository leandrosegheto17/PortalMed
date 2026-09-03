import { describe, expect, it } from 'vitest'
import { fetchBrandingConfig, fetchBrandingConfigMock } from './brandingApi'

describe('fetchBrandingConfig (mock-aware — ver comentário no arquivo)', () => {
  it('resolve com um BrandingConfig válido a partir da fixture local', async () => {
    const result = await fetchBrandingConfig()

    expect(result.colorPrimary).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    expect(result.logoUrl).toMatch(/^https?:\/\//)
    expect(result.tenantId).toBeTruthy()
    expect(result.statusValidacaoContraste).toBe('aprovado')
  })

  it('fetchBrandingConfigMock produz o mesmo resultado que fetchBrandingConfig hoje (delegação direta)', async () => {
    const [viaFacade, viaMock] = await Promise.all([
      fetchBrandingConfig(),
      fetchBrandingConfigMock(),
    ])

    expect(viaFacade).toEqual(viaMock)
  })
})
