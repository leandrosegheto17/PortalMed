import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from 'react'
import { useId, useRef } from 'react'
import styles from './MfaCodeField.module.css'

export interface MfaCodeFieldProps {
  /** Número de dígitos do código (padrão 6, `UX-SPEC.md` §3.2/TL-13). */
  length?: number
  /** Valor controlado — string de dígitos, tamanho até `length`. */
  value: string
  onChange: (code: string) => void
  /** Disparado quando o código atinge `length` dígitos. */
  onComplete?: (code: string) => void
  /** Rótulo do grupo (ex.: "Código de verificação"). */
  label?: string
  id?: string
  disabled?: boolean
  externalError?: string | null
  autoFocus?: boolean
}

/**
 * Campo de código numérico (MFA/OTP), `UX-SPEC.md` §3.2/§5.2 (TL-13).
 *
 * Requisito não-negociável do critério de aceite de FE-03 e de
 * `UX-SPEC.md` §5.2: **colar o código completo funciona em qualquer uma das
 * caixas** — o auto-avanço entre dígitos é reforço opcional de UX, nunca a
 * única forma de preencher. `Tab`/`Shift+Tab` (foco nativo do navegador) e
 * `Backspace`/setas (tratados explicitamente) continuam funcionando mesmo
 * sem usar paste.
 */
export function MfaCodeField({
  length = 6,
  value,
  onChange,
  onComplete,
  label = 'Código de verificação',
  id,
  disabled = false,
  externalError = null,
  autoFocus = false,
}: MfaCodeFieldProps) {
  const groupLabelId = useId()
  const errorId = useId()
  const hintId = useId()
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const cells = Array.from({ length }, (_, i) => value[i] ?? '')

  function focusCell(index: number) {
    const clamped = Math.max(0, Math.min(length - 1, index))
    const target = inputsRef.current[clamped]
    target?.focus()
    target?.select()
  }

  /** Preenche a partir do índice 0 (o código colado é sempre tratado como completo/substitui tudo), independentemente de qual caixa recebeu o paste/digitação múltipla. */
  function fillFrom(startIndex: number, digits: string) {
    const next = cells.slice()
    let i = startIndex
    for (const char of digits) {
      if (i >= length) break
      next[i] = char
      i += 1
    }
    const code = next.join('').slice(0, length)
    onChange(code)
    if (code.length === length) {
      onComplete?.(code)
    }
    focusCell(i >= length ? length - 1 : i)
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '')

    if (digits.length === 0) {
      const next = cells.slice()
      next[index] = ''
      onChange(next.join(''))
      return
    }

    if (digits.length === 1) {
      const next = cells.slice()
      next[index] = digits
      const code = next.join('')
      onChange(code)
      if (code.length === length) {
        onComplete?.(code)
      }
      focusCell(index + 1)
      return
    }

    // Mais de um dígito chegou de uma vez nesta caixa — normalmente um paste
    // que o navegador não roteou pelo evento `onPaste` (ou digitação muito
    // rápida). Tratado como colar o código inteiro, preenchendo a partir da
    // primeira caixa, não a partir da caixa que recebeu o evento.
    fillFrom(0, digits)
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text').replace(/\D/g, '')
    if (!text) return
    event.preventDefault()
    fillFrom(0, text)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && cells[index] === '' && index > 0) {
      event.preventDefault()
      const next = cells.slice()
      next[index - 1] = ''
      onChange(next.join(''))
      focusCell(index - 1)
      return
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      focusCell(index - 1)
      return
    }
    if (event.key === 'ArrowRight' && index < length - 1) {
      event.preventDefault()
      focusCell(index + 1)
    }
  }

  return (
    <div
      className={styles.wrapper}
      role="group"
      aria-labelledby={groupLabelId}
      aria-describedby={[hintId, externalError ? errorId : null].filter(Boolean).join(' ')}
    >
      <span id={groupLabelId} className={styles.label}>
        {label}
      </span>
      <p id={hintId} className={styles.hint}>
        Você pode colar o código completo em qualquer um dos campos abaixo.
      </p>
      <div className={styles.cells}>
        {cells.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el
            }}
            id={index === 0 ? id : undefined}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`Dígito ${index + 1} de ${length} do código de verificação`}
            aria-invalid={externalError ? true : undefined}
            className={`${styles.cell} ${externalError ? styles.cellError : ''}`}
            value={digit}
            disabled={disabled}
            autoFocus={autoFocus && index === 0}
            onChange={(event) => handleChange(index, event)}
            onPaste={handlePaste}
            onKeyDown={(event) => handleKeyDown(index, event)}
          />
        ))}
      </div>
      {externalError ? (
        <p id={errorId} role="alert" className={styles.error}>
          {externalError}
        </p>
      ) : null}
    </div>
  )
}
