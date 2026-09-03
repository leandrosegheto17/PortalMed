import type { CadastroPersonalData } from '../CadastroDadosPessoaisPage/cadastroPersonalData'

export interface CadastroSubmissionPayload {
  personalData?: CadastroPersonalData
  termsVersion?: string
  senha: string
}

export interface CadastroSubmissionResult {
  success: true
}

/**
 * *** PONTO DE SINCRONIZAÇÃO COM O BACKEND (mock-aware) — pendência real ***
 *
 * Cobre a submissão final do cadastro (TL-06 → TL-07): criação da conta
 * (RF-15/BE-18) + registro do consentimento (RF-12/BE-19 — `TERMS_VERSION` +
 * `CONSENT_RECORD` **separado**, RN-02). Ambas `TASK.md` §3.3, status
 * "A Fazer" nesta data — nenhum `API-CONTRACT.yaml` publicado no repositório
 * até o momento desta implementação (mesma situação de
 * `patientLookupApi.ts`/FE-06 e `termsApi.ts`/FE-07).
 *
 * `CadastroSubmissionPayload` é deliberadamente um único formato simplificado
 * para o mock — o contrato real do backend provavelmente exige duas
 * chamadas/duas entidades persistidas separadamente (RN-02 exige o registro
 * de consentimento de dado de saúde como campo/registro distinto do aceite
 * geral, nunca um único checkbox combinado — regra já respeitada na *tela*,
 * ver `CadastroTermosConsentimentoPage.tsx`, mas a forma exata da chamada de
 * API é decisão do Backend, não deste agente). Quando BE-18/BE-19 publicarem
 * `API-CONTRACT.yaml`, este módulo é reescrito para bater com o contrato
 * real — inclusive se isso significar duas chamadas em vez de uma — ajuste
 * pontual, sem reabrir a composição de tela de FE-07.
 *
 * **Garantia estrutural de "login não automático" (critério de aceite de
 * FE-07)**: este mock — e o contrato esperado do endpoint real, já que
 * ADR-007 (`TASK.md` §1.2) exige sessão server-side via cookie
 * `HttpOnly`/`Secure`, nunca criada implicitamente pelo cliente — nunca
 * retorna token/sessão alguma. `CadastroSubmissionResult` só carrega
 * `success: true`. `CadastroDefinirSenhaPage` não lê nada além disso do
 * retorno, e `CadastroConfirmacaoPage` (TL-07) não invoca nenhum mecanismo de
 * sessão/autenticação — RF-01 continua exigindo entrada explícita de
 * credenciais + MFA em TL-08, mesmo logo após este cadastro. Ver também o
 * teste "não autentica automaticamente" em
 * `CadastroDefinirSenhaPage.test.tsx`/`CadastroConfirmacaoPage.test.tsx`.
 */
export async function submitRegistration(
  _payload: CadastroSubmissionPayload,
): Promise<CadastroSubmissionResult> {
  return { success: true }
}
