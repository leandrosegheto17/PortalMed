import type { ChangeEvent } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import styles from './DateOfBirthField.module.css'

export interface DateOfBirthFieldProps {
  legend?: string
  /** Valor controlado, formato ISO `YYYY-MM-DD`, ou string vazia enquanto a data não estiver completa/válida. */
  value: string
  /** Recebe a data ISO completa e válida, ou string vazia quando a seleção fica incompleta/inválida. */
  onChange: (isoDate: string) => void
  /** Texto de apoio explicando o motivo da coleta (RN-01) — UX-SPEC.md TL-02. */
  helperText?: string
  id?: string
  required?: boolean
  disabled?: boolean
  externalError?: string | null
}

const MONTH_LABELS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const DEFAULT_HELPER_TEXT =
  'Usamos sua data de nascimento apenas para confirmar que você tem 18 anos ou mais, requisito para o autoatendimento digital.'

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Último dia do mês/ano informados — usa um ano de referência não-bissexto quando o ano ainda não foi escolhido. */
function daysInMonth(month: number, year: number): number {
  return new Date(year || 2001, month, 0).getDate()
}

function parseIso(value: string): { day: string; month: string; year: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return { day: '', month: '', year: '' }
  const [, year, month, day] = match
  return { day, month, year }
}

/**
 * Seletor de data acessível (`UX-SPEC.md` §3.2, TL-02) — três `<select>`
 * (Dia/Mês/Ano) em vez de depender só de `<input type="date">`, cujo widget
 * de calendário nativo varia entre navegadores e frequentemente não é
 * totalmente operável por teclado/leitor de tela de forma consistente. Cada
 * `<select>` é nativamente navegável por teclado (Tab, setas, digitação para
 * busca) e tem rótulo próprio associado (visualmente oculto, mas presente na
 * árvore de acessibilidade) — agrupados por `<fieldset>`/`<legend>`.
 *
 * Estado das três partes é mantido localmente (não deriva de `value` a cada
 * render): enquanto a seleção está incompleta, `onChange` é notificado com
 * string vazia, mas as partes já escolhidas continuam visíveis nos selects
 * — evitar isso é essencial, senão escolher o mês limparia visualmente o dia
 * e o ano já selecionados a cada mudança intermediária.
 */
export function DateOfBirthField({
  legend = 'Data de nascimento',
  value,
  onChange,
  helperText = DEFAULT_HELPER_TEXT,
  id,
  required = true,
  disabled = false,
  externalError = null,
}: DateOfBirthFieldProps) {
  const baseId = useId()
  const dayId = id ? `${id}-day` : `${baseId}-day`
  const monthId = id ? `${id}-month` : `${baseId}-month`
  const yearId = id ? `${id}-year` : `${baseId}-year`
  const helperId = useId()
  const errorId = useId()

  const [day, setDay] = useState(() => parseIso(value).day)
  const [month, setMonth] = useState(() => parseIso(value).month)
  const [year, setYear] = useState(() => parseIso(value).year)

  // Sincroniza com um valor definido vindo de fora (ex.: dado pré-carregado).
  // Não reage a `value === ''` — isso incluiria o próprio eco de seleção
  // parcial que este componente emite enquanto o usuário ainda está
  // escolhendo, o que apagaria a seleção em andamento. Deliberadamente um
  // efeito (não "derivar durante o render"): é sincronização com um valor
  // controlado externo que pode mudar por uma causa alheia à interação do
  // próprio select (ex.: reset de formulário pelo componente pai).
  useEffect(() => {
    if (!value) return
    const parsed = parseIso(value)
    // oxlint-disable-next-line react/set-state-in-effect
    setDay(parsed.day)
    setMonth(parsed.month)
    setYear(parsed.year)
  }, [value])

  const currentYear = new Date().getFullYear()
  const years = useMemo(() => {
    const list: number[] = []
    for (let y = currentYear; y >= currentYear - 120; y--) list.push(y)
    return list
  }, [currentYear])

  const maxDay = daysInMonth(month ? Number(month) : 12, year ? Number(year) : 0)
  const days = useMemo(() => Array.from({ length: maxDay }, (_, i) => i + 1), [maxDay])

  function computeAndEmit(nextDay: string, nextMonth: string, nextYear: string) {
    setDay(nextDay)
    setMonth(nextMonth)
    setYear(nextYear)
    if (nextDay && nextMonth && nextYear) {
      onChange(`${nextYear}-${pad2(Number(nextMonth))}-${pad2(Number(nextDay))}`)
    } else {
      onChange('')
    }
  }

  function handleDayChange(event: ChangeEvent<HTMLSelectElement>) {
    computeAndEmit(event.target.value, month, year)
  }

  function handleMonthChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextMonth = event.target.value
    let nextDay = day
    if (day && nextMonth) {
      const max = daysInMonth(Number(nextMonth), year ? Number(year) : 0)
      if (Number(day) > max) nextDay = ''
    }
    computeAndEmit(nextDay, nextMonth, year)
  }

  function handleYearChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextYear = event.target.value
    let nextDay = day
    if (day && month) {
      const max = daysInMonth(Number(month), Number(nextYear))
      if (Number(day) > max) nextDay = ''
    }
    computeAndEmit(nextDay, month, nextYear)
  }

  const describedBy = [helperText ? helperId : null, externalError ? errorId : null]
    .filter(Boolean)
    .join(' ')

  return (
    <fieldset
      className={styles.fieldset}
      disabled={disabled}
      aria-describedby={describedBy || undefined}
      aria-invalid={externalError ? true : undefined}
    >
      <legend className={styles.legend}>
        {legend}
        {required ? (
          <span aria-hidden="true" className={styles.requiredMark}>
            {' '}
            *
          </span>
        ) : null}
      </legend>
      <div className={styles.row}>
        <div className={styles.field}>
          <label htmlFor={dayId} className={styles.srOnlyLabel}>
            Dia
          </label>
          <select id={dayId} className={styles.select} value={day} onChange={handleDayChange}>
            <option value="">Dia</option>
            {days.map((d) => (
              <option key={d} value={pad2(d)}>
                {pad2(d)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={monthId} className={styles.srOnlyLabel}>
            Mês
          </label>
          <select
            id={monthId}
            className={styles.select}
            value={month}
            onChange={handleMonthChange}
          >
            <option value="">Mês</option>
            {MONTH_LABELS.map((label, index) => (
              <option key={label} value={pad2(index + 1)}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={yearId} className={styles.srOnlyLabel}>
            Ano
          </label>
          <select id={yearId} className={styles.select} value={year} onChange={handleYearChange}>
            <option value="">Ano</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
      {helperText ? (
        <p id={helperId} className={styles.helper}>
          {helperText}
        </p>
      ) : null}
      {externalError ? (
        <p id={errorId} role="alert" className={styles.error}>
          {externalError}
        </p>
      ) : null}
    </fieldset>
  )
}
