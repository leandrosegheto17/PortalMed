import { useId } from 'react'
import styles from './HealthDataConsentCheckbox.module.css'

export interface HealthDataConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** UX-SPEC.md §3.2/TL-05: "Autorizo especificamente o tratamento dos meus dados de saúde...". */
  label?: string
  id?: string
  required?: boolean
  disabled?: boolean
  helperText?: string
}

const DEFAULT_LABEL =
  'Autorizo especificamente o tratamento dos meus dados de saúde para os fins descritos na Política de Privacidade'
const GROUP_LABEL = 'Consentimento específico para dado de saúde'
const DEFAULT_HELPER_TEXT = 'Consentimento exigido separadamente do aceite geral dos Termos de Uso, conforme LGPD Art. 11, I.'

function HealthShieldIcon() {
  return (
    <svg
      className={styles.icon}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="M12 8v5m-2.5-2.5h5" />
    </svg>
  )
}

/**
 * Checkbox de consentimento **destacado**, específico para dado de saúde
 * (`UX-SPEC.md` §3.2/§5.2, TL-05, RN-02/LGPD Art. 11, I).
 *
 * Distinto de `TermsAcceptanceCheckbox` tanto **visualmente** (moldura,
 * fundo destacado, ícone, selo textual "Consentimento específico para dado
 * de saúde" acima do próprio texto de aceite — nunca só uma diferença de
 * cor) quanto **programaticamente**: o campo fica dentro de um
 * `role="group"` com nome acessível próprio, e o `aria-label` do próprio
 * `<input>` combina o rótulo do grupo com o texto do consentimento, então um
 * leitor de tela anuncia algo como "Consentimento específico para dado de
 * saúde: Autorizo especificamente..." — nunca apenas o mesmo padrão textual
 * genérico do checkbox de Termos (`UX-SPEC.md` §5.2, ponto de risco de TL-05).
 */
export function HealthDataConsentCheckbox({
  checked,
  onChange,
  label = DEFAULT_LABEL,
  id,
  required = true,
  disabled = false,
  helperText = DEFAULT_HELPER_TEXT,
}: HealthDataConsentCheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const helperId = useId()

  return (
    <div className={styles.wrapper} role="group" aria-label={GROUP_LABEL}>
      <div className={styles.badge}>
        <HealthShieldIcon />
        <span>{GROUP_LABEL}</span>
      </div>
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
          aria-label={`${GROUP_LABEL}: ${label}`}
          aria-describedby={helperText ? helperId : undefined}
        />
        <span className={styles.text}>{label}</span>
      </label>
      {helperText ? (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
    </div>
  )
}
