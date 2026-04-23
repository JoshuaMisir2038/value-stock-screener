import { X } from 'lucide-react'

// Terminal colors per stock slot
const STOCK_COLORS = [
  { text: 'text-orange-400',  border: 'border-orange-500',  bg: 'bg-orange-500',  hex: '#FF6600' },
  { text: 'text-cyan-400',    border: 'border-cyan-500',    bg: 'bg-cyan-500',    hex: '#00CCFF' },
  { text: 'text-yellow-400',  border: 'border-yellow-400',  bg: 'bg-yellow-400',  hex: '#FFD700' },
  { text: 'text-purple-400',  border: 'border-purple-500',  bg: 'bg-purple-500',  hex: '#CC44FF' },
]

function fmt(v, format) {
  if (v == null || v === '' || isNaN(v)) return '—'
  if (format === 'percent') return `${(v * 100).toFixed(1)}%`
  if (format === 'x')       return `${Number(v).toFixed(1)}x`
  if (format === 'price')   return `$${Number(v).toFixed(2)}`
  if (format === 'marketcap') {
    if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
    if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
    if (v >= 1e6)  return `$${(v / 1e6).toFixed(0)}M`
    return `$${v}`
  }
  if (format === 'score') return Number(v).toFixed(0)
  return Number(v).toFixed(1)
}

const SECTIONS = [
  {
    label: 'VALUATION',
    rows: [
      { label: 'Price',      key: 'price',      format: 'price' },
      { label: 'Mkt Cap',    key: 'marketCap',  format: 'marketcap' },
      { label: 'P/E (TTM)',  key: 'peRatio',    format: 'x' },
      { label: 'Fwd P/E',   key: 'forwardPE',  format: 'x' },
      { label: 'P/FCF',     key: 'pFcf',       format: 'x' },
      { label: 'P/B',       key: 'pbRatio',    format: 'x' },
      { label: 'P/S',       key: 'psRatio',    format: 'x' },
      { label: 'EV/EBITDA', key: 'evEbitda',   format: 'x' },
      { label: 'EV/Rev',    key: 'evRevenue',  format: 'x' },
    ],
  },
  {
    label: 'MARGINS',
    rows: [
      { label: 'Gross Margin',   key: 'grossMargin',     format: 'percent' },
      { label: 'Op Margin',      key: 'operatingMargin', format: 'percent' },
      { label: 'FCF Margin',     key: 'fcfMargin',       format: 'percent' },
    ],
  },
  {
    label: 'GROWTH',
    rows: [
      { label: 'Rev Growth',  key: 'revenueGrowth',  format: 'percent' },
      { label: 'EPS Growth',  key: 'earningsGrowth', format: 'percent' },
      { label: 'Rule of 40',  key: 'ruleOf40',       format: null },
    ],
  },
  {
    label: 'QUALITY / SAFETY',
    rows: [
      { label: 'ROE',         key: 'roe',          format: 'percent' },
      { label: 'D/E Ratio',   key: 'debtEquity',   format: 'x' },
      { label: 'Curr Ratio',  key: 'currentRatio', format: 'x' },
      { label: 'ND/EBITDA',   key: 'netDebtEbitda',format: 'x' },
      { label: 'Div Yield',   key: 'dividendYield',format: 'percent' },
    ],
  },
  {
    label: 'TECHNICAL',
    rows: [
      { label: 'RSI',          key: 'rsi',       format: null },
      { label: 'vs 200MA',     key: '_200ma',    format: null, custom: true },
    ],
  },
  {
    label: 'SCORES',
    rows: [
      { label: 'Value Score',  key: 'valueScore',  format: 'score' },
      { label: 'Sector Score', key: 'sectorScore', format: 'score' },
    ],
  },
]

const RETURN_PERIODS = [
  { label: '1M',  key: 'return1m' },
  { label: '3M',  key: 'return3m' },
  { label: '6M',  key: 'return6m' },
  { label: '1Y',  key: 'return1y' },
  { label: '2Y',  key: 'return2y' },
  { label: '3Y',  key: 'return3y' },
  { label: '5Y',  key: 'return5y' },
]

function getCellValue(stock, row) {
  if (row.custom && row.key === '_200ma') {
    if (!stock.ma200 || !stock.price) return null
    const pct = ((stock.price - stock.ma200) / stock.ma200 * 100).toFixed(1)
    return { raw: parseFloat(pct), display: `${stock.aboveMa200 ? '▲' : '▼'} ${Math.abs(pct)}%`, isUp: stock.aboveMa200 }
  }
  return { raw: stock[row.key], display: null }
}

