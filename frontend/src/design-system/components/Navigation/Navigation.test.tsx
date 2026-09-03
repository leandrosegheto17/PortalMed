import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Navigation } from './Navigation'

describe('Navigation', () => {
  it('renderiza os itens do paciente na ordem do UX-SPEC.md (Meus Exames | Meu Histórico | Ajuda | Sair)', () => {
    render(<Navigation variant="paciente" />)

    const nav = screen.getByRole('navigation', { name: 'Navegação principal do paciente' })
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Meus Exames',
      'Meu Histórico',
      'Ajuda',
      'Sair',
    ])
    expect(nav).toBeInTheDocument()
  })

  it('renderiza os itens do administrador na ordem do UX-SPEC.md (Gestão de Usuários | Auditoria | Ajuda | Sair)', () => {
    render(<Navigation variant="administrador" />)

    screen.getByRole('navigation', { name: 'Navegação principal do administrador' })
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'Gestão de Usuários',
      'Auditoria',
      'Ajuda',
      'Sair',
    ])
  })

  it('marca o item correspondente à rota atual com aria-current="page"', () => {
    render(<Navigation variant="paciente" currentPath="/historico" />)

    expect(screen.getByRole('link', { name: 'Meu Histórico' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Meus Exames' })).not.toHaveAttribute('aria-current')
  })

  it('"Sair" é uma ação (botão), não um link de navegação, e aciona onSignOut', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(<Navigation variant="paciente" onSignOut={onSignOut} />)

    const signOutButton = screen.getByRole('button', { name: 'Sair' })
    await user.click(signOutButton)

    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('todo item é alcançável via Tab, na ordem visual', async () => {
    const user = userEvent.setup()
    render(<Navigation variant="paciente" />)

    // Foca explicitamente o primeiro link de navegação em vez de depender de
    // Tab a partir do body — o botão hambúrguer (só relevante em mobile,
    // oculto via `display: none` fora da media query) não deve interferir
    // neste teste, e a resolução de `display:none` de uma folha de estilo
    // externa via CSS Modules não é garantida pelo motor de CSS do jsdom.
    screen.getByRole('link', { name: 'Meus Exames' }).focus()
    expect(screen.getByRole('link', { name: 'Meus Exames' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Meu Histórico' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Ajuda' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sair' })).toHaveFocus()
  })

  describe('menu colapsado (mobile)', () => {
    // O botão hambúrguer só é visível via CSS abaixo de 600px (§6.1, regra
    // `@media` em Navigation.module.css). O motor de CSS do jsdom não avalia
    // essa media query de forma confiável a partir de `window.innerWidth`
    // (mesmo com o resize simulado), o que faria uma query por role/nome
    // acessível falhar mesmo com o elemento corretamente presente e correto
    // no DOM — limitação do ambiente de teste, não do componente. Estes
    // testes usam seletor direto (`container.querySelector`) para validar a
    // lógica ARIA/foco/teclado do toggle, independente da visibilidade CSS
    // calculada pelo jsdom; a regra de media query em si (visual) é
    // responsabilidade de revisão visual/QA, não coberta por teste unitário.
    it('expõe um botão hambúrguer com aria-expanded/aria-controls, fechado por padrão', () => {
      const { container } = render(<Navigation variant="paciente" />)

      const toggle = container.querySelector('button[aria-label="Abrir menu de navegação"]')
      expect(toggle).not.toBeNull()
      expect(toggle).toHaveAttribute('aria-expanded', 'false')
      expect(toggle).toHaveAttribute('aria-controls')
    })

    it('abre o menu ao clicar no hambúrguer, movendo o rótulo/estado para "Fechar"', () => {
      const { container } = render(<Navigation variant="paciente" />)

      const toggle = container.querySelector('button[aria-label="Abrir menu de navegação"]')!
      fireEvent.click(toggle)

      const toggleAfterOpen = container.querySelector(
        'button[aria-label="Fechar menu de navegação"]',
      )
      expect(toggleAfterOpen).not.toBeNull()
      expect(toggleAfterOpen).toHaveAttribute('aria-expanded', 'true')
    })

    it('fecha o menu com Escape e devolve o foco ao botão hambúrguer', () => {
      const { container } = render(<Navigation variant="paciente" />)

      const toggle = container.querySelector(
        'button[aria-label="Abrir menu de navegação"]',
      ) as HTMLButtonElement
      fireEvent.click(toggle)
      fireEvent.keyDown(container.querySelector('nav')!, { key: 'Escape' })

      const toggleAfterClose = container.querySelector(
        'button[aria-label="Abrir menu de navegação"]',
      )
      expect(toggleAfterClose).toHaveAttribute('aria-expanded', 'false')
      expect(toggleAfterClose).toBe(document.activeElement)
    })
  })
})
