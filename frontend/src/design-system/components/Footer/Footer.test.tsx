import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Footer } from './Footer'

describe('Footer institucional', () => {
  it('renderiza os links padrão do UX-SPEC.md §3.1 (Termos de Uso, Política de Privacidade, Ajuda)', () => {
    render(<Footer />)

    const nav = screen.getByRole('navigation', { name: 'Links institucionais' })
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Termos de Uso',
      'Política de Privacidade',
      'Ajuda',
    ])
    expect(nav).toBeInTheDocument()
  })

  it('cada link é um elemento semântico de âncora, navegável por teclado nativamente', () => {
    render(<Footer />)

    for (const link of screen.getAllByRole('link')) {
      expect(link.tagName).toBe('A')
      expect(link).toHaveAttribute('href')
    }
  })

  it('está contido em um elemento <footer> semântico', () => {
    const { container } = render(<Footer />)
    expect(container.querySelector('footer')).toBeInTheDocument()
  })
})
