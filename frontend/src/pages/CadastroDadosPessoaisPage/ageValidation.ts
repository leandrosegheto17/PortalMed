/**
 * RN-01 — cálculo de idade e verificação de maioridade a partir da data de
 * nascimento (`PRD-TECNICO.md` RF-15/RN-01, "Somente pacientes com 18 anos ou
 * mais... podem criar conta"). Regra de calendário puramente determinística —
 * resolvida inteiramente no cliente, sem depender de nenhum endpoint de
 * backend (diferente do match de CPF via RF-14/BE-18, ver `patientLookupApi.ts`
 * no mesmo diretório, que é a parte desta tela que de fato depende de
 * integração ainda não publicada).
 *
 * Implementado com aritmética inteira sobre ano/mês/dia (sem construir
 * `new Date(ano, mes, dia)` a partir da string), para nunca produzir uma data
 * "corrigida" silenciosamente pelo motor de `Date` (ex.: 31 de abril viraria
 * 1º de maio) — qualquer data de nascimento fora do calendário é tratada como
 * erro explícito, nunca normalizada silenciosamente.
 */

export const MINIMUM_AGE_YEARS = 18

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

interface ParsedDate {
  year: number
  month: number
  day: number
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(month: number, year: number): number {
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1]
}

function parseIsoDate(isoDateOfBirth: string): ParsedDate {
  const match = ISO_DATE_PATTERN.exec(isoDateOfBirth)
  if (!match) {
    throw new Error(`Data de nascimento inválida: "${isoDateOfBirth}" (formato esperado AAAA-MM-DD).`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month, year)) {
    throw new Error(`Data de nascimento inválida: "${isoDateOfBirth}" não existe no calendário.`)
  }
  return { year, month, day }
}

/**
 * Idade em anos completos na `referenceDate` (por padrão, agora). Uma data de
 * nascimento futura em relação a `referenceDate` produz um valor negativo,
 * deliberadamente — quem chama (`isAdult`) já trata isso como "não maior de
 * idade", sem precisar de um caso especial próprio.
 */
export function calculateAge(isoDateOfBirth: string, referenceDate: Date = new Date()): number {
  const { year, month, day } = parseIsoDate(isoDateOfBirth)
  const referenceYear = referenceDate.getFullYear()
  const referenceMonth = referenceDate.getMonth() + 1
  const referenceDay = referenceDate.getDate()

  let age = referenceYear - year
  const hasHadBirthdayThisYear =
    referenceMonth > month || (referenceMonth === month && referenceDay >= day)
  if (!hasHadBirthdayThisYear) age -= 1

  return age
}

/**
 * `true` a partir do próprio dia do 18º aniversário (inclusive) — RN-01 não
 * distingue "18 anos completos hoje" de "18 anos completos há anos", ambos
 * são maioridade.
 */
export function isAdult(isoDateOfBirth: string, referenceDate: Date = new Date()): boolean {
  return calculateAge(isoDateOfBirth, referenceDate) >= MINIMUM_AGE_YEARS
}
