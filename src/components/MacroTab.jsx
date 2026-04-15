import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

// ── Sparkline ─────────────────────────────────────────────────────────────────

function Sparkline({ history, color, height = 36 }) {
  if (!history?.length || history.length < 2) return null
  const vals = history.map(h => h.value)
  const min  = Math.min(...vals)
  const max  = Math.max(...vals)
  const rng  = max - min || 0.01
  const W = 100, H = height

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / rng) * (H - 2) - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')

  return (
    <svg width={W} height={H} className="overflow-visible opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Color logic ───────────────────────────────────────────────────────────────

function vixColor(v) {
  if (v == null) return 'text-gray-400'
  if (v < 15)  return 'text-emerald-400'
  if (v < 25)  return 'text-yellow-400'
  return 'text-red-400'
}

function vixLabel(v) {
  if (v == null) return ''
  if (v < 15)  return 'Calm'
  if (v < 25)  return 'Moderate'
  if (v < 35)  return 'Elevated'
  return 'Fear'
}

function pcrColor(v) {
  if (v == null) return 'text-gray-400'
  if (v < 0.7)  return 'text-red-400'      // greed / complacency
  if (v <= 1.0) return 'text-emerald-400'  // neutral / healthy fear
  return 'text-yellow-400'                 // high fear
}

function pcrLabel(v) {
  if (v == null) return ''
  if (v < 0.7)  return 'Complacency'
  if (v <= 0.9) return 'Neutral'
  if (v <= 1.2) return 'Cautious'
  return 'Fear'
}

function indicatorColor(key, value, goodLow) {
  if (value == null) return 'text-gray-400'
  const thresholds = {
    FEDFUNDS:    [3, 5],
    CPIAUCSL:    [2, 4],
    CPILFESL:    [2, 4],
    UNRATE:      [4, 6],
    MORTGAGE30US:[5, 7],
    T10Y2Y:      [0, null],   // positive = good, negative = bad
    UMCSENT:     [70, 55],    // higher is better
  }
  const t = thresholds[key]
  if (!t) return 'text-gray-300'

  if (key === 'T10Y2Y') {
    return value >= 0 ? 'text-emerald-400' : value > -0.5 ? 'text-yellow-400' : 'text-red-400'
  }
  if (key === 'UMCSENT') {
    return value >= 70 ? 'text-emerald-400' : value >= 55 ? 'text-yellow-400' : 'text-red-400'
  }
  if (goodLow) {
    return value <= t[0] ? 'text-emerald-400' : value <= t[1] ? 'text-yellow-400' : 'text-red-400'
  }
  return value >= t[0] ? 'text-emerald-400' : value >= t[1] ? 'text-yellow-400' : 'text-red-400'
}

function sparkColor(key, goodLow) {
  const map = {
    FEDFUNDS: '#60a5fa', CPIAUCSL: '#f87171', CPILFESL: '#fb923c',
    UNRATE: '#a78bfa', MORTGAGE30US: '#34d399', T10Y2Y: '#60a5fa', UMCSENT: '#facc15',
  }
  return map[key] || '#6b7280'
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, unit = '', color, sub, change, changeLabel, history, sparkColor: sc, desc }) {
  const [showDesc, setShowDesc] = useState(false)

  const changeColor = change == null ? 'text-gray-600'
    : change > 0 ? 'text-red-400' : change < 0 ? 'text-emerald-400' : 'text-gray-500'

  return (
    <div
      className="bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors cursor-default"
      title={desc}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-600 leading-tight pr-2">{label}</div>
        {history?.length > 1 && <Sparkline history={history} color={sc} height={28} />}
      </div>

      <div className={`text-2xl font-bold tabular-nums ${color}`}>
        {value != null ? `${value}${unit}` : '—'}
      </div>

      <div className="flex items-center justify-between mt-1.5">
        {sub && <div className="text-xs font-medium text-gray-500">{sub}</div>}
        {change != null && (
          <div className={`text-xs tabular-nums ${changeColor} ml-auto`}>
            {change > 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}{unit} {changeLabel}
          </div>
        )}
      </div>
    </div>
  )
}

