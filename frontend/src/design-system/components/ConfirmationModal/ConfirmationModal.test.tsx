import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmationModal } from './ConfirmationModal'

/** Harness com um botão disparador real, para testar devolução de foco. */
function Harness({
  isDestructive = false,
  onConfirm = vi.fn(),
}: {
  isDestructive?: boolean
  onConfirm?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Revogar link
      </button>
      <ConfirmationModal
        isOpen={isOpen}
        title="Revogar link de compartilhamento?"
        description="Esta ação não pode ser desfeita. O destinatário perderá o acesso imediatamente."
        onConfirm={() => {
          onConfirm()
          setIsOpen(false)
        }}
        onCancel={() => setIsOpen(false)}
        isDestructive={isDestructive}
      />
    </div>
  )
}

describe('ConfirmationModal', () => {
  it('não renderiza nada no DOM quando isOpen é false', () => {
    render(
      <ConfirmationModal
        isOpen={false}
        title="Título"
        description="Descrição"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renderiza role="dialog" com aria-modal e rotulado pelo título/descrição', () => {
    render(
      <ConfirmationModal
        isOpen
        title="Desativar conta?"
        description="O paciente não conseguirá mais acessar o portal."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Desativar conta?')
    expect(dialog).toHaveAccessibleDescription(
      'O paciente não conseguirá mais acessar o portal.',
    )
  })

  it('move o foco para o modal (botão Cancelar) ao abrir', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Revogar link' }))

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('devolve o foco ao elemento que abriu o modal, ao confirmar', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const trigger = screen.getByRole('button', { name: 'Revogar link' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('devolve o foco ao elemento que abriu o modal, ao cancelar', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const trigger = screen.getByRole('button', { name: 'Revogar link' })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('Escape fecha o modal (equivalente a cancelar) e devolve o foco', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const trigger = screen.getByRole('button', { name: 'Revogar link' })
    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('aciona onConfirm ao clicar em Confirmar', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<Harness onConfirm={onConfirm} />)

    await user.click(screen.getByRole('button', { name: 'Revogar link' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('prende o foco dentro do modal — Tab a partir do último elemento volta ao primeiro', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Revogar link' }))
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' })

    expect(cancelButton).toHaveFocus()
    await user.tab()
    expect(confirmButton).toHaveFocus()
    await user.tab()
    expect(cancelButton).toHaveFocus()
  })

  it('prende o foco dentro do modal — Shift+Tab a partir do primeiro elemento vai ao último', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Revogar link' }))
    const cancelButton = screen.getByRole('button', { name: 'Cancelar' })
    const confirmButton = screen.getByRole('button', { name: 'Confirmar' })

    expect(cancelButton).toHaveFocus()
    await user.tab({ shift: true })
    expect(confirmButton).toHaveFocus()
  })

  it('rótulos de confirmar/cancelar são customizáveis', async () => {
    const user = userEvent.setup()
    render(
      <ConfirmationModal
        isOpen
        title="Título"
        description="Descrição"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmLabel="Desativar conta"
        cancelLabel="Manter conta ativa"
      />,
    )

    expect(screen.getByRole('button', { name: 'Desativar conta' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Manter conta ativa' })).toBeInTheDocument()
    await user.tab()
  })

  it('ação destrutiva é sinalizada por texto/ícone, nunca só por cor', () => {
    render(
      <ConfirmationModal
        isOpen
        title="Revogar link?"
        description="Ação irreversível."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        isDestructive
      />,
    )

    const confirmButton = screen.getByRole('button', { name: 'Confirmar' })
    expect(confirmButton.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument()
  })
})
