import type { ReactNode } from 'react'
import styles from './MessageBanner.module.css'

export type MessageBannerVariant = 'error' | 'success' | 'warning' | 'info'

export interface MessageBannerProps {
  variant: MessageBannerVariant
  /** `null`/`undefined`/string vazia = nenhuma mensagem ativa (região permanece reservada, vazia). */
  message: ReactNode | null | undefined
  /**
   * Marca a mensagem como bloqueio (ex.: TL-10, conta bloqueada) — troca
   * `role="status"`/`aria-live="polite"` (padrão, UX-SPEC.md §5.1) para
   * `role="alert"`/`aria-live="assertive"`. Não é o padrão: a maioria das
   * mensagens de erro/validação usa o padrão "polite".
   */
  assertive?: boolean
  /** Quando informado, exibe um botão de fechar acessível por teclado. */
  onDismiss?: () => void
  id?: string
}

const VARIANT_LABEL: Record<MessageBannerVariant, string> = {
  error: 'Erro',
  success: 'Sucesso',
  warning: 'Aviso',
  info: 'Informação',
}

/**
 * Ícones simples, um por variante — a regra transversal de acessibilidade
 * (UX-SPEC.md §5.1) exige que o estado nunca seja comunicado só por cor;
 * o rótulo textual (`VARIANT_LABEL`) já cobre isso para leitor de tela, o
 * ícone reforça a distinção visual para quem enxerga mas não percebe bem a
 * diferença de cor (ex.: daltonismo). Decorativo — `aria-hidden`, o texto ao
 * lado já carrega o significado.
 */
function VariantIcon({ variant }: { variant: MessageBannerVariant }) {
  const paths: Record<MessageBannerVariant, ReactNode> = {
    error: <path d="M12 8v5m0 3.5h.01M12 3 2 20h20L12 3Z" />,
    success: <path d="m5 13 4 4L19 7" />,
    warning: <path d="M12 8v5m0 3.5h.01M12 3 2 20h20L12 3Z" />,
    info: <path d="M12 8h.01M11 11h1v6h1" />,
  }

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[variant]}
    </svg>
  )
}

/**
 * Banner de mensagem inline (erro/sucesso/aviso/informação), UX-SPEC.md §3.1.
 *
 * Critério de aceite de FE-02: **não desloca layout ao aparecer**. Resolvido
 * reservando a área de layout (`.region`) sempre montada por este componente,
 * com `min-height` fixado via estilo inline — a mensagem em si
 * (`role="status"`/`role="alert"`) só existe na árvore quando `message` está
 * presente, mas o contêiner externo nunca é desmontado/remontado, então
 * elementos irmãos na página não se deslocam quando a mensagem aparece ou
 * desaparece.
 */
export function MessageBanner({
  variant,
  message,
  assertive = false,
  onDismiss,
  id,
}: MessageBannerProps) {
  const hasMessage = message !== null && message !== undefined && message !== ''
  const role = assertive ? 'alert' : 'status'

  return (
    <div
      className={styles.region}
      style={{ minHeight: 'var(--message-banner-min-height, 48px)' }}
      data-testid="message-banner-region"
    >
      {hasMessage ? (
        <div
          id={id}
          role={role}
          aria-live={assertive ? 'assertive' : 'polite'}
          className={`${styles.banner} ${styles[variant]}`}
        >
          <VariantIcon variant={variant} />
          <span className={styles.label}>{VARIANT_LABEL[variant]}:</span>
          <span className={styles.message}>{message}</span>
          {onDismiss ? (
            <button
              type="button"
              className={styles.dismiss}
              aria-label="Fechar mensagem"
              onClick={onDismiss}
            >
              ×
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
