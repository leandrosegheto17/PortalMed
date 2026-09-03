import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Footer, Header, FormLayout, MessageBanner, PasswordField } from '../../design-system'
import type { CadastroPersonalData } from '../CadastroDadosPessoaisPage/cadastroPersonalData'
import { isPasswordValid } from './passwordValidation'
import type { CadastroSubmissionResult } from './registrationApi'
import { submitRegistration as submitRegistrationDefault } from './registrationApi'
import styles from './CadastroDefinirSenhaPage.module.css'

export interface CadastroDefinirSenhaPageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
  /**
   * Injeção de dependência para teste/reuso (mesmo padrão de
   * `lookupPatientByCpf`/FE-06 e `fetchTerms`/FE-07) — por padrão usa
   * `submitRegistration` (mock-aware, ver `registrationApi.ts`).
   */
  submitRegistration?: (payload: {
    personalData?: CadastroPersonalData
    termsVersion?: string
    senha: string
  }) => Promise<CadastroSubmissionResult>
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

interface CadastroSenhaLocationState {
  personalData?: CadastroPersonalData
  termsVersion?: string
}

type SubmitStatus = 'idle' | 'submitting'

/**
 * TL-06 — Definir Senha (`UX-SPEC.md` §2).
 *
 * Formulário simples de duas instâncias de `PasswordField` (FE-03, senha +
 * confirmação), cada uma com o próprio indicador de força/checklist de
 * política visível antes da tentativa de submissão (herdado do componente,
 * não reimplementado aqui). CTA "Criar conta" — **este é o ponto real de
 * submissão do cadastro** (`submitRegistration`, mock-aware, ver
 * `registrationApi.ts` para a pendência de BE-18/BE-19 e a garantia
 * estrutural de que nenhuma sessão é criada aqui).
 *
 * Sem submissão parcial, mesmo padrão de `CadastroDadosPessoaisPage`/TL-02:
 * `handleSubmit` marca a tentativa de envio (revela erro de política/
 * confirmação de uma vez) e só chama `submitRegistration` com o formulário
 * inteiro válido.
 */
export function CadastroDefinirSenhaPage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
  submitRegistration = submitRegistrationDefault,
}: CadastroDefinirSenhaPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { personalData, termsVersion } = (location.state as CadastroSenhaLocationState | null) ?? {}

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [status, setStatus] = useState<SubmitStatus>('idle')
  const [submissionErrorMessage, setSubmissionErrorMessage] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const passwordMeetsPolicy = isPasswordValid(password)
  const confirmMatches = confirmPassword.length > 0 && confirmPassword === password

  const passwordError =
    submitAttempted && !passwordMeetsPolicy
      ? 'A senha não atende aos requisitos mínimos listados abaixo.'
      : null
  const confirmError =
    submitAttempted && !confirmMatches ? 'As senhas não coincidem.' : null

  const isFormValid = passwordMeetsPolicy && confirmMatches

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)
    setSubmissionErrorMessage(null)

    if (!isFormValid) return

    setStatus('submitting')
    submitRegistration({ personalData, termsVersion, senha: password })
      .then(() => {
        if (!isMountedRef.current) return
        // Login não automático (critério de aceite de FE-07): nenhum token/
        // sessão é lido do retorno (o mock/contrato esperado nunca carrega
        // um) — apenas navegação para a confirmação, RF-01 continua exigindo
        // entrada explícita de credenciais depois.
        navigate('/criar-conta/sucesso', { state: { nome: personalData?.nome } })
      })
      .catch(() => {
        if (!isMountedRef.current) return
        setStatus('idle')
        setSubmissionErrorMessage(
          'Não foi possível concluir seu cadastro agora. Tente novamente em instantes.',
        )
      })
  }

  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <h1 className={styles.heading}>Definir senha</h1>
        <MessageBanner variant="error" message={submissionErrorMessage} />
        <FormLayout onSubmit={handleSubmit} aria-label="Formulário de definição de senha" noValidate>
          <PasswordField
            label="Senha"
            value={password}
            onChange={setPassword}
            externalError={passwordError}
          />
          <PasswordField
            label="Confirmar senha"
            value={confirmPassword}
            onChange={setConfirmPassword}
            externalError={confirmError}
          />
          <button
            type="submit"
            className={styles.submit}
            disabled={status === 'submitting'}
            aria-busy={status === 'submitting'}
          >
            {status === 'submitting' ? 'Criando conta…' : 'Criar conta'}
          </button>
        </FormLayout>
      </main>
      <Footer />
    </div>
  )
}
