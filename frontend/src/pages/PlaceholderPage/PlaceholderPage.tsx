import { Link } from 'react-router-dom'
import { Footer, Header } from '../../design-system'
import styles from './PlaceholderPage.module.css'

export interface PlaceholderPageProps {
  /** Título da tela ainda não implementada (ex.: "Entrar", "Criar conta"). */
  title: string
  /** Mesma decisão de detalhe de `LandingPage.tsx` — ver comentário lá. */
  hospitalName?: string
}

const DEFAULT_HOSPITAL_NAME = 'Hospital Piloto'

/**
 * Rota placeholder — introduzida por FE-05 exclusivamente para que os CTAs
 * "Entrar"/"Criar conta" da landing pública (TL-01) tenham um destino de
 * navegação real, sem bloquear esta tarefa pela dependência de telas futuras
 * ainda não implementadas (login real = FE-08/TL-08; cadastro real =
 * FE-06/TL-02) — decisão de roteamento documentada no relatório de FE-05.
 *
 * Não é uma tela do `UX-SPEC.md` e nunca deve ser confundida com TL-02/TL-08
 * reais — cada rota placeholder (`/entrar`, `/criar-conta`, ver `routes.tsx`)
 * é substituída pela tela real quando a tarefa correspondente for
 * implementada, sem exigir mudança nesta tarefa.
 */
export function PlaceholderPage({
  title,
  hospitalName = DEFAULT_HOSPITAL_NAME,
}: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <Header hospitalName={hospitalName} />
      <main className={styles.main}>
        <h1>{title}</h1>
        <p>Esta tela ainda não foi implementada.</p>
        <Link to="/">Voltar à página inicial</Link>
      </main>
      <Footer />
    </div>
  )
}
