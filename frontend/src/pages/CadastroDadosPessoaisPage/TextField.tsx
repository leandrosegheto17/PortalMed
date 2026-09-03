import type { ChangeEvent, InputHTMLAttributes } from 'react'
import { useId } from 'react'
import styles from './TextField.module.css'

export interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  id?: string
  required?: boolean
  disabled?: boolean
  /** Mensagem de erro já resolvida por quem usa (touched + validação) — este componente não decide quando exibir, só como exibir. */
  errorMessage?: string | null
  type?: InputHTMLAttributes<HTMLInputElement>['type']
  autoComplete?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  placeholder?: string
}

/**
 * Campo de texto simples (rótulo + input + erro inline), mesmo padrão visual
 * e de acessibilidade de `CpfField`/FE-03 (`<label htmlFor>` associado,
 * `aria-invalid`/`aria-describedby`, erro com `role="alert"`), mas **não** um
 * novo componente de design system: usado só por `CadastroDadosPessoaisPage`
 * (nome completo, e-mail, celular) — ver decisão de detalhe em `phone.ts`
 * sobre por que este campo não foi adicionado a `design-system/components/`.
 * Validação (o que é erro e quando mostrar) fica inteiramente com quem usa
 * este componente — ele só renderiza o que recebe.
 */
export function TextField({
  label,
  value,
  onChange,
  onBlur,
  id,
  required = true,
  disabled = false,
  errorMessage = null,
  type = 'text',
  autoComplete,
  inputMode,
  placeholder,
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = useId()

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  return (
    <div className={styles.wrapper}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
        {required ? (
          <span aria-hidden="true" className={styles.requiredMark}>
            {' '}
            *
          </span>
        ) : null}
      </label>
      <input
        id={inputId}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
      />
      {errorMessage ? (
        <p id={errorId} role="alert" className={styles.error}>
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