// ── VIX card ──────────────────────────────────────────────────────────────────

function VixCard({ vix }) {
  if (!vix) return null
  const color = vixColor(vix.current)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-600">VIX — Market Volatility Index</div>
        <Sparkline history={vix.history} color="#f87171" height={28} />
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{vix.current}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs font-medium ${color}`}>{vixLabel(vix.current)}</span>
        <div className="flex gap-3 text-xs text-gray-600">
          <span>52W L: {vix.low52}</span>
          <span>52W H: {vix.high52}</span>
        </div>
      </div>
      {vix.change1d != null && (
        <div className={`text-xs tabular-nums mt-1 ${vix.change1d > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
          {vix.change1d > 0 ? '▲' : '▼'} {Math.abs(vix.change1d).toFixed(2)} today
        </div>
      )}
    </div>
  )
}

// ── PCR card ──────────────────────────────────────────────────────────────────

function PcrCard({ pcr }) {
  const equity = pcr?.equity
  if (!equity) return null
  const color = pcrColor(equity.value)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors">
      <div className="text-xs text-gray-600 mb-2 leading-tight">Equity Put/Call Ratio</div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{equity.value}</div>
      <div className="flex items-center justify-between mt-1.5">
        <span className={`text-xs font-medium ${color}`}>{pcrLabel(equity.value)}</span>
      </div>
      <div className="text-xs text-gray-700 mt-1">Via SPY + QQQ + IWM live options</div>
      <div className="mt-2 text-xs text-gray-600 space-y-0.5">
        <div><span className="text-red-400">{'< 0.7'}</span> Greed / complacency</div>
        <div><span className="text-emerald-400">0.7–1.0</span> Neutral / healthy</div>
        <div><span className="text-yellow-400">{'> 1.0'}</span> Fear / hedging</div>
      </div>
    </div>
  )
}

// ── Yield curve mini-viz ──────────────────────────────────────────────────────

