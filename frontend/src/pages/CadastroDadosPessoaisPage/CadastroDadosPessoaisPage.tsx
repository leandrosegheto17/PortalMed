import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CpfField,
  DateOfBirthField,
  Footer,
  Header,
  FormLayout,
  MessageBanner,
  isValidCpf,
} from '../../design-system'
import { isAdult } from './ageValidation'
import type { CadastroPersonalData } from './cadastroPersonalData'
import type { PatientLookupResult } from './patientLookupApi'
import { lookupPatientByCpf as lookupPatientByCpfDefault } from './patientLookupApi'
import { PHONE_DIGIT_COUNT_MOBILE, formatPhone, isValidPhoneDigits, onlyDigits } from './phone'
import styles from './CadastroDadosPessoaisPage.module.css'
import { TextField } from './TextField'

export interface CadastroDadosPessoaisPageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
  /**
   * Injeção de dependência para teste/reuso — por padrão usa
   * `lookupPatientByCpf` (mock-aware, ver `patientLookupApi.ts`). Permite a
   * `CadastroDadosPessoaisPage.test.tsx` simular tanto "CPF localizado"
   * quanto "CPF não localizado" (TL-04) e falha de rede, sem que o mock real
   * (hoje sempre otimista) precise saber fazer isso.
   */
  lookupPatientByCpf?: (cpf: string) => Promise<PatientLookupResult>
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type LookupStatus = 'idle' | 'loading' | 'error'

interface TouchedFields {
  nome: boolean
  email: boolean
  celular: boolean
}

/**
 * TL-02 — Criar Conta – Dados Pessoais (`UX-SPEC.md` §2, RF-15, RN-01).
 *
 * Formulário de coluna única (`FormLayout`/FE-04): nome completo, CPF
 * (`CpfField`/FE-03), data de nascimento (`DateOfBirthField`/FE-03), e-mail e
 * celular. CTA único "Continuar", sem submissão parcial — `handleSubmit`
 * primeiro marca todos os campos como "tentativa de envio" (revela todo erro
 * de formato pendente de uma vez, inclusive em campos nunca tocados) e só
 * prossegue quando o formulário inteiro é válido.
 *
 * **RN-01, sem exceção**: a idade é calculada e verificada (`isAdult`,
 * 100% cliente, `ageValidation.ts`) **antes** de qualquer chamada ao serviço
 * de match de CPF (`lookupPatientByCpf`) — um paciente menor de idade nunca
 * chega a disparar a chamada de rede, e a navegação para o bloqueio (TL-03,
 * `/criar-conta/bloqueio-idade`) não passa por nenhuma etapa que ofereça
 * "corrigir a data e tentar de novo" (essa tela nem tem formulário, ver
 * `CadastroBloqueioMenorIdadePage.tsx`).
 *
 * **Mock-aware (pendência real, não apenas de convenção)**: `lookupPatientByCpf`
 * (RF-14/BE-18) ainda não tem endpoint publicado — ver o comentário completo
 * em `patientLookupApi.ts`. Esta tarefa (FE-06) permanece `Em Andamento` por
 * causa disso, mesmo com TL-02/TL-03/TL-04 totalmente implementadas e
 * testadas.
 *
 * **Repasse de dados para TL-05 (FE-07)**: em caso de sucesso, os dados
 * coletados aqui (`CadastroPersonalData`) são repassados via
 * `location.state` para `/criar-conta/termos` — ver `cadastroPersonalData.ts`
 * para o racional de não introduzir uma store global para isso.
 */
