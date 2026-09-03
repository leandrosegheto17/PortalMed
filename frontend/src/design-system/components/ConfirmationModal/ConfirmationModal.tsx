import type { KeyboardEvent, ReactNode } from 'react'
import { useEffect, useId, useRef } from 'react'
import styles from './ConfirmationModal.module.css'

export interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  description: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
  /** Estiliza o botão de confirmação como ação destrutiva (ex.: revogar link, desativar conta). */
  isDestructive?: boolean
  /** Estado de carregamento do botão de confirmação enquanto a ação está em andamento. */
  isConfirming?: boolean
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal de confirmação de ação sensível (UX-SPEC.md §3.1) — reutilizado em
 * revogar link (TL-27) e desbloquear/desativar conta (TL-32).
 *
 * Padrão de diálogo acessível (WAI-ARIA Dialog Pattern): `role="dialog"` +
 * `aria-modal="true"`, `aria-labelledby`/`aria-describedby` apontando para
 * título/descrição, foco movido para dentro do modal ao abrir (botão
 * "Cancelar" — opção segura por padrão, especialmente relevante para
 * `isDestructive`), foco preso dentro do modal (Tab/Shift+Tab cíclicos),
 * `Escape` equivale a cancelar, e foco devolvido ao elemento que abriu o
 * modal ao fechar (confirmar, cancelar ou Escape) — critério de aceite de
 * FE-02 análogo ao já exigido para o modal de expiração de sessão (FE-10).
 *
 * Decisão de detalhe: este componente não aplica `aria-hidden` no restante
 * da árvore da aplicação (não há app shell/root único definido ainda neste
 * estágio do projeto) — a combinação foco-preso + `aria-modal="true"` já
 * comunica corretamente a um leitor de tela moderno que o conteúdo por trás
 * está inativo; revisitar se um app shell formal padronizar um nó raiz único.
 */
export function ConfirmationModal({
  isOpen,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  isDestructive = false,
  isConfirming = false,
}: ConfirmationModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    return () => {
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }

    if (event.key !== 'Tab' || !dialogRef.current) return

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    )
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.overlay}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
        <div className={styles.actions}>
          <button
            ref={cancelButtonRef}
            type="button"
            className={styles.button}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`${styles.button} ${isDestructive ? styles.confirmDestructive : styles.confirm}`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isDestructive ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 8v5m0 3.5h.01M12 3 2 20h20L12 3Z" />
              </svg>
            ) : null}
            {isConfirming ? 'Processando…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
