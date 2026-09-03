import type { ReactNode } from 'react'
import { useBreakpoint } from '../../responsive/useBreakpoint'
import styles from './ResponsiveDataList.module.css'

export interface ResponsiveDataListColumn<Row> {
  /** Identificador único da coluna (chave de React) — nunca exibido. */
  key: string
  /** Cabeçalho da coluna — vira `<th scope="col">` na tabela e rótulo (`<dt>`) no card. */
  header: string
  render: (row: Row) => ReactNode
  /**
   * Marca esta coluna como o "título" do card em mobile (ex.: a data do
   * exame) — renderizada em destaque, fora da lista `<dt>/<dd>` das demais
   * colunas, para o card ter um cabeçalho reconhecível (a linha da tabela já
   * tem essa referência implícita ao alinhar com `<th>`; o card, empilhado,
   * não). No máximo uma coluna deve ser marcada; se mais de uma for, a
   * primeira encontrada é usada — decisão de detalhe deste agente: evita
   * lançar erro em runtime por um erro de configuração de baixo risco em vez
   * de travar a tela inteira.
   */
  isCardTitle?: boolean
}

export interface ResponsiveDataListProps<Row> {
  /** Nome acessível da tabela/lista (ex.: "Lista de exames") — vira `aria-label` tanto na `<table>` quanto na `<ul>` de cards, nunca um heading visível duplicado. */
  caption: string
  columns: ResponsiveDataListColumn<Row>[]
  rows: Row[]
  getRowKey: (row: Row) => string
  /**
   * Estado vazio (UX-SPEC.md §4 — cada tela consumidora define seu próprio
   * texto, ex. TL-21 "Você ainda não tem exames disponíveis no portal.").
   * Renderizado no lugar da tabela/lista quando `rows.length === 0`; se
   * omitido, nada é renderizado (a ausência de estado vazio explicativo é
   * responsabilidade da tela que compõe este componente, não deste
   * componente inferir um texto genérico).
   */
  emptyState?: ReactNode
}

/**
 * Padrão reutilizável de colapso lista→card (UX-SPEC.md §6.2, FE-04):
 * renderiza uma `<table>` semântica (`<th scope="col">`) em tablet/desktop e
 * uma lista de cards empilhados (`<ul>` de `<li>`, cada um com um `<dl>` de
 * pares rótulo/valor) em mobile — nunca uma tabela densa com scroll
 * horizontal forçado como única solução em telas pequenas.
 *
 * Decisão de arquitetura (dentro da autoridade deste agente): diferente de
 * `Navigation`/`ConfirmationModal` (FE-02), que colapsam via CSS puro
 * (`@media`, mesma árvore DOM o tempo todo, só o estilo muda), aqui o
 * colapso é decidido em **JS** (`useBreakpoint`, baseado em `matchMedia`).
 * Dois motivos:
 * 1. Evita montar as duas estruturas (tabela E lista de cards)
 *    simultaneamente no DOM só escondendo uma via `display: none` — o que
 *    arrisca leitor de tela em modo de navegação por elemento/tabela
 *    encontrar e anunciar conteúdo duplicado, além de token de foco
 *    percorrer elementos "ocultos visualmente, mas presentes" se algum
 *    filho for focável.
 * 2. Torna a lógica de colapso testável de forma determinística (mock de
 *    `matchMedia`), sem depender do motor de CSS do jsdom avaliar `@media`
 *    a partir de `window.innerWidth` — a mesma limitação de ambiente já
 *    documentada em `Navigation.test.tsx` (FE-02). A verificação puramente
 *    visual do breakpoint real do navegador (proporção, tipografia, recorte)
 *    fica para revisão/QA manual, mesmo padrão de documentação de limitação
 *    já usado em FE-02.
 *
 * Este componente é infraestrutura (FE-04) — nenhuma tela concreta o
 * consome ainda nesta tarefa. Telas com listas/tabelas reais (Meus Exames/
 * TL-21, Meu Histórico/TL-24, Meus Links Compartilhados/TL-27, Gestão de
 * Usuários/TL-31, Auditoria do Hospital/TL-33) o consomem a partir de FE-12
 * em diante.
 */
export function ResponsiveDataList<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyState,
}: ResponsiveDataListProps<Row>) {
  const breakpoint = useBreakpoint()
  const isMobile = breakpoint === 'mobile'

  if (rows.length === 0) {
    return emptyState !== undefined ? <div className={styles.emptyState}>{emptyState}</div> : null
  }

  if (isMobile) {
    const titleColumn = columns.find((column) => column.isCardTitle)
    const fieldColumns = titleColumn
      ? columns.filter((column) => column !== titleColumn)
      : columns

    return (
      <ul className={styles.cardList} aria-label={caption}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className={styles.card}>
            {titleColumn ? <p className={styles.cardTitle}>{titleColumn.render(row)}</p> : null}
            <dl className={styles.cardFields}>
              {fieldColumns.map((column) => (
                <div key={column.key} className={styles.cardField}>
                  <dt className={styles.cardFieldLabel}>{column.header}</dt>
                  <dd className={styles.cardFieldValue}>{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <table className={styles.table} aria-label={caption}>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={getRowKey(row)}>
            {columns.map((column) => (
              <td key={column.key}>{column.render(row)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
