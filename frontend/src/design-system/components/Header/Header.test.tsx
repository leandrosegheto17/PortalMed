import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../branding/BrandTokensProvider'
import type { BrandingConfig } from '../../branding/types'
import { Header } from './Header'

function buildBrandingConfig(overrides: Partial<BrandingConfig> = {}): BrandingConfig {
  return {
    tenantId: 'tenant-1',
    logoUrl: 'https://cdn.example.com/hospital-piloto/logo.svg',
    colorPrimary: '#2E7D32',
    statusValidacaoContraste: 'aprovado',
    ...overrides,
  }
}

describe('Header institucional', () => {
  it('renderiza o nome do hospital imediatamente, mesmo antes da marca carregar', () => {
    const fetchFn = vi.fn(() => new Promise<BrandingConfig>(() => {}))

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={document.createElement('div')}>
        <Header hospitalName="Hospital Piloto" />
      </BrandTokensProvider>,
    )

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Hospital Piloto')).toBeInTheDocument()
    // Logo ainda não disponível — não deve renderizar uma <img> quebrada.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('renderiza o logo dinamicamente por tenant assim que BRANDING_CONFIG carrega (via BrandTokensProvider)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      buildBrandingConfig({ logoUrl: 'https://cdn.example.com/tenant-x/logo.svg' }),
    )

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={document.createElement('div')}>
        <Header hospitalName="Hospital Tenant X" />
      </BrandTokensProvider>,
    )

    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'https://cdn.example.com/tenant-x/logo.svg',
      ),
    )
    // alt text nunca vazio (nunca decorativo puro) — identifica a instituição.
    expect(screen.getByRole('img')).toHaveAccessibleName(/Hospital Tenant X/)
  })

  it('não quebra quando a busca de branding falha — hospital ainda visível', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error('falha de rede'))

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={document.createElement('div')}>
        <Header hospitalName="Hospital Piloto" />
      </BrandTokensProvider>,
    )

    await waitFor(() => expect(fetchFn).toHaveBeenCalled())
    expect(screen.getByText('Hospital Piloto')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('exige BrandTokensProvider como ancestral (erro claro em vez de crash silencioso)', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Header hospitalName="Hospital Piloto" />)).toThrow(
      'useBrandingTokensStatus precisa ser usado dentro de <BrandTokensProvider>.',
    )

    consoleErrorSpy.mockRestore()
  })

  it('aceita um slot de navegação (composição com o componente Navigation)', () => {
    const fetchFn = vi.fn(() => new Promise<BrandingConfig>(() => {}))

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={document.createElement('div')}>
        <Header hospitalName="Hospital Piloto" navigationSlot={<nav aria-label="teste" />} />
      </BrandTokensProvider>,
    )

    expect(screen.getByRole('navigation', { name: 'teste' })).toBeInTheDocument()
  })
})
