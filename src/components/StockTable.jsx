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

// Column groups for the sticky sub-header
const GROUPS = [
  { label: '',            span: 6, border: false },
  { label: 'VALUATION',  span: 7, border: true },
  { label: 'MARGINS',    span: 3, border: true },
  { label: 'GROWTH',     span: 3, border: true },
  { label: 'SAFETY',     span: 3, border: true },
  { label: 'INCOME',     span: 1, border: true },
  { label: 'TECHNICAL',  span: 2, border: true },
  { label: 'ANNUAL EPS', span: 3, border: true },
]

const COLUMNS = [
  // Identity
  col.accessor('valueScore',      { header: 'Mkt Score',    cell: i => <ScoreBadge score={i.getValue()} />,                                          size: 85 }),
  col.accessor('sectorScore',     { header: 'Sec Score',    cell: i => <ScoreBadge score={i.getValue()} />,                                          size: 82 }),
  col.accessor('symbol',          { header: 'Ticker',       cell: i => <span className="font-bold text-white tracking-wide">{i.getValue()}</span>,   size: 75 }),
  col.accessor('name',            { header: 'Company',      cell: i => <span className="text-gray-300 truncate block max-w-[180px]" title={i.getValue()}>{i.getValue()}</span>, size: 190 }),
  col.accessor('sector',          { header: 'Sector',       cell: i => <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded-full whitespace-nowrap">{i.getValue()}</span>, size: 140 }),
  col.accessor('marketCap',       { header: 'Mkt Cap',      cell: i => <MetricCell value={i.getValue()} format="marketcap" />,                       size: 88 }),
  // Valuation
  col.accessor('price',           { header: 'Price',        cell: i => { const v = i.getValue(); return v ? <span className="tabular-nums">${v.toFixed(2)}</span> : <span className="text-gray-600">—</span> }, size: 75 }),
  col.accessor('evEbitda',        { header: 'EV/EBITDA',    cell: i => <MetricCell value={i.getValue()} />,                                          size: 93 }),
  col.accessor('peRatio',         { header: 'P/E (TTM)',    cell: i => <MetricCell value={i.getValue()} />,                                          size: 80 }),
  col.accessor('forwardPE',       { header: 'Fwd P/E',      cell: i => <MetricCell value={i.getValue()} />,                                          size: 75 }),
  col.accessor('pFcf',            { header: 'P/FCF',        cell: i => <MetricCell value={i.getValue()} />,                                          size: 70 }),
  col.accessor('psRatio',         { header: 'P/S',          cell: i => <MetricCell value={i.getValue()} />,                                          size: 65 }),
  col.accessor('pbRatio',         { header: 'P/B',          cell: i => <MetricCell value={i.getValue()} />,                                          size: 65 }),
  col.accessor('evRevenue',       { header: 'EV/Rev',       cell: i => <MetricCell value={i.getValue()} />,                                          size: 70 }),
  // Margins
  col.accessor('grossMargin',     { header: 'Gross Mgn',    cell: i => <MetricCell value={i.getValue()} format="percent" />,                         size: 85 }),
  col.accessor('operatingMargin', { header: 'Op Mgn',       cell: i => <MetricCell value={i.getValue()} format="percent" signed />,                  size: 75 }),
  col.accessor('fcfMargin',       { header: 'FCF Mgn',      cell: i => <MetricCell value={i.getValue()} format="percent" signed />,                  size: 75 }),
  // Growth
  col.accessor('revenueGrowth',   { header: 'Rev Growth',   cell: i => <MetricCell value={i.getValue()} format="percent" signed />,                  size: 90 }),
  col.accessor('earningsGrowth',  { header: 'EPS Growth',   cell: i => <MetricCell value={i.getValue()} format="percent" signed />,                  size: 90 }),
  col.accessor('ruleOf40',        { header: 'Rule of 40',   cell: i => { const v = i.getValue(); if (v == null) return <span className="text-gray-600">—</span>; const c = v >= 40 ? 'text-emerald-400' : v >= 20 ? 'text-yellow-400' : 'text-red-400'; return <span className={`tabular-nums font-medium ${c}`}>{v}</span> }, size: 90 }),
  // Safety
  col.accessor('debtEquity',      { header: 'D/E',          cell: i => <MetricCell value={i.getValue()} />,                                          size: 65 }),
  col.accessor('currentRatio',    { header: 'Curr Ratio',   cell: i => <MetricCell value={i.getValue()} />,                                          size: 88 }),
  col.accessor('netDebtEbitda',   { header: 'ND/EBITDA',    cell: i => { const v = i.getValue(); if (v == null) return <span className="text-gray-600">—</span>; const c = v < 0 ? 'text-emerald-400' : v < 2 ? 'text-gray-300' : v < 4 ? 'text-yellow-400' : 'text-red-400'; return <span className={`tabular-nums ${c}`}>{v}x</span> }, size: 90 }),
  // Income
  col.accessor('dividendYield',   { header: 'Div Yield',    cell: i => <MetricCell value={i.getValue()} format="percent" />,                         size: 80 }),
  // Annual EPS
  col.accessor('epsY1', {
    header: ({ table }) => {
      const yr = table.getRowModel().rows[0]?.original?.epsY1Year
      return yr ? `EPS '${yr.slice(2)}` : 'EPS Y1'
    },
    cell: i => {
      const v = i.getValue()
      if (v == null) return <span className="text-gray-600">—</span>
      const color = v > 0 ? 'text-emerald-400' : 'text-red-400'
      return <span className={`tabular-nums font-medium ${color}`}>${v.toFixed(2)}</span>
    },
    size: 80,
  }),
  col.accessor('epsY2', {
    header: ({ table }) => {
      const yr = table.getRowModel().rows[0]?.original?.epsY2Year
      return yr ? `EPS '${yr.slice(2)}` : 'EPS Y2'
    },
    cell: i => {
      const v = i.getValue()
      if (v == null) return <span className="text-gray-600">—</span>
      const color = v > 0 ? 'text-emerald-400' : 'text-red-400'
      return <span className={`tabular-nums font-medium ${color}`}>${v.toFixed(2)}</span>
    },
    size: 80,
  }),
  col.accessor('epsY3', {
    header: ({ table }) => {
      const yr = table.getRowModel().rows[0]?.original?.epsY3Year
      return yr ? `EPS '${yr.slice(2)}` : 'EPS Y3'
    },
    cell: i => {
      const v = i.getValue()
      if (v == null) return <span className="text-gray-600">—</span>
      const color = v > 0 ? 'text-emerald-400' : 'text-red-400'
      return <span className={`tabular-nums font-medium ${color}`}>${v.toFixed(2)}</span>
    },
    size: 80,
  }),
  // Technical
  col.accessor('rsi',             { header: 'RSI',          cell: i => { const v = i.getValue(); if (!v) return <span className="text-gray-600">—</span>; const c = v <= 35 ? 'text-emerald-400' : v <= 55 ? 'text-blue-400' : v <= 65 ? 'text-yellow-400' : 'text-red-400'; return <span className={`tabular-nums ${c}`}>{v}</span> }, size: 55 }),
  col.accessor('aboveMa200',      { header: 'vs 200MA',     cell: i => { const s = i.row.original; if (!s.ma200 || !s.price) return <span className="text-gray-600">—</span>; const pct = ((s.price - s.ma200) / s.ma200 * 100).toFixed(1); const c = s.aboveMa200 ? 'text-emerald-400' : 'text-red-400'; return <span className={`tabular-nums text-xs ${c}`}>{s.aboveMa200 ? '▲' : '▼'} {Math.abs(pct)}%</span> }, size: 80 }),
]

function SortIcon({ isSorted }) {
  if (isSorted === 'asc')  return <ChevronUp   size={11} className="inline ml-1 text-blue-400" />
  if (isSorted === 'desc') return <ChevronDown size={11} className="inline ml-1 text-blue-400" />
  return <ChevronsUpDown size={11} className="inline ml-1 text-gray-700" />
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
          {/* Column group headers */}
          <tr className="border-b border-gray-800/50">
            {GROUPS.map((g, i) => (
              <th
                key={i}
                colSpan={g.span}
                className={`px-3 py-1.5 text-left text-[10px] font-semibold tracking-widest text-gray-600 uppercase ${g.border ? 'border-l border-gray-800' : ''}`}
              >
                {g.label}
              </th>
            ))}
          </tr>
          {/* Column headers */}
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id} className="border-b border-gray-800">
              {headerGroup.headers.map((header, idx) => {
                // Add border-left at group boundaries
                const groupBoundaries = [6, 13, 16, 19, 22, 23, 24, 27]
                const hasBorder = groupBoundaries.includes(idx)
                return (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                    className={`px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-300 whitespace-nowrap ${hasBorder ? 'border-l border-gray-800' : ''}`}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    <SortIcon isSorted={header.column.getIsSorted()} />
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-950/40'}`}
            >
              {row.getVisibleCells().map((cell, idx) => {
                const groupBoundaries = [6, 13, 16, 19, 22, 23, 24, 27]
                const hasBorder = groupBoundaries.includes(idx)
                return (
                  <td key={cell.id} className={`px-3 py-2.5 text-gray-300 ${hasBorder ? 'border-l border-gray-900' : ''}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                )
              })}
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
