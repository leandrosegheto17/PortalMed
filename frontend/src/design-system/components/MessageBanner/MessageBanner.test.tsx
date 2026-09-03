import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MessageBanner } from './MessageBanner'

describe('MessageBanner', () => {
  it('reserva a área de layout mesmo sem mensagem (não desloca conteúdo ao aparecer)', () => {
    const { container } = render(<MessageBanner variant="info" message={null} />)

    const region = container.querySelector('[data-testid="message-banner-region"]')
    expect(region).toBeInTheDocument()
    // Guardado como estilo inline (não depende de cascata CSS) — a área
    // permanece reservada independentemente de a mensagem estar presente.
    expect((region as HTMLElement).style.minHeight).not.toBe('')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('mantém o mesmo nó de região ao alternar entre mensagem ausente e presente (sem remount que desloque layout)', () => {
    const { container, rerender } = render(<MessageBanner variant="error" message={null} />)
    const regionBefore = container.querySelector('[data-testid="message-banner-region"]')

    rerender(<MessageBanner variant="error" message="Usuário ou senha inválidos." />)
    const regionAfter = container.querySelector('[data-testid="message-banner-region"]')

    expect(regionAfter).toBe(regionBefore)
    expect((regionAfter as HTMLElement).style.minHeight).toBe(
      (regionBefore as HTMLElement).style.minHeight,
    )
  })

  it('nunca comunica o estado só por cor — sempre inclui rótulo textual e ícone', () => {
    render(<MessageBanner variant="error" message="Usuário ou senha inválidos." />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveTextContent('Erro:')
    expect(banner).toHaveTextContent('Usuário ou senha inválidos.')
    expect(banner.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('usa aria-live="polite" e role="status" por padrão', () => {
    render(<MessageBanner variant="success" message="Link copiado." />)

    const banner = screen.getByRole('status')
    expect(banner).toHaveAttribute('aria-live', 'polite')
  })

  it('usa aria-live="assertive" e role="alert" quando marcado como bloqueio (ex.: conta bloqueada)', () => {
    render(<MessageBanner variant="error" message="Conta bloqueada." assertive />)

    const banner = screen.getByRole('alert')
    expect(banner).toHaveAttribute('aria-live', 'assertive')
  })

  it.each([
    ['error', 'Erro'],
    ['success', 'Sucesso'],
    ['warning', 'Aviso'],
    ['info', 'Informação'],
  ] as const)('rotula a variante %s como "%s"', (variant, label) => {
    render(<MessageBanner variant={variant} message="Mensagem de teste" />)
    expect(screen.getByRole('status')).toHaveTextContent(`${label}:`)
  })

  it('botão de fechar é acessível por teclado e aciona onDismiss', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<MessageBanner variant="info" message="Aviso informativo." onDismiss={onDismiss} />)

    const dismissButton = screen.getByRole('button', { name: 'Fechar mensagem' })
    await user.tab()
    expect(dismissButton).toHaveFocus()
    await user.keyboard('{Enter}')

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('não renderiza botão de fechar quando onDismiss não é informado', () => {
    render(<MessageBanner variant="info" message="Aviso informativo." />)
    expect(screen.queryByRole('button', { name: 'Fechar mensagem' })).not.toBeInTheDocument()
  })
})
