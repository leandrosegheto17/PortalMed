import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Footer, Header, MessageBanner } from '../../design-system'
import styles from './CadastroConfirmacaoPage.module.css'

export interface CadastroConfirmacaoPageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

interface CadastroConfirmacaoLocationState {
  nome?: string
}

/**
 * TL-07 — Confirmação de Cadastro (`UX-SPEC.md` §2).
 *
 * Tela de **resultado** (mesma categoria de TL-03/TL-04, `UX-SPEC.md` §4:
 * "não aplicável" para vazio/carregando/erro — é o desfecho de sucesso do
 * fluxo de TL-06). Foco movido programaticamente ao `<h1>` no mount, mesmo
 * padrão de `CadastroBloqueioMenorIdadePage`/`CadastroCpfNaoLocalizadoPage`.
 *
 * **Login não automático (critério de aceite de FE-07, `UX-SPEC.md` TL-07:
 * "não login automático — RF-01 exige autenticação explícita mesmo logo após
 * o cadastro, incluindo MFA")**: este componente não lê nem grava nenhum
 * token/sessão/cookie — não importa nenhum mecanismo de autenticação, não
 * chama `localStorage`/`sessionStorage`/`document.cookie`. O único efeito é
 * renderizar a mensagem de sucesso; o único CTA ("Ir para o login") é um
 * `<Link>` comum para `/entrar` (TL-08, ainda placeholder até FE-08), que
 * exige o preenchimento explícito de credenciais + MFA como qualquer login,
 * sem nenhum estado de sessão pré-populado por este cadastro. Testado
 * explicitamente em `CadastroConfirmacaoPage.test.tsx`.
 */
export function CadastroConfirmacaoPage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
}: CadastroConfirmacaoPageProps) {
  const location = useLocation()
  const nome = (location.state as CadastroConfirmacaoLocationState | null)?.nome
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <div className={styles.block}>
          <MessageBanner
            variant="success"
            message="Cadastro concluído com sucesso."
          />
          <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
            {nome ? `Conta criada, ${nome}!` : 'Conta criada com sucesso!'}
          </h1>
          <p className={styles.description}>
            Sua conta foi criada. Para acessar seus exames, entre com o e-mail e a senha
            cadastrados — você também precisará confirmar seu segundo fator de autenticação
            (MFA) no primeiro acesso.
          </p>
          <Link to="/entrar" className={styles.cta}>
            Ir para o login
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
