import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
// Importação `?raw`: mesmo recurso já usado em `FormLayout.test.tsx`/FE-04
// para ler o conteúdo textual do CSS Module em vez de processá-lo.
// eslint-disable-next-line import/no-unresolved
import landingPageCss from './LandingPage.module.css?raw'
import { LandingPage } from './LandingPage'

function buildBrandingConfig(overrides: Partial<BrandingConfig> = {}): BrandingConfig {
  return {
    tenantId: 'tenant-1',
    logoUrl: 'https://cdn.example.com/hospital-piloto/logo.svg',
    colorPrimary: '#2E7D32',
    statusValidacaoContraste: 'aprovado',
    ...overrides,
  }
}

function renderLandingPage(fetchFn = vi.fn(() => new Promise<BrandingConfig>(() => {}))) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <BrandTokensProvider fetchFn={fetchFn} target={document.createElement('div')}>
        <LandingPage />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('LandingPage (TL-01 — Landing pública)', () => {
  it('renderiza o Header institucional com o nome do hospital (branding dinâmico via FE-01/FE-02)', () => {
    renderLandingPage()

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Hospital Piloto')).toBeInTheDocument()
  })

  it('renderiza o logo dinamicamente por tenant assim que BRANDING_CONFIG carrega (RF-11, via BrandTokensProvider)', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      buildBrandingConfig({ logoUrl: 'https://cdn.example.com/tenant-x/logo.svg' }),
    )

    renderLandingPage(fetchFn)

    await waitFor(() =>
      expect(screen.getByRole('img')).toHaveAttribute(
        'src',
        'https://cdn.example.com/tenant-x/logo.svg',
      ),
    )
  })

  it('renderiza a mensagem de boas-vindas como título de página (h1)', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', { level: 1, name: /Portal de Resultados de Exames/ }),
    ).toBeInTheDocument()
  })

  it('renderiza os dois CTAs primários "Entrar" e "Criar conta" apontando para as rotas corretas', () => {
    renderLandingPage()

    const entrarLink = screen.getByRole('link', { name: 'Entrar' })
    const criarContaLink = screen.getByRole('link', { name: 'Criar conta' })

    expect(entrarLink).toHaveAttribute('href', '/entrar')
    expect(criarContaLink).toHaveAttribute('href', '/criar-conta')
  })

  it('renderiza o Footer institucional com os links padrão (Termos, Privacidade, Ajuda)', () => {
    renderLandingPage()

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ajuda' })).toBeInTheDocument()
  })

  it('permite alcançar e ativar os CTAs só por teclado (Tab + Enter), sem depender de mouse', async () => {
    const user = userEvent.setup()
    renderLandingPage()

    await user.tab()
    // Header não renderiza <img> (branding ainda carregando/sem provider síncrono),
    // então o primeiro elemento focável da página é o link "Entrar".
    expect(screen.getByRole('link', { name: 'Entrar' })).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveFocus()
  })

  it('aplica a cor de marca dinâmica (`--color-brand-primary`) e o texto de contraste calculado nos CTAs, nunca uma cor hardcoded', () => {
    // Verificação estrutural do CSS Module (mesma técnica de FormLayout.test.tsx/FE-04):
    // garante que a implementação usa os tokens dinâmicos de FE-01, não uma cor fixa.
    expect(landingPageCss).toMatch(/background:\s*var\(--color-brand-primary\)/)
    expect(landingPageCss).toMatch(/color:\s*var\(--color-brand-primary-contrast-text\)/)
  })

  it('aceita hospitalName customizado (decisão de detalhe documentada, mesma de FE-02)', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BrandTokensProvider
          fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
          target={document.createElement('div')}
        >
          <LandingPage hospitalName="Hospital Tenant X" />
        </BrandTokensProvider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Hospital Tenant X')).toBeInTheDocument()
  })
})
