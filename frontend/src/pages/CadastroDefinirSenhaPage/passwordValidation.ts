import { DEFAULT_PASSWORD_POLICY, type PasswordPolicy } from '../../design-system'

/**
 * Validador local a esta tela (`PasswordField`/FE-03 expõe a checklist
 * visual/`aria-live`, mas não uma função pura de "senha válida?" — mesma
 * decisão de detalhe já tomada em FE-06 para `phone.ts`: utilitário local,
 * não promovido a componente/exportação do design system, por ser usado só
 * aqui). Reaplica exatamente as mesmas regras de `PasswordField.tsx`
 * (`buildRules`) para não divergir do que a checklist visual já comunica ao
 * paciente.
 */
export function isPasswordValid(
  value: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): boolean {
  if (value.length < policy.minLength) return false
  if (policy.requireUppercase && !/[A-Z]/.test(value)) return false
  if (policy.requireLowercase && !/[a-z]/.test(value)) return false
  if (policy.requireNumber && !/[0-9]/.test(value)) return false
  if (policy.requireSpecialChar && !/[^A-Za-z0-9]/.test(value)) return false
  return true
}
