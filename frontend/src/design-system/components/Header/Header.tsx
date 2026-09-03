import type { ReactNode } from 'react'
import { useBrandingTokensStatus } from '../../branding/brandingTokensContext'
import styles from './Header.module.css'

export interface HeaderProps {
  /**
   * Nome do hospital exibido ao lado do logo.
   *
   * *** Decisão de detalhe (FE-02) ***: o `UX-SPEC.md` §3.1 descreve a fonte
   * como `BRANDING_CONFIG`, mas o modelo de dados real (`SDD.md` §5) mantém
   * `nome_institucional` em `TENANT`, não em `BRANDING_CONFIG` — o tipo
   * `BrandingConfig` de FE-01 (branding/types.ts), corretamente alinhado ao
   * `SDD.md`, não carrega nome. Para não recriar/estender o módulo de
   * branding já pronto e testado (fora do escopo desta tarefa) e para não
   * travar a implementação por essa divergência pontual de redação, este
   * componente recebe `hospitalName` como prop explícita — a tela/app shell
   * que compõe o `Header` é quem decide de onde vem o dado (ex.: dado de
   * sessão/tenant carregado junto do login, tarefa de integração futura).
   * Logo e paleta continuam 100% dinâmicos via `BrandTokensProvider`/FE-01,
   * cumprindo o critério de aceite central desta tarefa.
   */
  hospitalName: string
  /** Slot de composição para o componente `Navigation` (renderizado dentro do header). */
  navigationSlot?: ReactNode
}

/**
 * Header institucional (UX-SPEC.md §3.1) — altura fixa, logo e paleta
 * aplicados dinamicamente por tenant via os tokens de marca já implementados
 * em FE-01 (`useBrandingTokensStatus`/`BrandTokensProvider`). Precisa ser
 * renderizado dentro de um `<BrandTokensProvider>` ancestral.
 */
export function Header({ hospitalName, navigationSlot }: HeaderProps) {
  const { status, appliedTokens } = useBrandingTokensStatus()

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        {status === 'ready' && appliedTokens ? (
          <img
            className={styles.logo}
            src={appliedTokens.logoUrl}
            alt={`Logo do hospital ${hospitalName}`}
          />
        ) : null}
        <span className={styles.hospitalName}>{hospitalName}</span>
      </div>
      {navigationSlot}
    </header>
  )
}
