import { useId, useRef, useState } from 'react'
import styles from './Navigation.module.css'

export type NavigationVariant = 'paciente' | 'administrador'

export interface NavigationItem {
  label: string
  href: string
}

const PATIENT_ITEMS: NavigationItem[] = [
  { label: 'Meus Exames', href: '/exames' },
  { label: 'Meu Histórico', href: '/historico' },
  { label: 'Ajuda', href: '/ajuda' },
]

const ADMIN_ITEMS: NavigationItem[] = [
  { label: 'Gestão de Usuários', href: '/admin/usuarios' },
  { label: 'Auditoria', href: '/admin/auditoria' },
  { label: 'Ajuda', href: '/ajuda' },
]

export interface NavigationProps {
  variant: NavigationVariant
  /** Caminho da tela atual — usado para marcar `aria-current="page"` no item correspondente. */
  currentPath?: string
  /** Aciona "Sair" (logout). Sem integração com sessão real nesta tarefa (FE-02 é estrutural). */
  onSignOut?: () => void
}

/**
 * Navegação Principal (paciente/administrador), UX-SPEC.md §3.1.
 *
 * Itens fixos por variante, "Sair" sempre por último e renderizado como
 * `<button>` (é uma ação, não uma rota) — o restante são links de navegação
 * de fato. Colapsa em menu hambúrguer abaixo de 600px (§6.1), com o menu
 * sempre presente no DOM (visibilidade controlada por CSS + `aria-expanded`).
 */
export function Navigation({ variant, currentPath, onSignOut }: NavigationProps) {
  const items = variant === 'paciente' ? PATIENT_ITEMS : ADMIN_ITEMS
  const label =
    variant === 'paciente'
      ? 'Navegação principal do paciente'
      : 'Navegação principal do administrador'

  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef<HTMLButtonElement>(null)

  function close() {
    setIsOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <nav
      className={styles.nav}
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          close()
        }
      }}
    >
      <button
        ref={toggleRef}
        type="button"
        className={styles.menuToggle}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-label={isOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
        onClick={() => setIsOpen((open) => !open)}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <ul id={menuId} className={`${styles.list} ${isOpen ? styles.listOpen : ''}`}>
        {items.map((item) => (
          <li key={item.href}>
            <a
              className={styles.link}
              href={item.href}
              aria-current={item.href === currentPath ? 'page' : undefined}
            >
              {item.label}
            </a>
          </li>
        ))}
        <li>
          <button type="button" className={styles.signOutButton} onClick={onSignOut}>
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
