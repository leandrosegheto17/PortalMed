const CPF_DIGIT_COUNT = 11

function onlyDigits(input: string): string {
  return input.replace(/\D/g, '')
}

/** Formata dígitos crus como `000.000.000-00`, progressivamente (funciona com string parcial). */
export function formatCpf(rawDigits: string): string {
  const digits = onlyDigits(rawDigits).slice(0, CPF_DIGIT_COUNT)
  let formatted = ''
  for (let i = 0; i < digits.length; i++) {
    if (i === 3 || i === 6) formatted += '.'
    if (i === 9) formatted += '-'
    formatted += digits[i]
  }
  return formatted
}

/**
 * Validação de formato/dígito verificador de CPF (algoritmo padrão, módulo 11).
 * Rejeita também sequências de 11 dígitos repetidos (ex.: `000.000.000-00`),
 * que passam no cálculo do dígito verificador mas nunca são CPFs reais.
 */
export function isValidCpf(rawDigits: string): boolean {
  const digits = onlyDigits(rawDigits)
  if (digits.length !== CPF_DIGIT_COUNT) return false
  if (/^(\d)\1{10}$/.test(digits)) return false

  const calcCheckDigit = (base: string): number => {
    let sum = 0
    let weight = base.length + 1
    for (const char of base) {
      sum += Number(char) * weight
      weight -= 1
    }
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }

  const firstCheckDigit = calcCheckDigit(digits.slice(0, 9))
  const secondCheckDigit = calcCheckDigit(digits.slice(0, 9) + firstCheckDigit)

  return firstCheckDigit === Number(digits[9]) && secondCheckDigit === Number(digits[10])
}

export { CPF_DIGIT_COUNT, onlyDigits }
