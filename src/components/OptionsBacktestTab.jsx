import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Info, ChevronLeft, ChevronRight } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v, decimals = 1) {
  if (v == null) return '—'
  return (v > 0 ? '+' : '') + v.toFixed(decimals) + '%'
}

function ReturnPill({ value }) {
  if (value == null) return <span className="text-gray-600">—</span>
  const color = value >= 0 ? 'text-emerald-400' : 'text-red-400'
  return <span className={`tabular-nums font-medium ${color}`}>{fmt(value)}</span>
}

function StatCard({ label, value, sub, accent = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4">
      <div className="text-xs text-gray-600 mb-1 leading-tight">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${accent}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Cumulative P&L chart ──────────────────────────────────────────────────────

function CumulativeChart({ cumulative, color }) {
  if (!cumulative?.length) return null

  const W = 600, H = 200
  const PAD = { top: 16, right: 20, bottom: 36, left: 56 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const vals  = cumulative.map(p => p.cumReturn)
  const rawMin = Math.min(0, ...vals)
  const rawMax = Math.max(0, ...vals)
  const yPad  = Math.max(5, (rawMax - rawMin) * 0.08)
  const yMin  = Math.floor((rawMin - yPad) / 50) * 50
  const yMax  = Math.ceil((rawMax + yPad) / 50) * 50
  const yRange = yMax - yMin || 1
  const n = cumulative.length

  const xS = i => PAD.left + (i / (n - 1)) * plotW
  const yS = v => PAD.top + (1 - (v - yMin) / yRange) * plotH

  // Build SVG path
  const pts = cumulative.map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(p.cumReturn).toFixed(1)}`)
  const linePath = pts.join(' ')

  // Area fill path (close back to baseline)
  const zero = yS(0)
  const areaPath = `${linePath} L${xS(n - 1).toFixed(1)},${zero} L${xS(0).toFixed(1)},${zero} Z`

  // Y ticks
  const step = (yMax - yMin) <= 200 ? 50 : 100
  const yTicks = []
  for (let y = Math.ceil(yMin / step) * step; y <= yMax; y += step) yTicks.push(y)

  // X tick labels (first date, mid, last)
  const xLabels = [0, Math.floor(n / 2), n - 1].map(i => ({
    i,
    label: cumulative[i].date.slice(2, 10).replace(/-/g, '/'),
  }))

  return (
    <svg width={W} height={H} className="overflow-visible w-full max-w-[600px]">
      <defs>
        <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid + Y labels */}
      {yTicks.map(y => (
        <g key={y}>
          <line x1={PAD.left} x2={PAD.left + plotW} y1={yS(y)} y2={yS(y)}
            stroke="#1f2937" strokeWidth={y === 0 ? 0 : 1} />
          <text x={PAD.left - 6} y={yS(y)} textAnchor="end" dominantBaseline="middle"
            fontSize="9" fill="#4b5563">{y}%</text>
        </g>
      ))}

      {/* Zero baseline */}
      <line x1={PAD.left} x2={PAD.left + plotW} y1={yS(0)} y2={yS(0)}
        stroke="#374151" strokeWidth="1.5" strokeDasharray="4,3" />

      {/* Area fill */}
      <path d={areaPath} fill={`url(#areaGrad-${color.replace('#', '')})`} />

      {/* Line */}
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />

      {/* X labels */}
      {xLabels.map(({ i, label }) => (
        <text key={i} x={xS(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#4b5563">
          {label}
        </text>
      ))}

      {/* Axes */}
      <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH}
        stroke="#374151" strokeWidth="1" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH}
        stroke="#374151" strokeWidth="1" />

      {/* Y axis label */}
      <text x={12} y={PAD.top + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280"
        transform={`rotate(-90,12,${PAD.top + plotH / 2})`}>Cumulative Return %</text>
    </svg>
  )
}

// ── Trades table ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

function TradesTable({ trades }) {
  const [page, setPage] = useState(0)
  const [sort, setSort]     = useState({ key: 'entryDate', dir: -1 })

  const sorted = useMemo(() => {
    return [...trades].sort((a, b) => {
      const av = a[sort.key], bv = b[sort.key]
      return typeof av === 'string'
        ? sort.dir * av.localeCompare(bv)
        : sort.dir * (av - bv)
    })
  }, [trades, sort])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageRows   = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key) {
    setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }))
    setPage(0)
  }

  const cols = [
    { key: 'symbol',      label: 'Ticker' },
    { key: 'entryDate',   label: 'Entry Date' },
    { key: 'entryPrice',  label: 'Entry Price' },
    { key: 'strike',      label: 'Strike' },
    { key: 'expiryDate',  label: 'Expiry' },
    { key: 'expiryPrice', label: 'Expiry Price' },
    { key: 'premium',     label: 'Est. Premium' },
    { key: 'rsiAtEntry',  label: 'RSI' },
    { key: 'volAtEntry',  label: 'HV21' },
    { key: 'valueScore',  label: 'Score' },
    { key: 'returnPct',   label: 'Return %' },
    { key: 'outcome',     label: 'Result' },
  ]

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wider">
              {cols.map(c => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="px-3 py-2.5 text-left cursor-pointer select-none hover:text-gray-300 whitespace-nowrap"
                >
                  {c.label}
                  {sort.key === c.key && (sort.dir === -1 ? ' ↓' : ' ↑')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((t, i) => (
              <tr
                key={`${t.symbol}-${t.entryDate}-${i}`}
                className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${i % 2 !== 0 ? 'bg-gray-950/40' : ''}`}
              >
                <td className="px-3 py-2.5 font-bold text-white">{t.symbol}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-400 text-xs">{t.entryDate}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-300">${t.entryPrice.toFixed(2)}</td>
                <td className="px-3 py-2.5 tabular-nums text-white font-medium">${t.strike.toFixed(2)}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-400 text-xs">{t.expiryDate}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-300">${t.expiryPrice.toFixed(2)}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-500">${t.premium.toFixed(2)}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-400">{t.rsiAtEntry}</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-400">{t.volAtEntry}%</td>
                <td className="px-3 py-2.5 tabular-nums text-gray-400">{t.valueScore}</td>
                <td className="px-3 py-2.5"><ReturnPill value={t.returnPct} /></td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs font-medium ${t.outcome === 'WIN' ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.outcome}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
        <span>{trades.length.toLocaleString()} trades total</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-1 rounded hover:bg-gray-800 disabled:opacity-30"
          >
            <ChevronLeft size={14} />
          </button>
          <span>Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-1 rounded hover:bg-gray-800 disabled:opacity-30"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Strategy view ─────────────────────────────────────────────────────────────

function StrategyView({ data }) {
  const { stats, trades, cumulative, color } = data

  const winRateColor = stats.winRate >= 55 ? 'text-emerald-400'
    : stats.winRate >= 45 ? 'text-yellow-400'
    : 'text-red-400'

  const pfColor = !stats.profitFactor ? 'text-gray-500'
    : stats.profitFactor >= 1.5 ? 'text-emerald-400'
    : stats.profitFactor >= 1.0 ? 'text-yellow-400'
    : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard label="Total Trades"   value={stats.totalTrades} />
        <StatCard label="Win Rate"       value={`${stats.winRate}%`} accent={winRateColor} sub={`${stats.winners}W / ${stats.losers}L`} />
        <StatCard label="Avg Return"     value={fmt(stats.avgReturn)}    accent={stats.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'} />
        <StatCard label="Avg Win"        value={fmt(stats.avgWin)}       accent="text-emerald-400" />
        <StatCard label="Avg Loss"       value={fmt(stats.avgLoss)}      accent="text-red-400" />
        <StatCard label="Best Trade"     value={fmt(stats.bestTrade)}    accent="text-emerald-400" />
        <StatCard label="Worst Trade"    value={fmt(stats.worstTrade)}   accent="text-red-400" />
        <StatCard label="Profit Factor"  value={stats.profitFactor ?? '—'} accent={pfColor}
          sub="gross wins / gross losses" />
      </div>

      {/* Cumulative chart */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          Cumulative Return (sum of all trade returns)
        </div>
        <div className="border border-gray-800 rounded p-4 bg-gray-950/30 overflow-x-auto">
          <CumulativeChart cumulative={cumulative} color={color} />
        </div>
      </div>

      {/* Trades */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          All Trades
        </div>
        <div className="border border-gray-800 rounded overflow-hidden bg-gray-950/30">
          <TradesTable trades={trades} />
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function OptionsBacktestTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [strategy, setStrategy] = useState('buy_call')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/backtest_options.json')
        if (!res.ok) throw new Error('Backtest data not found')
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
        <RefreshCw size={14} className="animate-spin" /> Running backtest...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center text-gray-600 text-sm">
        <p className="text-red-400 mb-1">Backtest data not found.</p>
        <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/run_backtest.py</code> to generate it.</p>
      </div>
    )
  }

  const strategies = data.strategies || {}
  const stratKeys  = Object.keys(strategies)

  return (
    <div>
      {/* Disclaimer */}
      <div className="flex gap-2 items-start bg-yellow-500/5 border border-yellow-500/20 rounded p-3 mb-6 text-xs text-yellow-200/60">
        <Info size={13} className="mt-0.5 shrink-0 text-yellow-500/50" />
        <div className="space-y-0.5">
          <strong className="text-yellow-400/80 block">Simulated backtest — not real trading results.</strong>
          {data.caveats?.map((c, i) => <div key={i}>{c}</div>)}
        </div>
      </div>

      {/* Strategy selector */}
      <div className="flex gap-1 mb-6">
        {stratKeys.map(key => {
          const s = strategies[key]
          const active = strategy === key
          return (
            <button
              key={key}
              onClick={() => setStrategy(key)}
              style={active ? { borderColor: s.color + '80', color: s.color } : {}}
              className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                active
                  ? 'bg-gray-900'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {s.label}
              {s.stats.totalTrades > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({s.stats.totalTrades})</span>
              )}
            </button>
          )
        })}
      </div>

      {strategies[strategy] && (
        <StrategyView data={strategies[strategy]} />
      )}

      {data.generatedAt && (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-6">
          <RefreshCw size={10} /> Generated {data.generatedAt.slice(0, 10)}
        </div>
      )}
    </div>
  )
}