function YieldCurveCard({ t10y2y }) {
  if (!t10y2y) return null
  const val = t10y2y.value
  const inverted = val < 0
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs text-gray-600">10Y − 2Y Yield Spread</div>
        <Sparkline history={t10y2y.history} color={inverted ? '#f87171' : '#34d399'} height={28} />
      </div>
      <div className={`text-2xl font-bold tabular-nums ${val >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {val > 0 ? '+' : ''}{val}%
      </div>
      <div className={`text-xs font-medium mt-1.5 ${inverted ? 'text-red-400' : 'text-emerald-400'}`}>
        {inverted ? '⚠ Inverted — historical recession signal' : 'Normal (positive) curve'}
      </div>
      <div className="text-xs text-gray-700 mt-1">{t10y2y.date}</div>
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3 mt-6">
      {children}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function MacroTab() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/macro.json')
        if (!res.ok) throw new Error('Macro data not found')
        setData(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center gap-2 py-20 text-gray-600">
      <RefreshCw size={14} className="animate-spin" /> Loading macro data...
    </div>
  )

  if (error || !data) return (
    <div className="py-20 text-center text-gray-600 text-sm">
      <p className="text-red-400 mb-1">Could not load macro data.</p>
      <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_macro.py</code> to generate it.</p>
    </div>
  )

  const ind = data.indicators || {}

  const FRED_DISPLAY = [
    { key: 'FEDFUNDS',     label: 'Fed Funds Rate',     unit: '%' },
    { key: 'CPIAUCSL',     label: 'CPI Inflation (YoY)',unit: '%' },
    { key: 'CPILFESL',     label: 'Core CPI (YoY)',     unit: '%' },
    { key: 'UNRATE',       label: 'Unemployment Rate',  unit: '%' },
    { key: 'MORTGAGE30US', label: '30Y Mortgage Rate',  unit: '%' },
    { key: 'UMCSENT',      label: 'Consumer Sentiment', unit: ''  },
  ]

  return (
    <div>
      {/* Sentiment row */}
      <SectionLabel>Market Sentiment</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <VixCard vix={data.vix} />
        <PcrCard pcr={data.pcr} />
        <YieldCurveCard t10y2y={ind.T10Y2Y} />
        {/* Sentiment summary card */}
        <div className="bg-gray-900 border border-gray-800 rounded p-4">
          <div className="text-xs text-gray-600 mb-3">Quick Read</div>
          <div className="space-y-2 text-xs">
            {[
              { label: 'VIX',     val: data.vix?.current,        color: vixColor(data.vix?.current),            text: vixLabel(data.vix?.current) },
              { label: 'PCR',     val: data.pcr?.equity?.value,  color: pcrColor(data.pcr?.equity?.value),      text: pcrLabel(data.pcr?.equity?.value) },
              { label: 'Curve',   val: ind.T10Y2Y?.value,        color: (ind.T10Y2Y?.value ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400', text: (ind.T10Y2Y?.value ?? 0) >= 0 ? 'Normal' : 'Inverted' },
              { label: 'Sentiment', val: ind.UMCSENT?.value,     color: indicatorColor('UMCSENT', ind.UMCSENT?.value, false), text: ind.UMCSENT?.value != null ? (ind.UMCSENT.value >= 70 ? 'Confident' : ind.UMCSENT.value >= 55 ? 'Cautious' : 'Pessimistic') : '' },
            ].map(({ label, val, color, text }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-gray-600">{label}</span>
                <span className={`font-medium ${color}`}>{text || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FRED indicators */}
      <SectionLabel>Economic Indicators (FRED)</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {FRED_DISPLAY.map(({ key, label, unit }) => {
          const d = ind[key]
          if (!d) return null
          return (
            <MetricCard
              key={key}
              label={label}
              value={d.value}
              unit={unit}
              color={indicatorColor(key, d.value, d.goodLow)}
              sub={d.date?.slice(0, 7)}
              change={d.change}
              changeLabel="MoM"
              history={d.history}
              sparkColor={sparkColor(key)}
              desc={d.desc}
            />
          )
        })}
      </div>

      {/* Context notes */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
          <div className="font-medium text-gray-400 mb-1">Fed Funds: {ind.FEDFUNDS?.value}%</div>
          <p className="text-gray-600 leading-relaxed">
            {(ind.FEDFUNDS?.value ?? 0) > 4
              ? 'Restrictive territory. Higher-for-longer weighs on valuations and credit. Watch for rate cuts as inflation cools.'
              : 'Rates moving toward neutral. Easing financial conditions supportive for risk assets.'}
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
          <div className="font-medium text-gray-400 mb-1">CPI: {ind.CPIAUCSL?.value?.toFixed(1)}% YoY</div>
          <p className="text-gray-600 leading-relaxed">
            {(ind.CPIAUCSL?.value ?? 0) > 4
              ? 'Inflation well above the 2% target. Fed unlikely to cut aggressively — headwind for long-duration assets.'
              : (ind.CPIAUCSL?.value ?? 0) > 2.5
              ? 'Inflation still above target but trending in the right direction.'
              : 'Inflation near or at the 2% Fed target. Supports a dovish pivot.'}
          </p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded p-3">
          <div className="font-medium text-gray-400 mb-1">Consumer Sentiment: {ind.UMCSENT?.value}</div>
          <p className="text-gray-600 leading-relaxed">
            {(ind.UMCSENT?.value ?? 80) < 55
              ? 'Deeply pessimistic consumers — historically a contrarian bullish signal for stocks at extremes.'
              : (ind.UMCSENT?.value ?? 80) < 70
              ? 'Cautious but not panicked. Watch for recovery as a leading indicator of spending.'
              : 'Consumer confidence healthy. Supports spending and earnings growth.'}
          </p>
        </div>
      </div>

      {data.asOf && (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-4">
          <RefreshCw size={10} /> Data as of {data.asOf}
          <span className="ml-2 text-gray-800">· VIX & PCR: yfinance · Economic indicators: FRED (St. Louis Fed)</span>
        </div>
      )}
    </div>
  )
}
