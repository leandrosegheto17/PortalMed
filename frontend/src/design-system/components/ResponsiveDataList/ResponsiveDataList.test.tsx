import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { installMatchMediaMock } from '../../../test/matchMedia'
import { MEDIA_QUERIES } from '../../responsive/breakpoints'
import type { ResponsiveDataListColumn } from './ResponsiveDataList'
import { ResponsiveDataList } from './ResponsiveDataList'

interface ExamRow {
  id: string
  date: string
  type: string
  status: string
}

const rows: ExamRow[] = [
  { id: '1', date: '01/09/2026', type: 'Hemograma', status: 'Disponível' },
  { id: '2', date: '15/08/2026', type: 'Raio-X', status: 'Em processamento' },
]

const columns: ResponsiveDataListColumn<ExamRow>[] = [
  { key: 'date', header: 'Data', render: (row) => row.date, isCardTitle: true },
  { key: 'type', header: 'Tipo', render: (row) => row.type },
  { key: 'status', header: 'Status', render: (row) => row.status },
]

function renderAt(breakpoint: 'mobile' | 'tablet' | 'desktop', dataRows: ExamRow[] = rows) {
  installMatchMediaMock({
    [MEDIA_QUERIES.desktop]: breakpoint === 'desktop',
    [MEDIA_QUERIES.tabletUp]: breakpoint !== 'mobile',
  })

  return render(
    <ResponsiveDataList
      caption="Lista de exames"
      columns={columns}
      rows={dataRows}
      getRowKey={(row) => row.id}
      emptyState={<p>Você ainda não tem exames disponíveis no portal.</p>}
    />,
  )
}

describe('ResponsiveDataList (UX-SPEC.md §6.2)', () => {
  it('renderiza uma <table> semântica com <th scope="col"> em desktop', () => {
    renderAt('desktop')

    const table = screen.getByRole('table', { name: 'Lista de exames' })
    const headers = within(table).getAllByRole('columnheader')
    expect(headers.map((header) => header.textContent)).toEqual(['Data', 'Tipo', 'Status'])
    headers.forEach((header) => expect(header).toHaveAttribute('scope', 'col'))
  })

  it('em desktop, cada linha de dado expõe as células corretas na ordem das colunas', () => {
    renderAt('desktop')

    const table = screen.getByRole('table', { name: 'Lista de exames' })
    const dataRows = within(table).getAllByRole('row').slice(1) // exclui a linha de cabeçalho
    expect(dataRows).toHaveLength(2)
    expect(within(dataRows[0]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      '01/09/2026',
      'Hemograma',
      'Disponível',
    ])
  })

  it('renderiza a mesma <table> em tablet — o colapso para card só ocorre em mobile', () => {
    renderAt('tablet')

    expect(screen.getByRole('table', { name: 'Lista de exames' })).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('colapsa para lista de cards em mobile, nunca renderiza <table>', () => {
    renderAt('mobile')

    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    const list = screen.getByRole('list', { name: 'Lista de exames' })
    const cards = within(list).getAllByRole('listitem')
    expect(cards).toHaveLength(2)
  })

  it('em mobile, a coluna isCardTitle vira o título do card, fora dos pares rótulo/valor (dt/dd)', () => {
    renderAt('mobile')

    const [firstCard] = screen.getAllByRole('listitem')
    expect(within(firstCard).getByText('01/09/2026')).toBeInTheDocument()
    // "Data" (rótulo da coluna-título) não deve aparecer de novo como <dt>.
    expect(within(firstCard).queryByText('Data')).not.toBeInTheDocument()
    expect(within(firstCard).getByText('Tipo')).toBeInTheDocument()
    expect(within(firstCard).getByText('Hemograma')).toBeInTheDocument()
    expect(within(firstCard).getByText('Status')).toBeInTheDocument()
    expect(within(firstCard).getByText('Disponível')).toBeInTheDocument()
  })

  it('em mobile, sem nenhuma coluna isCardTitle, todas as colunas viram pares dt/dd (nenhum título de destaque)', () => {
    const columnsWithoutTitle: ResponsiveDataListColumn<ExamRow>[] = columns.map((column) => ({
      ...column,
      isCardTitle: false,
    }))
    installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: false,
      [MEDIA_QUERIES.tabletUp]: false,
    })

    render(
      <ResponsiveDataList
        caption="Lista de exames"
        columns={columnsWithoutTitle}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyState={<p>Vazio</p>}
      />,
    )

    const [firstCard] = screen.getAllByRole('listitem')
    expect(firstCard.querySelector('p')).toBeNull()
    const labels = Array.from(firstCard.querySelectorAll('dt')).map((el) => el.textContent)
    expect(labels).toEqual(['Data', 'Tipo', 'Status'])
  })

  it('em mobile, cada campo do card expõe rótulo (dt) e valor (dd) associados semanticamente', () => {
    renderAt('mobile')

    const [firstCard] = screen.getAllByRole('listitem')
    const definitionList = firstCard.querySelector('dl')
    expect(definitionList).not.toBeNull()

    const labels = Array.from(definitionList!.querySelectorAll('dt')).map((el) => el.textContent)
    const values = Array.from(definitionList!.querySelectorAll('dd')).map((el) => el.textContent)
    expect(labels).toEqual(['Tipo', 'Status'])
    expect(values).toEqual(['Hemograma', 'Disponível'])
  })

  it('renderiza o estado vazio informado (nem tabela, nem lista) quando rows está vazio', () => {
    renderAt('desktop', [])

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(
      screen.getByText('Você ainda não tem exames disponíveis no portal.'),
    ).toBeInTheDocument()
  })

  it('estado vazio também se aplica em mobile, sem renderizar a lista de cards', () => {
    renderAt('mobile', [])

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(
      screen.getByText('Você ainda não tem exames disponíveis no portal.'),
    ).toBeInTheDocument()
  })

  it('sem emptyState informado e rows vazio, não renderiza nada (nem crasha)', () => {
    installMatchMediaMock({
      [MEDIA_QUERIES.desktop]: true,
      [MEDIA_QUERIES.tabletUp]: true,
    })

    const { container } = render(
      <ResponsiveDataList
        caption="Lista de exames"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
