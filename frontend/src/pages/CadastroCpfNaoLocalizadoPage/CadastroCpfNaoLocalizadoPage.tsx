import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Footer, Header, MessageBanner } from '../../design-system'
import styles from './CadastroCpfNaoLocalizadoPage.module.css'

export interface CadastroCpfNaoLocalizadoPageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

/**
 * TL-04 — Erro – CPF não localizado (`UX-SPEC.md` §2, RF-15).
 *
 * Mesmo padrão estrutural de `CadastroBloqueioMenorIdadePage`/TL-03 (bloco
 * central, sem formulário, tela de resultado — `UX-SPEC.md` §4), mas com tom
 * de "ação necessária" em vez de "regra definitiva": `MessageBanner`
 * `variant="warning"` (âmbar), não `variant="info"` (TL-03) nem
 * `variant="error"` (que sugeriria falha/culpa do paciente, o que
 * `UX-SPEC.md` explicitamente evita — o CPF pode simplesmente não ter sido
 * ainda sincronizado pelo hospital no sistema interno).
 *
 * Diferente de TL-03, aqui existe uma segunda ação: o paciente pode ter se
 * enganado e já possuir conta — link secundário "Já tenho cadastro, entrar"
 * para `/entrar` (`UX-SPEC.md` TL-04). Não há, ainda assim, nenhum caminho de
 * volta ao formulário de cadastro que reenvie o mesmo CPF — a orientação
 * correta é presencial (recepção do hospital), não uma nova tentativa digital.
 */
export function CadastroCpfNaoLocalizadoPage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
}: CadastroCpfNaoLocalizadoPageProps) {
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
            variant="warning"
            message="Não localizamos seu CPF no cadastro deste hospital."
          />
          <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
            CPF não localizado
          </h1>
          <p className={styles.description}>
            Procure a recepção do hospital para verificar e atualizar seu cadastro no
            sistema interno. Assim que regularizado, você poderá concluir a criação da
            sua conta no portal.
          </p>
          <Link to="/" className={styles.cta}>
            Voltar à página inicial
          </Link>
          <Link to="/entrar" className={styles.secondaryLink}>
            Já tenho cadastro, entrar
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
