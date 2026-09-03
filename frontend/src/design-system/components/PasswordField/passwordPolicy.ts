export interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumber: boolean
  requireSpecialChar: boolean
}

/**
 * Default de política de senha — `PRD-TECNICO.md` menciona "política mínima"
 * sem detalhar valores numéricos (nenhum RN/RF fixa os critérios exatos,
 * diferente da tabela de defaults já adotada pelo Tech Lead em `TASK.md`
 * §1.7 para outros parâmetros). Seguindo o mesmo princípio ali documentado
 * ("todo parâmetro numérico ainda 'a confirmar' é implementado como
 * configuração, nunca hardcoded"), a política é uma prop configurável com
 * este default razoável (mínimo 8 caracteres, maiúscula+minúscula+número) —
 * decisão de detalhe deste agente, dentro da autoridade de implementação de
 * componente, não uma decisão de regra de negócio fechada.
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
}
