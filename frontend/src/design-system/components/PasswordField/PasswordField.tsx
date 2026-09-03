import type { ChangeEvent } from 'react'
import { useId, useState } from 'react'
import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from './passwordPolicy'
import styles from './PasswordField.module.css'

export interface PasswordFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  id?: string
  policy?: PasswordPolicy
  /** `'new-password'` (TL-06/TL-19, padrão) ou `'current-password'` (TL-08). */
  autoComplete?: 'new-password' | 'current-password'
  required?: boolean
  disabled?: boolean
  externalError?: string | null
}

interface PolicyRule {
  id: string
  label: string
  passed: boolean
}

function buildRules(value: string, policy: PasswordPolicy): PolicyRule[] {
  const rules: PolicyRule[] = [
    {
      id: 'minLength',
      label: `Pelo menos ${policy.minLength} caracteres`,
      passed: value.length >= policy.minLength,
    },
  ]
  if (policy.requireUppercase) {
    rules.push({ id: 'uppercase', label: 'Uma letra maiúscula', passed: /[A-Z]/.test(value) })
  }
  if (policy.requireLowercase) {
    rules.push({ id: 'lowercase', label: 'Uma letra minúscula', passed: /[a-z]/.test(value) })
  }
  if (policy.requireNumber) {
    rules.push({ id: 'number', label: 'Um número', passed: /[0-9]/.test(value) })
  }
  if (policy.requireSpecialChar) {
    rules.push({
      id: 'specialChar',
      label: 'Um caractere especial (ex.: ! @ # $ %)',
      passed: /[^A-Za-z0-9]/.test(value),
    })
  }
  return rules
}

export type PasswordStrengthLevel = 'vazia' | 'fraca' | 'media' | 'forte'

const STRENGTH_LABEL: Record<PasswordStrengthLevel, string> = {
  vazia: 'Vazia',
  fraca: 'Fraca',
  media: 'Média',
  forte: 'Forte',
}

function computeStrengthLevel(value: string, rules: PolicyRule[]): PasswordStrengthLevel {
  if (value.length === 0) return 'vazia'
  const passedCount = rules.filter((r) => r.passed).length
  const ratio = passedCount / rules.length
  if (ratio >= 1) return 'forte'
  if (ratio >= 0.5) return 'media'
  return 'fraca'
}

/**
 * Campo de senha com indicador de força (`UX-SPEC.md` §3.2, TL-06/TL-19).
 *
 * Estado (força/critérios atendidos) nunca comunicado só por cor
 * (`UX-SPEC.md` §5.1): cada item da checklist tem ícone + texto + um status
 * textual (visualmente oculto quando o ícone já é suficiente para quem
 * enxerga, mas sempre presente na árvore de acessibilidade), e o rótulo de
 * força ("Fraca"/"Média"/"Forte") é sempre texto, nunca só a cor da barra.
 */
export function PasswordField({
  label = 'Senha',
  value,
  onChange,
  id,
  policy = DEFAULT_PASSWORD_POLICY,
  autoComplete = 'new-password',
  required = true,
  disabled = false,
  externalError = null,
}: PasswordFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = useId()
  const checklistId = useId()
  const strengthId = useId()
  const [visible, setVisible] = useState(false)

  const rules = buildRules(value, policy)
  const strengthLevel = computeStrengthLevel(value, rules)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value)
  }

  const describedBy = [
    checklistId,
    value.length > 0 ? strengthId : null,
    externalError ? errorId : null,
  ]
    .filter(Boolean)
    .join(' ')

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
      <div className={styles.inputRow}>
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`${styles.input} ${externalError ? styles.inputError : ''}`}
          value={value}
          onChange={handleChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          aria-required={required}
          aria-invalid={externalError ? true : undefined}
          aria-describedby={describedBy || undefined}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-pressed={visible}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
        >
          {visible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {value.length > 0 ? (
        <div id={strengthId} className={styles.strength} aria-live="polite">
          <div className={styles.strengthBar} aria-hidden="true">
            <span className={`${styles.strengthFill} ${styles[`strength-${strengthLevel}`]}`} />
          </div>
          <span className={styles.strengthLabel}>Força da senha: {STRENGTH_LABEL[strengthLevel]}</span>
        </div>
      ) : null}

      <ul id={checklistId} className={styles.checklist} aria-label="Requisitos de senha">
        {rules.map((rule) => (
          <li key={rule.id} className={styles.checklistItem}>
            <span aria-hidden="true" className={rule.passed ? styles.iconPassed : styles.iconPending}>
              {rule.passed ? '✓' : '○'}
            </span>
            <span>{rule.label}</span>
            <span className={styles.srOnly}>{rule.passed ? ' — atendido' : ' — pendente'}</span>
          </li>
        ))}
      </ul>

      {externalError ? (
        <p id={errorId} role="alert" className={styles.error}>
          {externalError}
        </p>
      ) : null}
    </div>
  )
}