export function CadastroDadosPessoaisPage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
  lookupPatientByCpf = lookupPatientByCpfDefault,
}: CadastroDadosPessoaisPageProps) {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [cpfDigits, setCpfDigits] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [celularDigits, setCelularDigits] = useState('')

  const [touched, setTouched] = useState<TouchedFields>({
    nome: false,
    email: false,
    celular: false,
  })
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>('idle')
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  function markTouched(field: keyof TouchedFields) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const showFieldError = (field: keyof TouchedFields) => touched[field] || submitAttempted

  const nomeError =
    showFieldError('nome') && nome.trim().length === 0 ? 'Informe seu nome completo.' : null

  function resolveEmailError(): string | null {
    if (!showFieldError('email')) return null
    if (email.length === 0) return 'Informe seu e-mail.'
    if (!EMAIL_PATTERN.test(email)) return 'E-mail inválido. Verifique o endereço digitado.'
    return null
  }
  const emailError = resolveEmailError()

  function resolveCelularError(): string | null {
    if (!showFieldError('celular')) return null
    if (celularDigits.length === 0) return 'Informe seu celular.'
    if (!isValidPhoneDigits(celularDigits)) {
      return 'Celular inválido. Verifique o número digitado (com DDD).'
    }
    return null
  }
  const celularError = resolveCelularError()

  const cpfError =
    submitAttempted && !isValidCpf(cpfDigits)
      ? 'CPF inválido. Verifique os números digitados.'
      : null

  const dobError = submitAttempted && !dob ? 'Informe sua data de nascimento completa.' : null

  const isFormValid =
    nome.trim().length > 0 &&
    isValidCpf(cpfDigits) &&
    dob.length > 0 &&
    EMAIL_PATTERN.test(email) &&
    isValidPhoneDigits(celularDigits)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)
    setLookupErrorMessage(null)

    if (!isFormValid) return

    // RN-01, sem exceção: verificação de maioridade sempre primeiro, e
    // sempre 100% local — nenhuma chamada de rede acontece antes dela.
    if (!isAdult(dob)) {
      navigate('/criar-conta/bloqueio-idade')
      return
    }

    setLookupStatus('loading')
    lookupPatientByCpf(cpfDigits)
      .then((result) => {
        if (!isMountedRef.current) return
        if (!result.found) {
          navigate('/criar-conta/cpf-nao-localizado')
          return
        }
        setLookupStatus('idle')
        const personalData: CadastroPersonalData = {
          nome: nome.trim(),
          cpf: cpfDigits,
          dataNascimento: dob,
          email,
          celular: celularDigits,
        }
        navigate('/criar-conta/termos', { state: { personalData } })
      })
      .catch(() => {
        if (!isMountedRef.current) return
        setLookupStatus('error')
        setLookupErrorMessage(
          'Não foi possível validar seus dados agora. Tente novamente em instantes.',
        )
      })
  }

  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <h1 className={styles.heading}>Criar conta</h1>
        <MessageBanner variant="error" message={lookupErrorMessage} />
        <FormLayout
          onSubmit={handleSubmit}
          aria-label="Formulário de cadastro — dados pessoais"
          noValidate
        >
          <TextField
            label="Nome completo"
            value={nome}
            onChange={setNome}
            onBlur={() => markTouched('nome')}
            errorMessage={nomeError}
            autoComplete="name"
          />
          <CpfField value={cpfDigits} onChange={setCpfDigits} externalError={cpfError} />
          <DateOfBirthField value={dob} onChange={setDob} externalError={dobError} />
          <TextField
            label="E-mail"
            type="email"
            inputMode="email"
            value={email}
            onChange={setEmail}
            onBlur={() => markTouched('email')}
            errorMessage={emailError}
            autoComplete="email"
          />
          <TextField
            label="Celular"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            value={formatPhone(celularDigits)}
            onChange={(value) =>
              setCelularDigits(onlyDigits(value).slice(0, PHONE_DIGIT_COUNT_MOBILE))
            }
            onBlur={() => markTouched('celular')}
            errorMessage={celularError}
            autoComplete="tel-national"
          />
          <button
            type="submit"
            className={styles.submit}
            disabled={lookupStatus === 'loading'}
            aria-busy={lookupStatus === 'loading'}
          >
            {lookupStatus === 'loading' ? 'Validando…' : 'Continuar'}
          </button>
        </FormLayout>
      </main>
      <Footer />
    </div>
  )
}