function ReturnChart({ stocks }) {
  const BAR_H = 120
  const BAR_W = 28
  const GAP = 6
  const PERIOD_GAP = 18
  const n = stocks.length

  return (
    <div className="mt-1 overflow-x-auto">
      <div className="flex gap-6">
        {RETURN_PERIODS.map(period => {
          const vals = stocks.map(s => {
            const v = s[period.key]
            return v != null ? v * 100 : null
          })
          const defined = vals.filter(v => v != null)
          const maxAbs = defined.length ? Math.max(Math.abs(Math.min(...defined)), Math.abs(Math.max(...defined)), 1) : 1

          return (
            <div key={period.key} className="flex flex-col items-center gap-1" style={{ minWidth: n * (BAR_W + GAP) - GAP }}>
              <div className="flex items-end gap-[6px]" style={{ height: BAR_H * 2 + 2 }}>
                {stocks.map((s, idx) => {
                  const v = vals[idx]
                  const color = STOCK_COLORS[idx]
                  if (v == null) {
                    return <div key={s.symbol} style={{ width: BAR_W }} className="text-center text-gray-700 text-[9px] self-center">—</div>
                  }
                  const barH = Math.max(2, (Math.abs(v) / maxAbs) * BAR_H)
                  const isPos = v >= 0
                  return (
                    <div key={s.symbol} className="flex flex-col items-center" style={{ width: BAR_W }}>
                      {/* top half (positive) */}
                      <div style={{ height: BAR_H }} className="flex flex-col justify-end">
                        {isPos && (
                          <div
                            style={{ height: barH, backgroundColor: color.hex, width: BAR_W }}
                            className="opacity-90"
                            title={`${s.symbol}: ${v.toFixed(1)}%`}
                          />
                        )}
                      </div>
                      <div style={{ height: 2 }} className="bg-gray-700 w-full" />
                      {/* bottom half (negative) */}
                      <div style={{ height: BAR_H }} className="flex flex-col justify-start">
                        {!isPos && (
                          <div
                            style={{ height: barH, backgroundColor: color.hex, width: BAR_W }}
                            className="opacity-70"
                            title={`${s.symbol}: ${v.toFixed(1)}%`}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <span className="text-[10px] text-gray-500 tracking-wider">{period.label}</span>
              {/* values */}
              <div className="flex gap-[6px]">
                {stocks.map((s, idx) => {
                  const v = vals[idx]
                  const color = STOCK_COLORS[idx]
                  return (
                    <div key={s.symbol} style={{ width: BAR_W }} className={`text-[9px] text-center tabular-nums ${color.text} ${v == null ? 'text-gray-700' : ''}`}>
                      {v != null ? `${v > 0 ? '+' : ''}${v.toFixed(0)}%` : '—'}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CompareModal({ stocks, onClose }) {
  if (!stocks || stocks.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 overflow-y-auto py-8 px-4">
      <div className="w-full max-w-5xl bg-gray-900 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 bg-gray-950">
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">COMPARE</span>
            <div className="flex items-center gap-2">
              {stocks.map((s, idx) => (
                <span key={s.symbol} className={`text-xs font-bold tracking-wider px-2 py-0.5 border ${STOCK_COLORS[idx].text} ${STOCK_COLORS[idx].border}`}>
                  {s.symbol}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Metric sections */}
          {SECTIONS.map(section => (
            <div key={section.label}>
              <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2 border-b border-gray-800 pb-1">
                {section.label}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-gray-600 font-normal py-1 pr-4 w-32">METRIC</th>
                    {stocks.map((s, idx) => (
                      <th key={s.symbol} className={`text-right font-bold tracking-wider py-1 px-3 ${STOCK_COLORS[idx].text}`}>
                        {s.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.rows.map(row => {
                    const cellVals = stocks.map(s => getCellValue(s, row))
                    // Find best raw value for highlighting (simple: max for most)
                    return (
                      <tr key={row.key} className="border-t border-gray-900/60 hover:bg-gray-800/30">
                        <td className="text-gray-500 py-1.5 pr-4 text-[11px] uppercase tracking-wide">{row.label}</td>
                        {cellVals.map((cell, idx) => {
                          const s = stocks[idx]
                          const color = STOCK_COLORS[idx]
                          if (row.custom && row.key === '_200ma') {
                            if (!cell || cell.raw == null) return <td key={s.symbol} className="text-right text-gray-600 py-1.5 px-3">—</td>
                            return (
                              <td key={s.symbol} className={`text-right py-1.5 px-3 tabular-nums ${cell.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                {cell.display}
                              </td>
                            )
                          }
                          const raw = cell?.raw
                          const display = fmt(raw, row.format)
                          const isNull = display === '—'
                          return (
                            <td key={s.symbol} className={`text-right py-1.5 px-3 tabular-nums ${isNull ? 'text-gray-600' : color.text}`}>
                              {display}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {/* Returns chart */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3 border-b border-gray-800 pb-1">
              RETURNS (%)
            </div>
            {/* Legend */}
            <div className="flex gap-4 mb-3">
              {stocks.map((s, idx) => (
                <div key={s.symbol} className="flex items-center gap-1.5">
                  <div style={{ width: 10, height: 10, backgroundColor: STOCK_COLORS[idx].hex }} />
                  <span className={`text-[11px] font-bold ${STOCK_COLORS[idx].text}`}>{s.symbol}</span>
                  <span className="text-gray-600 text-[11px]">{s.name?.split(' ').slice(0, 2).join(' ')}</span>
                </div>
              ))}
            </div>
            <ReturnChart stocks={stocks} />
          </div>
        </div>
      </div>
    </div>
  )
}
