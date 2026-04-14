import { useState, useEffect } from 'react'
import { RefreshCw, Info } from 'lucide-react'

function ChangeCell({ value }) {
  if (value == null) return <span className="text-gray-600">—</span>
  const color = value > 0.01 ? 'text-emerald-400' : value < -0.01 ? 'text-red-400' : 'text-gray-500'
  const sign = value > 0 ? '+' : ''
  return <span className={`tabular-nums font-medium ${color}`}>{sign}{value}%</span>
}

function RangeBar({ price, low52, high52 }) {
  if (price == null || low52 == null || high52 == null || high52 === low52) return null
  const pct = Math.min(100, Math.max(0, ((price - low52) / (high52 - low52)) * 100))
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-700 text-xs tabular-nums w-10 text-right">{low52.toFixed(2)}</span>
      <div className="relative w-20 h-1.5 bg-gray-800 rounded-full">
        <div className="absolute top-0 left-0 h-full bg-blue-500/60 rounded-full" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" style={{ left: `calc(${pct}% - 3px)` }} />
      </div>
      <span className="text-gray-700 text-xs tabular-nums w-10">{high52.toFixed(2)}</span>
    </div>
  )
}

function YieldTable({ rows, isYield }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-800 text-left text-xs text-gray-600 uppercase tracking-wider">
          <th className="px-4 py-2.5">Instrument</th>
          <th className="px-4 py-2.5">{isYield ? 'Yield' : 'Price'}</th>
          <th className="px-4 py-2.5">1D Change</th>
          <th className="px-4 py-2.5">1W Change</th>
          <th className="px-4 py-2.5">52-Week Range</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item, i) => (
          <tr
            key={item.ticker}
            className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${i % 2 !== 0 ? 'bg-gray-950/40' : ''}`}
          >
            <td className="px-4 py-3">
              <div className="font-medium text-gray-200">{item.name}</div>
              <div className="text-xs text-gray-600">{item.ticker}</div>
            </td>
            <td className="px-4 py-3 tabular-nums font-bold text-white text-base">
              {item.price != null
                ? isYield ? `${item.price.toFixed(2)}%` : `$${item.price.toFixed(2)}`
                : <span className="text-gray-600 font-normal text-sm">—</span>}
            </td>
            <td className="px-4 py-3"><ChangeCell value={item.change1d} /></td>
            <td className="px-4 py-3"><ChangeCell value={item.change1w} /></td>
            <td className="px-4 py-3">
              <RangeBar price={item.price} low52={item.low52} high52={item.high52} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Simple yield curve sparkline for US treasuries
function YieldCurve({ rows }) {
  const points = rows.filter(r => r.price != null)
  if (points.length < 2) return null

  const yields = points.map(r => r.price)
  const min = Math.min(...yields)
  const max = Math.max(...yields)
  const range = max - min || 0.01

  const W = 260, H = 60, PAD = 8
  const pts = points.map((r, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((r.price - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  const isInverted = yields[0] > yields[yields.length - 1]

  return (
    <div className="flex items-end gap-6 mb-5">
      <div>
        <div className="text-xs text-gray-600 mb-1.5">US Treasury Yield Curve</div>
        <svg width={W} height={H} className="overflow-visible">
          <polyline
            points={pts.join(' ')}
            fill="none"
            stroke={isInverted ? '#f87171' : '#60a5fa'}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {points.map((r, i) => {
            const [x, y] = pts[i].split(',').map(Number)
            return (
              <g key={r.ticker}>
                <circle cx={x} cy={y} r={3} fill={isInverted ? '#f87171' : '#60a5fa'} />
                <text x={x} y={H - 0} textAnchor="middle" fontSize="9" fill="#4b5563">{r.maturity}</text>
              </g>
            )
          })}
        </svg>
      </div>
      {isInverted && (
        <div className="text-xs text-red-400/80 border border-red-500/20 bg-red-500/5 rounded px-3 py-2 max-w-[200px]">
          <strong className="block mb-0.5">Yield Curve Inverted</strong>
          Short-term yields exceed long-term — historically a recession signal.
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 px-1">{title}</h3>
      <div className="border border-gray-800 rounded overflow-hidden bg-gray-950/30">
        {children}
      </div>
    </div>
  )
}

export default function BondsTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/bonds.json')
        if (!res.ok) throw new Error('Bonds data not found')
        setData(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-gray-600">
        <RefreshCw size={14} className="animate-spin" /> Loading bond data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center text-gray-600 text-sm">
        <p className="text-red-400 mb-1">Could not load bond data.</p>
        <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_market_data.py</code> to generate it.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Disclaimer */}
      <div className="flex gap-2 items-start bg-yellow-500/5 border border-yellow-500/20 rounded p-3 mb-6 text-xs text-yellow-200/60">
        <Info size={13} className="mt-0.5 shrink-0 text-yellow-500/50" />
        <span>
          <strong className="text-yellow-400/80">Research only.</strong> US Treasury yields sourced from Yahoo Finance (^IRX, ^FVX, ^TNX, ^TYX).
          International yields via Reuters tickers. Corporate rows are ETF NAV prices, not direct yield quotes. Not financial advice.
        </span>
      </div>

      {/* US Yield Curve */}
      {data.us?.length > 0 && (
        <div className="mb-1">
          <YieldCurve rows={data.us} />
        </div>
      )}

      <Section title="US Treasury Yields">
        <YieldTable rows={data.us || []} isYield={true} />
      </Section>

      <Section title="International Bond ETFs (NAV Price)">
        <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-800">
          Yahoo Finance doesn't provide direct foreign govt yield quotes — these ETFs track developed-market and EM government bonds globally.
        </div>
        <YieldTable rows={data.international || []} isYield={false} />
      </Section>

      <Section title="US Credit ETFs (NAV Price)">
        <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-800">
          Investment grade and high yield corporate bond ETFs — track direction of US credit spreads.
        </div>
        <YieldTable rows={data.corporate || []} isYield={false} />
      </Section>

      {data.asOf && (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-2">
          <RefreshCw size={10} /> Data as of {data.asOf}
        </div>
      )}
    </div>
  )
}
