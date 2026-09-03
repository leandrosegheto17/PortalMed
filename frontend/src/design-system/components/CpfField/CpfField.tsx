import type { ChangeEvent } from 'react'
import { useId, useState } from 'react'
import { CPF_DIGIT_COUNT, formatCpf, isValidCpf, onlyDigits } from './cpf'
import styles from './CpfField.module.css'

export interface CpfFieldProps {
  label?: string
  /** Valor controlado — sempre os dígitos "crus" do CPF (sem máscara), nunca a string formatada. */
  value: string
  /** Recebe os dígitos "crus" (até 11), nunca a string com máscara — quem formata para exibição é este componente. */
  onChange: (digits: string) => void
  id?: string
  required?: boolean
  disabled?: boolean
  /** Erro vindo de fora (ex.: RF-15/BE-18, "CPF não localizado no sistema do hospital") — some ao erro de formato local, quando presente. */
  externalError?: string | null
}

const FORMAT_ERROR_MESSAGE = 'CPF inválido. Verifique os números digitados.'

/**
 * Campo de texto com máscara de CPF (`UX-SPEC.md` §3.2) — validação de
 * formato/dígito verificador inline, mensagem de erro específica.
 *
 * Decisão de detalhe: o valor controlado (`value`/`onChange`) é sempre o
 * dígito "cru" (sem pontuação) — quem consome este componente (ex.: FE-06,
 * cadastro) já recebe o dado pronto para enviar ao backend, sem precisar
 * desfazer a máscara. A máscara é puramente de exibição.
 */
export function CpfField({
  label = 'CPF',
  value,
  onChange,
  id,
  required = true,
  disabled = false,
  externalError = null,
}: CpfFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = useId()
  const [touched, setTouched] = useState(false)

  const localError =
    touched && value.length > 0 && (value.length < CPF_DIGIT_COUNT || !isValidCpf(value))
      ? FORMAT_ERROR_MESSAGE
      : null
  const errorMessage = externalError ?? localError

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(onlyDigits(event.target.value).slice(0, CPF_DIGIT_COUNT))
  }

  function handleBlur() {
    setTouched(true)
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
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="000.000.000-00"
        className={`${styles.input} ${errorMessage ? styles.inputError : ''}`}
        value={formatCpf(value)}
        onChange={handleChange}
        onBlur={handleBlur}
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
