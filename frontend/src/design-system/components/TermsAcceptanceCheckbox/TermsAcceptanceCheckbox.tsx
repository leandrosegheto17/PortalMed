import { useId } from 'react'
import styles from './TermsAcceptanceCheckbox.module.css'

export interface TermsAcceptanceCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** UX-SPEC.md §3.2/TL-05: "Li e aceito os Termos de Uso e a Política de Privacidade". */
  label?: string
  id?: string
  required?: boolean
  disabled?: boolean
}

const DEFAULT_LABEL = 'Li e aceito os Termos de Uso e a Política de Privacidade'

/**
 * Checkbox de aceite padrão (`UX-SPEC.md` §3.2/TL-05) — aceite geral dos
 * Termos de Uso/Política de Privacidade.
 *
 * Deliberadamente **simples**, sem agrupamento/destaque visual algum —
 * o contraste com `HealthDataConsentCheckbox` (moldura, ícone, `role="group"`
 * próprio, rótulo acessível composto) é o que caracteriza a distinção exigida
 * por RN-02: dois componentes diferentes, não duas variantes de um único
 * componente configurável por prop, para que a distinção nunca dependa de um
 * uso correto de prop por quem compõe a tela.
 */
export function TermsAcceptanceCheckbox({
  checked,
  onChange,
  label = DEFAULT_LABEL,
  id,
  required = true,
  disabled = false,
}: TermsAcceptanceCheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label htmlFor={inputId} className={styles.row}>
      <input
        id={inputId}
        type="checkbox"
        className={styles.checkbox}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        required={required}
        disabled={disabled}
        aria-required={required}
      />
      <span className={styles.text}>{label}</span>
    </label>
  )
}
