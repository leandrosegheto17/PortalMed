import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import styles from './FormLayout.module.css'

export interface FormLayoutProps extends Omit<ComponentPropsWithoutRef<'form'>, 'className'> {
  children: ReactNode
}

/**
 * Wrapper de layout de formulário (UX-SPEC.md §6.2, FE-04): força coluna
 * única em **qualquer** breakpoint (mobile/tablet/desktop) — decisão
 * deliberada do UX-SPEC para reduzir erro de preenchimento e favorecer o
 * público idoso citado no RNF-06, mesmo em desktop (não é "coluna única só
 * em mobile que expande depois", é sempre única).
 *
 * Não é um componente de formulário em si — os campos (`CpfField`,
 * `DateOfBirthField`, `PasswordField`, `MfaCodeField`, os dois checkboxes de
 * aceite, todos de FE-03) continuam responsáveis pelo próprio
 * rótulo/validação/acessibilidade. Este componente é só o container
 * estrutural que qualquer tela de formulário (FE-06 em diante — TL-02,
 * TL-05, TL-06, TL-08, TL-13, TL-17, TL-19, TL-25) deve usar em vez de cada
 * tela decidir o próprio layout de formulário ad hoc — é exatamente o tipo
 * de infraestrutura compartilhada que esta tarefa (FE-04) existe para criar.
 *
 * Repassa os atributos nativos de `<form>` (`onSubmit`, `aria-label` etc.) —
 * a tela que compõe decide o rótulo acessível e o `onSubmit`, este
 * componente não assume nenhum dos dois.
 */
export function FormLayout({ children, ...formProps }: FormLayoutProps) {
  return (
    <form {...formProps} className={styles.form}>
      {children}
    </form>
  )
}
