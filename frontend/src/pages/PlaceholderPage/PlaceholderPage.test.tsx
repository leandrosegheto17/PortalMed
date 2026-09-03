import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { BrandTokensProvider } from '../../design-system/branding/BrandTokensProvider'
import type { BrandingConfig } from '../../design-system/branding/types'
import { PlaceholderPage } from './PlaceholderPage'

function renderPlaceholder(title: string) {
  return render(
    <MemoryRouter initialEntries={['/entrar']}>
      <BrandTokensProvider
        fetchFn={vi.fn(() => new Promise<BrandingConfig>(() => {}))}
        target={document.createElement('div')}
      >
        <PlaceholderPage title={title} />
      </BrandTokensProvider>
    </MemoryRouter>,
  )
}

describe('PlaceholderPage (rota placeholder introduzida por FE-05)', () => {
  it('renderiza o título recebido como h1', () => {
    renderPlaceholder('Entrar')

    expect(screen.getByRole('heading', { level: 1, name: 'Entrar' })).toBeInTheDocument()
  })

  it('renderiza um link de retorno para a landing pública', () => {
    renderPlaceholder('Criar conta')

    expect(screen.getByRole('link', { name: 'Voltar à página inicial' })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('mantém Header/Footer institucionais mesmo em uma rota placeholder', () => {
    renderPlaceholder('Entrar')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
