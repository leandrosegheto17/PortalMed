import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from './BrandTokensProvider'
import { useBrandingTokensStatus } from './brandingTokensContext'
import type { BrandingConfig } from './types'

function buildBrandingConfig(overrides: Partial<BrandingConfig> = {}): BrandingConfig {
  return {
    tenantId: 'tenant-1',
    logoUrl: 'https://cdn.example.com/logo.svg',
    colorPrimary: '#7A1F2B',
    statusValidacaoContraste: 'aprovado',
    ...overrides,
  }
}

function StatusProbe() {
  const { status } = useBrandingTokensStatus()
  return <span data-testid="status">{status}</span>
}

describe('BrandTokensProvider', () => {
  it('renderiza os children imediatamente, sem bloquear no carregamento da marca', () => {
    const fetchFn = vi.fn(() => new Promise<BrandingConfig>(() => {}))
    const el = document.createElement('div')

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={el}>
        <p>Conteúdo da aplicação</p>
      </BrandTokensProvider>,
    )

    expect(screen.getByText('Conteúdo da aplicação')).toBeInTheDocument()
  })

  it('aplica os tokens de marca no target assim que a busca resolve', async () => {
    const el = document.createElement('div')
    const fetchFn = vi.fn().mockResolvedValue(buildBrandingConfig({ colorPrimary: '#7A1F2B' }))

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={el}>
        <p>Conteúdo</p>
      </BrandTokensProvider>,
    )

    await waitFor(() =>
      expect(el.style.getPropertyValue('--color-brand-primary')).toBe('#7A1F2B'),
    )
    expect(el.style.getPropertyValue('--color-brand-primary-contrast-text')).toBe(
      '#FFFFFF',
    )
  })

  it('expõe o status via useBrandingTokensStatus para os descendentes', async () => {
    const el = document.createElement('div')
    const fetchFn = vi.fn().mockResolvedValue(buildBrandingConfig())

    render(
      <BrandTokensProvider fetchFn={fetchFn} target={el}>
        <StatusProbe />
      </BrandTokensProvider>,
    )

    expect(screen.getByTestId('status')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('ready'))
  })

  it('lança erro claro se useBrandingTokensStatus for usado fora do Provider', () => {
    // Suprime o log de erro esperado do React para este teste específico.
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<StatusProbe />)).toThrow(
      'useBrandingTokensStatus precisa ser usado dentro de <BrandTokensProvider>.',
    )

    consoleErrorSpy.mockRestore()
  })
})
