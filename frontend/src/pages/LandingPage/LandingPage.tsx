import { Link } from 'react-router-dom'
import { Footer, Header } from '../../design-system'
import styles from './LandingPage.module.css'

export interface LandingPageProps {
  /**
   * Nome do hospital exibido no Header.
   *
   * Decisão de detalhe (mesma já documentada em `Header.tsx`/FE-02, não uma
   * nova): `BrandingConfig` (FE-01) não carrega nome institucional — o
   * `SDD.md` §5 mantém `nome_institucional` em `TENANT`, não em
   * `BRANDING_CONFIG`. Como a resolução de tenant por sessão/subdomínio
   * ainda não existe (integração de uma tarefa futura), esta página aceita
   * `hospitalName` como prop com um valor de desenvolvimento por default,
   * para não bloquear FE-05 nem recriar o módulo de branding fora de escopo.
   */
  hospitalName?: string
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

/**
 * TL-01 — Landing pública (`UX-SPEC.md` §2, TL-01).
 *
 * Header + bloco central de boas-vindas com os dois CTAs primários
 * ("Entrar"/"Criar conta") + Footer institucional, reutilizando
 * integralmente os componentes estruturais de FE-02 (nenhum recriado aqui).
 * Tela puramente estática do ponto de vista de dado próprio (sem lista/
 * formulário) — não consta na tabela de estados do `UX-SPEC.md` §4, que só
 * começa em TL-02; o único dado dinâmico da tela (marca do hospital) já tem
 * seus próprios estados tratados dentro de `Header`/`BrandTokensProvider`
 * (FE-01/FE-02), não duplicados aqui.
 */
export function LandingPage({ hospitalName = DEFAULT_HOSPITAL_NAME }: LandingPageProps) {
  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <h1 className={styles.heading}>Bem-vindo(a) ao Portal de Resultados de Exames</h1>
        <p className={styles.subheading}>
          Consulte seus laudos e imagens de exames com segurança, a qualquer momento.
        </p>
        <div className={styles.ctaGroup}>
          <Link to="/entrar" className={styles.cta}>
            Entrar
          </Link>
          <Link to="/criar-conta" className={styles.cta}>
            Criar conta
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
