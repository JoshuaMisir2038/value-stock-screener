import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import MetricCell from './MetricCell'

const col = createColumnHelper()

const COLUMNS = [
  col.accessor('valueScore', {
    header: 'Score',
    cell: info => <ScoreBadge score={info.getValue()} />,
    size: 70,
  }),
  col.accessor('symbol', {
    header: 'Ticker',
    cell: info => (
      <span className="font-bold text-white tracking-wide">{info.getValue()}</span>
    ),
    size: 80,
  }),
  col.accessor('name', {
    header: 'Company',
    cell: info => (
      <span className="text-gray-300 truncate block max-w-[200px]" title={info.getValue()}>
        {info.getValue()}
      </span>
    ),
    size: 200,
  }),
  col.accessor('sector', {
    header: 'Sector',
    cell: info => (
      <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded-full">
        {info.getValue()}
      </span>
    ),
    size: 140,
  }),
  col.accessor('marketCap', {
    header: 'Mkt Cap',
    cell: info => <MetricCell value={info.getValue()} format="marketcap" />,
    size: 90,
  }),
  col.accessor('price', {
    header: 'Price',
    cell: info => {
      const v = info.getValue()
      return v ? <span className="tabular-nums">${v.toFixed(2)}</span> : <span className="text-gray-600">—</span>
    },
    size: 80,
  }),
  col.accessor('evEbitda', {
    header: 'EV/EBITDA',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 95,
  }),
  col.accessor('peRatio', {
    header: 'P/E',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 70,
  }),
  col.accessor('pFcf', {
    header: 'P/FCF',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 70,
  }),
  col.accessor('psRatio', {
    header: 'P/S',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 70,
  }),
  col.accessor('pbRatio', {
    header: 'P/B',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 70,
  }),
  col.accessor('debtEquity', {
    header: 'D/E',
    cell: info => <MetricCell value={info.getValue()} />,
    size: 70,
  }),
  col.accessor('roe', {
    header: 'ROE',
    cell: info => <MetricCell value={info.getValue()} format="percent" />,
    size: 70,
  }),
  col.accessor('dividendYield', {
    header: 'Div Yield',
    cell: info => <MetricCell value={info.getValue()} format="percent" />,
    size: 80,
  }),
]

function SortIcon({ isSorted }) {
  if (isSorted === 'asc') return <ChevronUp size={12} className="inline ml-1 text-blue-400" />
  if (isSorted === 'desc') return <ChevronDown size={12} className="inline ml-1 text-blue-400" />
  return <ChevronsUpDown size={12} className="inline ml-1 text-gray-600" />
}

export default function StockTable({ data }) {
  const [sorting, setSorting] = useState([{ id: 'valueScore', desc: true }])

  const table = useReactTable({
    data,
    columns: COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-gray-800">
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{ width: header.getSize() }}
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 whitespace-nowrap"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  <SortIcon isSorted={header.column.getIsSorted()} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${
                i % 2 === 0 ? '' : 'bg-gray-950/50'
              }`}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2.5 text-gray-300">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {data.length === 0 && (
        <div className="text-center py-16 text-gray-600">No stocks match your filters.</div>
      )}
    </div>
  )
}
