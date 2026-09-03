/**
 * Máscara/validação de celular para o campo "celular" de TL-02
 * (`PRD-TECNICO.md` RF-15, "nome, CPF, data de nascimento, e-mail, celular").
 *
 * Decisão de detalhe: `TASK.md`/FE-03 só nomeia explicitamente "máscara CPF,
 * seletor de data acessível, indicador de força de senha, campo de código
 * MFA, checkboxes" como componentes de design system a construir — não um
 * campo de celular reutilizável. Criar um novo componente global de design
 * system para um único consumidor (esta tela) seria escopo não pedido; por
 * isso a máscara/validação de celular vive aqui, colocada com a única tela
 * que a usa (`CadastroDadosPessoaisPage`), como um utilitário puro testável
 * — não exportado pelo barrel do design system (`design-system/index.ts`).
 * Mesmo padrão de "dígitos crus controlados, máscara só de exibição" já
 * usado por `CpfField`/FE-03 (`cpf.ts`).
 */

export const PHONE_DIGIT_COUNT_MOBILE = 11
export const PHONE_DIGIT_COUNT_LANDLINE = 10

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '')
}

/** Formata progressivamente `(DD) 9XXXX-XXXX` (celular, 11 dígitos) ou `(DD) XXXX-XXXX` (fixo, 10 dígitos) conforme os dígitos disponíveis. */
export function formatPhone(digits: string): string {
  const raw = onlyDigits(digits).slice(0, PHONE_DIGIT_COUNT_MOBILE)
  if (raw.length === 0) return ''
  if (raw.length <= 2) return `(${raw}`

  const ddd = raw.slice(0, 2)
  const rest = raw.slice(2)

  if (rest.length <= 4) return `(${ddd}) ${rest}`

  // Últimos 4 dígitos sempre viram o sufixo — funciona tanto para os 8
  // dígitos de um fixo ("XXXX-XXXX") quanto para os 9 de um celular
  // ("9XXXX-XXXX", já que o "9" inicial fica no prefixo restante).
  const splitIndex = rest.length - 4
  const firstPart = rest.slice(0, splitIndex)
  const lastPart = rest.slice(splitIndex)
  return `(${ddd}) ${firstPart}-${lastPart}`
}

/** Válido com DDD (2 dígitos) + 8 dígitos (fixo) ou 9 dígitos (celular, começando com 9). */
export function isValidPhoneDigits(digits: string): boolean {
  const raw = onlyDigits(digits)
  if (raw.length === PHONE_DIGIT_COUNT_LANDLINE) return true
  if (raw.length === PHONE_DIGIT_COUNT_MOBILE) return raw[2] === '9'
  return false
}
