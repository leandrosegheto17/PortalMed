import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Footer,
  Header,
  FormLayout,
  HealthDataConsentCheckbox,
  MessageBanner,
  TermsAcceptanceCheckbox,
} from '../../design-system'
import type { CadastroPersonalData } from '../CadastroDadosPessoaisPage/cadastroPersonalData'
import { fetchActiveTerms as fetchActiveTermsDefault, type TermsContent } from './termsApi'
import styles from './CadastroTermosConsentimentoPage.module.css'

export interface CadastroTermosConsentimentoPageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
  /**
   * Injeção de dependência para teste/reuso (mesmo padrão de
   * `lookupPatientByCpf` em `CadastroDadosPessoaisPage`/FE-06) — por padrão
   * usa `fetchActiveTerms` (mock-aware, ver `termsApi.ts`).
   */
  fetchTerms?: () => Promise<TermsContent>
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

type LoadStatus = 'loading' | 'error' | 'ready'

interface CadastroTermosLocationState {
  personalData?: CadastroPersonalData
}

/**
 * TL-05 — Termos de Uso e Consentimento LGPD (`UX-SPEC.md` §2, RF-12, RN-02).
 *
 * **Composição dos dois controles de aceite (critério de aceite de FE-07)**:
 * reutiliza integralmente `TermsAcceptanceCheckbox` e
 * `HealthDataConsentCheckbox` (FE-03) — dois componentes distintos, não uma
 * única checkbox combinada nem duas variantes de um componente configurável
 * — mantendo aqui, na tela real, exatamente a mesma separação visual
 * (moldura/ícone/selo do consentimento de saúde) e programática
 * (`role="group"` próprio + nome acessível composto) já testada em FE-03.
 * Este componente não decide *como* a distinção é feita — só que os dois
 * controles existem lado a lado e que o CTA depende de ambos.
 *
 * **CTA "Concluir cadastro" desabilitado até ambos os aceites**: o botão só
 * é renderizado quando o conteúdo dos Termos carregou com sucesso (não pode
 * haver aceite sem conteúdo visível, `UX-SPEC.md` §4) e permanece
 * `disabled` até `termsAccepted && healthDataConsentAccepted` — nunca uma
 * indicação apenas visual de "recomendado", é bloqueio real de `disabled`
 * no elemento, RN-02.
 *
 * **Estados de tela** (`UX-SPEC.md` §4): skeleton enquanto `TERMS_VERSION`
 * carrega; erro com "Tentar novamente" sem nenhum caminho de aceite
 * disponível enquanto o texto não carregar; sucesso mostra o texto rolável +
 * os dois controles + o CTA.
 *
 * Diferente de TL-03/TL-04 (telas de resultado com foco movido ao `<h1>` no
 * mount), TL-05 é uma tela de formulário com estado dinâmico próprio — mesma
 * categoria de TL-02, sem gestão de foco de "desfecho de fluxo".
 */
export function CadastroTermosConsentimentoPage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
  fetchTerms = fetchActiveTermsDefault,
}: CadastroTermosConsentimentoPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const personalData = (location.state as CadastroTermosLocationState | null)?.personalData

  const [status, setStatus] = useState<LoadStatus>('loading')
  const [content, setContent] = useState<TermsContent | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [healthDataConsentAccepted, setHealthDataConsentAccepted] = useState(false)

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Busca inicial no mount — mesmo padrão de `useBrandingTokens.ts`/FE-01
  // (efeito síncroniza com o sistema externo "conteúdo de termos", legítimo
  // uso de `useEffect` para fetch-on-mount).
  useEffect(() => {
    setStatus('loading')
    fetchTerms()
      .then((result) => {
        if (!isMountedRef.current) return
        setContent(result)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMountedRef.current) return
        setStatus('error')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTerms])

  // "Tentar novamente" (TL-05, `UX-SPEC.md` §4) — disparado pelo evento de
  // clique do paciente, não por um efeito; duplica a chamada mínima acima em
  // vez de compartilhar uma função também referenciada pelo efeito, para não
  // misturar "reação a mount" com "reação a clique" no mesmo callback.
  function handleRetry() {
    setStatus('loading')
    fetchTerms()
      .then((result) => {
        if (!isMountedRef.current) return
        setContent(result)
        setStatus('ready')
      })
      .catch(() => {
        if (!isMountedRef.current) return
        setStatus('error')
      })
  }

  const bothAccepted = termsAccepted && healthDataConsentAccepted

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!bothAccepted || !content) return
    navigate('/criar-conta/senha', {
      state: { personalData, termsVersion: content.version },
    })
  }

  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <h1 className={styles.heading}>Termos e Consentimento</h1>

        <FormLayout
          onSubmit={handleSubmit}
          aria-label="Termos de Uso e Consentimento LGPD"
          noValidate
        >
          {status === 'loading' ? (
            <div className={styles.skeleton} role="status" aria-live="polite">
              <span className={styles.srOnly}>Carregando termos de uso…</span>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLine} />
            </div>
          ) : null}

          {status === 'error' ? (
            <>
              <MessageBanner
                variant="error"
                message="Não foi possível carregar os Termos de Uso agora."
              />
              <button type="button" className={styles.retry} onClick={handleRetry}>
                Tentar novamente
              </button>
            </>
          ) : null}

          {status === 'ready' && content ? (
            <>
              <div
                className={styles.termsBlock}
                role="region"
                aria-label="Texto completo dos Termos de Uso e Política de Privacidade"
                tabIndex={0}
              >
                <h2>Termos de Uso</h2>
                <p>{content.termsOfUseText}</p>
                <h2>Política de Privacidade</h2>
                <p>{content.privacyPolicyText}</p>
              </div>

              <div className={styles.acceptGroup}>
                <TermsAcceptanceCheckbox checked={termsAccepted} onChange={setTermsAccepted} />
                <HealthDataConsentCheckbox
                  checked={healthDataConsentAccepted}
                  onChange={setHealthDataConsentAccepted}
                />
              </div>

              <button type="submit" className={styles.submit} disabled={!bothAccepted}>
                Concluir cadastro
              </button>
            </>
          ) : null}
        </FormLayout>
      </main>
      <Footer />
    </div>
  )
}
