import styles from './Footer.module.css'

export interface FooterLink {
  label: string
  href: string
}

export interface FooterProps {
  /** Sobrescrita opcional — por padrão, os 3 links institucionais do UX-SPEC.md §3.1. */
  links?: FooterLink[]
}

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Termos de Uso', href: '/termos' },
  { label: 'Política de Privacidade', href: '/privacidade' },
  { label: 'Ajuda', href: '/ajuda' },
]

/** Footer institucional (UX-SPEC.md §3.1) — presente em todas as telas. */
export function Footer({ links = DEFAULT_LINKS }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <nav aria-label="Links institucionais">
        <ul className={styles.list}>
          {links.map((link) => (
            <li key={link.href}>
              <a className={styles.link} href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  )
}
