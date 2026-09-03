import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Footer, Header, MessageBanner } from '../../design-system'
import styles from './CadastroBloqueioMenorIdadePage.module.css'

export interface CadastroBloqueioMenorIdadePageProps {
  /** Mesma decisão de detalhe já documentada em `Header.tsx`/FE-02 e `LandingPage.tsx`/FE-05. */
  hospitalName?: string
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

/**
 * TL-03 — Bloqueio – Menor de Idade (`UX-SPEC.md` §2, RN-01).
 *
 * Tela de **resultado** (`UX-SPEC.md` §4: "não aplicável" para vazio/
 * carregando — a tela inteira é o desfecho de uma decisão já tomada em
 * TL-02). Sem formulário, sem qualquer link/CTA de volta ao formulário de
 * cadastro (`/criar-conta`) — **deliberadamente**: RN-01/EXCEPTION é
 * "Nenhuma nesta release", e `UX-SPEC.md` TL-03 é explícito ("Sem opção de
 * tentar novamente com outra data"). O único destino possível a partir daqui
 * é a página inicial (`/`), nunca de volta ao próprio formulário.
 *
 * Ícone informativo (não de erro/alerta vermelho): `MessageBanner`
 * `variant="info"` (mesma cor `--color-info` usada em mensagens
 * informativas do design system) — reforça que isto é uma regra de negócio
 * (RN-01), não uma falha do paciente ou do preenchimento.
 */
export function CadastroBloqueioMenorIdadePage({
  hospitalName = DEFAULT_HOSPITAL_NAME,
}: CadastroBloqueioMenorIdadePageProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move o foco para o título ao entrar nesta tela (navegação via SPA, sem
  // recarregamento de página) — garante que um leitor de tela anuncie o
  // desfecho do fluxo de cadastro imediatamente, sem exigir navegação manual.
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <div className={styles.block}>
          <MessageBanner
            variant="info"
            message="O autoatendimento digital para menores de 18 anos ainda não está disponível nesta versão do portal."
          />
          <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
            Autoatendimento digital indisponível para menores de idade
          </h1>
          <p className={styles.description}>
            Para acessar exames de um paciente menor de idade, procure a recepção do
            hospital — o atendimento presencial continua disponível normalmente.
          </p>
          <Link to="/" className={styles.cta}>
            Voltar à página inicial
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
