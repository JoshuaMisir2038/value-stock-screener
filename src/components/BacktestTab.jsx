import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'

// ── Math helpers ──────────────────────────────────────────────────────────────

function avg(arr) {
  const valid = arr.filter(v => v != null && isFinite(v))
  return valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null
}

function linearRegression(pts) {
  const n = pts.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  const sumX  = pts.reduce((s, p) => s + p.x, 0)
  const sumY  = pts.reduce((s, p) => s + p.y, 0)
  const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (!denom) return { slope: 0, intercept: sumY / n, r2: 0 }
  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  const yMean = sumY / n
  const ssTot = pts.reduce((s, p) => s + (p.y - yMean) ** 2, 0)
  const ssRes = pts.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0)
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0
  return { slope, intercept, r2 }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ReturnCell({ value, bold = false }) {
  if (value == null) return <span className="text-gray-700">—</span>
  const color = value > 1 ? 'text-emerald-400' : value < -1 ? 'text-red-400' : 'text-gray-500'
  return (
    <span className={`tabular-nums ${color} ${bold ? 'font-bold' : ''}`}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  )
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  )
}

// ── Scatter plot ──────────────────────────────────────────────────────────────

const SCORE_COLORS = [
  { min: 75,  color: '#34d399' }, // emerald
  { min: 55,  color: '#60a5fa' }, // blue
  { min: 35,  color: '#facc15' }, // yellow
  { min: 0,   color: '#f87171' }, // red
]

function dotColor(score) {
  return (SCORE_COLORS.find(c => score >= c.min) || SCORE_COLORS[3]).color
}

function ScatterPlot({ points }) {
  const [tooltip, setTooltip] = useState(null)

  const W = 580, H = 300
  const PAD = { top: 16, right: 20, bottom: 44, left: 54 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  // Dynamic Y range with padding, capped at extremes
  const ys = points.map(p => p.y)
  const rawMin = Math.max(-80, Math.min(...ys) - 5)
  const rawMax = Math.min(200, Math.max(...ys) + 5)
  const yMin = Math.floor(rawMin / 10) * 10
  const yMax = Math.ceil(rawMax / 10) * 10

  const xScale = x => PAD.left + (x / 100) * plotW
  const yScale = y => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * plotH

  const { slope, intercept, r2 } = linearRegression(points)
  const ty0 = Math.min(yMax, Math.max(yMin, intercept))
  const ty1 = Math.min(yMax, Math.max(yMin, slope * 100 + intercept))

  // Y grid lines
  const yStep = (yMax - yMin) <= 60 ? 10 : 20
  const yTicks = []
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) yTicks.push(y)

  return (
    <div className="relative overflow-x-auto">
      <svg width={W} height={H} className="overflow-visible">
        {/* Grid */}
        {yTicks.map(y => (
          <g key={y}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={yScale(y)} y2={yScale(y)}
              stroke="#1f2937" strokeWidth="1" />
            <text x={PAD.left - 6} y={yScale(y)} textAnchor="end" dominantBaseline="middle"
              fontSize="9" fill="#4b5563">{y}%</text>
          </g>
        ))}

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line x1={PAD.left} x2={PAD.left + plotW} y1={yScale(0)} y2={yScale(0)}
            stroke="#374151" strokeWidth="1.5" strokeDasharray="4,3" />
        )}

        {/* X axis ticks */}
        {[0, 25, 50, 75, 100].map(x => (
          <g key={x}>
            <line x1={xScale(x)} x2={xScale(x)} y1={PAD.top} y2={PAD.top + plotH}
              stroke="#1f2937" strokeWidth="1" />
            <text x={xScale(x)} y={PAD.top + plotH + 14} textAnchor="middle"
              fontSize="9" fill="#4b5563">{x}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">
          Value Score →
        </text>
        <text x={12} y={PAD.top + plotH / 2} textAnchor="middle" fontSize="10" fill="#6b7280"
          transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>
          1Y Return %
        </text>

        {/* Trend line */}
        <line
          x1={xScale(0)} y1={yScale(ty0)}
          x2={xScale(100)} y2={yScale(ty1)}
          stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xScale(p.x)}
            cy={yScale(Math.min(yMax, Math.max(yMin, p.y)))}
            r={3.5}
            fill={dotColor(p.x)}
            opacity={0.65}
            className="cursor-pointer hover:opacity-100"
            onMouseEnter={e => setTooltip({ ...p, ex: e.clientX, ey: e.clientY })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* Axes */}
        <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH}
          stroke="#374151" strokeWidth="1" />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH}
          stroke="#374151" strokeWidth="1" />
      </svg>

      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-xs pointer-events-none shadow-lg"
          style={{ left: tooltip.ex + 12, top: tooltip.ey - 10 }}
        >
          <div className="font-bold text-white">{tooltip.symbol}</div>
          <div className="text-gray-400 truncate max-w-[140px]">{tooltip.name}</div>
          <div className="mt-1 grid grid-cols-2 gap-x-3">
            <span className="text-gray-500">Score</span>
            <span className="text-white font-medium">{tooltip.x}</span>
            <span className="text-gray-500">1Y Return</span>
            <span className={tooltip.y >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {tooltip.y > 0 ? '+' : ''}{tooltip.y.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* R² annotation */}
      <div className="mt-1 text-xs text-gray-600">
        Trend: {slope >= 0 ? 'positive' : 'negative'} slope · R² = {(r2 * 100).toFixed(1)}%
        {r2 > 0.1
          ? ' — score explains some return variance'
          : r2 > 0.03
          ? ' — weak but present signal'
          : ' — low correlation (many factors drive returns)'}
      </div>
    </div>
  )
}

// ── Multi-year lookback ───────────────────────────────────────────────────────

const HORIZONS = [
  { key: 'return1y', label: '1Y', years: 1 },
  { key: 'return2y', label: '2Y', years: 2 },
  { key: 'return3y', label: '3Y', years: 3 },
  { key: 'return4y', label: '4Y', years: 4 },
  { key: 'return5y', label: '5Y', years: 5 },
]

function HorizonChart({ rows }) {
  const W = 560, H = 240
  const PAD = { top: 16, right: 24, bottom: 40, left: 56 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const allVals = rows.flatMap(r => [r.highAvg, r.lowAvg, r.spy].filter(v => v != null))
  if (!allVals.length) return null
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const pad    = Math.max(5, (rawMax - rawMin) * 0.1)
  const yMin   = Math.floor((rawMin - pad) / 10) * 10
  const yMax   = Math.ceil((rawMax + pad) / 10) * 10
  const yRange = yMax - yMin || 1

  const xS = i => PAD.left + (i / (rows.length - 1)) * plotW
  const yS = v => PAD.top + (1 - (v - yMin) / yRange) * plotH

  const yStep = (yMax - yMin) <= 100 ? 20 : 50
  const yTicks = []
  for (let y = Math.ceil(yMin / yStep) * yStep; y <= yMax; y += yStep) yTicks.push(y)

  function line(key, color) {
    const pts = rows.map((r, i) => r[key] != null ? `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(r[key]).toFixed(1)}` : null)
    const path = pts.filter(Boolean).join(' ')
    return path ? <path key={key} d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeDasharray={key === 'spy' ? '5,3' : undefined} /> : null
  }

  return (
    <svg width={W} height={H} className="overflow-visible w-full max-w-[560px]">
      {/* Grid + Y labels */}
      {yTicks.map(y => (
        <g key={y}>
          <line x1={PAD.left} x2={PAD.left + plotW} y1={yS(y)} y2={yS(y)} stroke="#1f2937" strokeWidth="1" />
          <text x={PAD.left - 6} y={yS(y)} textAnchor="end" dominantBaseline="middle" fontSize="9" fill="#4b5563">{y}%</text>
        </g>
      ))}
      {/* Zero line */}
      {yMin < 0 && <line x1={PAD.left} x2={PAD.left + plotW} y1={yS(0)} y2={yS(0)} stroke="#374151" strokeWidth="1.5" strokeDasharray="4,3" />}
      {/* Lines */}
      {line('highAvg', '#34d399')}
      {line('lowAvg',  '#f87171')}
      {line('spy',     '#60a5fa')}
      {/* Dots + X labels */}
      {rows.map((r, i) => (
        <g key={i}>
          {r.highAvg != null && <circle cx={xS(i)} cy={yS(r.highAvg)} r={4} fill="#34d399" />}
          {r.lowAvg  != null && <circle cx={xS(i)} cy={yS(r.lowAvg)}  r={4} fill="#f87171" />}
          {r.spy     != null && <circle cx={xS(i)} cy={yS(r.spy)}     r={3} fill="#60a5fa" />}
          <text x={xS(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#6b7280">{r.label} ago</text>
        </g>
      ))}
      {/* Axes */}
      <line x1={PAD.left} x2={PAD.left + plotW} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#374151" strokeWidth="1" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + plotH} stroke="#374151" strokeWidth="1" />
      {/* Y label */}
      <text x={12} y={PAD.top + plotH / 2} textAnchor="middle" fontSize="9" fill="#6b7280"
        transform={`rotate(-90,12,${PAD.top + plotH / 2})`}>Return to today %</text>
    </svg>
  )
}

function MultiYearLookback({ stocks, spy }) {
  const rows = useMemo(() => HORIZONS.map(({ key, label, years }) => {
    const hi = stocks.filter(s => s.valueScore >= 75 && s[key] != null)
    const lo = stocks.filter(s => s.valueScore <  25 && s[key] != null)
    return {
      label,
      years,
      highAvg:   avg(hi.map(s => s[key])),
      highCount: hi.length,
      lowAvg:    avg(lo.map(s => s[key])),
      lowCount:  lo.length,
      spy:       spy?.[key] ?? null,
    }
  }), [stocks, spy])

  const anyData = rows.some(r => r.highAvg != null)
  if (!anyData) return (
    <div className="text-xs text-gray-600 py-4">
      Multi-year return data not yet available. Re-run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_data.py</code>.
    </div>
  )

  return (
    <div>
      {/* Chart */}
      <div className="border border-gray-800 rounded p-4 bg-gray-950/30 mb-4 overflow-x-auto">
        <HorizonChart rows={rows} />
        <div className="flex gap-5 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-emerald-400 rounded" />High score (&gt;75)</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-red-400 rounded" />Low score (&lt;25)</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-blue-400 rounded" />S&amp;P 500 (SPY)</span>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-800 rounded overflow-hidden bg-gray-950/30">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wider">
              <th className="px-4 py-2.5 text-left">Entry Point</th>
              <th className="px-4 py-2.5 text-right">High Score (&gt;75)<br /><span className="font-normal normal-case">avg return to now</span></th>
              <th className="px-4 py-2.5 text-right">Low Score (&lt;25)<br /><span className="font-normal normal-case">avg return to now</span></th>
              <th className="px-4 py-2.5 text-right">S&amp;P 500<br /><span className="font-normal normal-case">SPY return</span></th>
              <th className="px-4 py-2.5 text-right">High vs SPY<br /><span className="font-normal normal-case">alpha</span></th>
              <th className="px-4 py-2.5 text-right">High vs Low<br /><span className="font-normal normal-case">spread</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const alpha  = r.highAvg != null && r.spy     != null ? r.highAvg - r.spy    : null
              const spread = r.highAvg != null && r.lowAvg  != null ? r.highAvg - r.lowAvg : null
              const alphaColor  = alpha  == null ? 'text-gray-600' : alpha  > 0 ? 'text-emerald-400' : 'text-red-400'
              const spreadColor = spread == null ? 'text-gray-600' : spread > 0 ? 'text-emerald-400' : 'text-red-400'
              return (
                <tr key={r.label} className={`border-b border-gray-900 hover:bg-gray-900/50 ${i % 2 !== 0 ? 'bg-gray-950/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-200">{r.label} ago → today</div>
                    <div className="text-xs text-gray-600">{r.highCount} high · {r.lowCount} low stocks</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReturnCell value={r.highAvg} bold />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ReturnCell value={r.lowAvg} bold />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-blue-400 font-medium">
                    {r.spy != null ? `${r.spy > 0 ? '+' : ''}${r.spy.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold ${alphaColor}`}>
                    {alpha != null ? `${alpha > 0 ? '+' : ''}${alpha.toFixed(1)}%` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right tabular-nums font-bold ${spreadColor}`}>
                    {spread != null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-700 mt-2">
        Uses <em>current</em> value scores applied to historical entry prices — not point-in-time scores. A positive alpha means today's high-scored stocks also happened to outperform from that date.
      </p>
    </div>
  )
}

// ── Decile table ──────────────────────────────────────────────────────────────

function DecileTable({ deciles, spy }) {
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-800 text-xs text-gray-600 uppercase tracking-wider">
          <th className="px-4 py-2.5 text-left">Score Range</th>
          <th className="px-4 py-2.5 text-right">Stocks</th>
          <th className="px-4 py-2.5 text-right">Avg 1M</th>
          <th className="px-4 py-2.5 text-right">Avg 3M</th>
          <th className="px-4 py-2.5 text-right">Avg 6M</th>
          <th className="px-4 py-2.5 text-right">Avg 1Y</th>
        </tr>
      </thead>
      <tbody>
        {[...deciles].reverse().map((d, i) => (
          <tr
            key={d.range}
            className={`border-b border-gray-900 hover:bg-gray-900/50 ${i % 2 !== 0 ? 'bg-gray-950/40' : ''}`}
          >
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: dotColor(parseInt(d.range.split('–')[0])) }}
                />
                <span className="text-gray-300 font-medium">{d.range}</span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-right text-gray-500">{d.count}</td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={d.avg1m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={d.avg3m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={d.avg6m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={d.avg1y} bold /></td>
          </tr>
        ))}
        {/* SPY benchmark row */}
        {spy && (
          <tr className="border-t border-gray-700 bg-blue-500/5">
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-blue-400 font-medium">S&amp;P 500 (SPY)</span>
              </div>
            </td>
            <td className="px-4 py-2.5 text-right text-gray-600">—</td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={spy.return1m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={spy.return3m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={spy.return6m} /></td>
            <td className="px-4 py-2.5 text-right"><ReturnCell value={spy.return1y} bold /></td>
          </tr>
        )}
      </tbody>
    </table>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BacktestTab({ stocks, benchmark, loading }) {
  // Only stocks with both a value score and at least 1Y return data
  const valid = useMemo(
    () => stocks.filter(s => s.valueScore != null && s.return1y != null),
    [stocks]
  )

  const scatterPoints = useMemo(
    () => valid.map(s => ({ x: s.valueScore, y: s.return1y, symbol: s.symbol, name: s.name })),
    [valid]
  )

  const deciles = useMemo(() => {
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${(i + 1) * 10}`,
      stocks: [],
    }))
    valid.forEach(s => {
      const d = Math.min(9, Math.floor(s.valueScore / 10))
      buckets[d].stocks.push(s)
    })
    return buckets.map(b => ({
      range: b.range,
      count: b.stocks.length,
      avg1m:  avg(b.stocks.map(s => s.return1m)),
      avg3m:  avg(b.stocks.map(s => s.return3m)),
      avg6m:  avg(b.stocks.map(s => s.return6m)),
      avg1y:  avg(b.stocks.map(s => s.return1y)),
    }))
  }, [valid])

  const topQuartile = useMemo(
    () => valid.filter(s => s.valueScore >= 75),
    [valid]
  )
  const bottomQuartile = useMemo(
    () => valid.filter(s => s.valueScore < 25),
    [valid]
  )

  const topAvg1y   = avg(topQuartile.map(s => s.return1y))
  const bottomAvg1y = avg(bottomQuartile.map(s => s.return1y))
  const spy = benchmark?.spy

  const { r2 } = useMemo(() => linearRegression(scatterPoints), [scatterPoints])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-gray-600">
        <RefreshCw size={14} className="animate-spin" /> Loading...
      </div>
    )
  }

  if (valid.length === 0) {
    return (
      <div className="py-20 text-center text-gray-600 text-sm">
        <p className="mb-1">No return data yet.</p>
        <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_data.py</code> to generate it.</p>
      </div>
    )
  }

  const spread = topAvg1y != null && spy?.return1y != null
    ? topAvg1y - spy.return1y
    : null

  return (
    <div className="space-y-8">
      {/* Description */}
      <div>
        <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
          For each of the {valid.length.toLocaleString()} stocks in the screener, this plots the current value score
          against the actual 1-year price return. If the model works, high-scored stocks should outperform
          low-scored ones. Note: this uses <em>current</em> value scores, not historical ones —
          so it's directional, not a rigorous backtest.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Score >75 avg 1Y return"
          value={topAvg1y != null ? `${topAvg1y > 0 ? '+' : ''}${topAvg1y.toFixed(1)}%` : '—'}
          sub={`${topQuartile.length} stocks`}
          accent={topAvg1y > 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <SummaryCard
          label="S&P 500 (SPY) 1Y return"
          value={spy?.return1y != null ? `${spy.return1y > 0 ? '+' : ''}${spy.return1y.toFixed(1)}%` : '—'}
          sub="benchmark"
          accent="text-blue-400"
        />
        <SummaryCard
          label="Top quartile vs S&P"
          value={spread != null ? `${spread > 0 ? '+' : ''}${spread.toFixed(1)}%` : '—'}
          sub={spread > 0 ? 'outperforming' : spread < 0 ? 'underperforming' : ''}
          accent={spread > 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <SummaryCard
          label="Score–Return correlation"
          value={`R² ${(r2 * 100).toFixed(1)}%`}
          sub={r2 > 0.1 ? 'moderate signal' : r2 > 0.03 ? 'weak signal' : 'low signal'}
          accent="text-gray-300"
        />
      </div>

      {/* Multi-year lookback */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Multi-Year Lookback: High vs Low Score Performance
        </h3>
        <MultiYearLookback stocks={valid} spy={spy} />
      </div>

      {/* Scatter plot */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Value Score vs 1-Year Return
        </h3>
        <div className="border border-gray-800 rounded p-4 bg-gray-950/30">
          <ScatterPlot points={scatterPoints} />
          {/* Legend */}
          <div className="flex gap-4 mt-3 text-xs text-gray-600">
            {[
              { color: '#34d399', label: 'Score 75–100' },
              { color: '#60a5fa', label: 'Score 55–74' },
              { color: '#facc15', label: 'Score 35–54' },
              { color: '#f87171', label: 'Score 0–34' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Decile table */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
          Average Returns by Score Decile
        </h3>
        <div className="border border-gray-800 rounded overflow-hidden bg-gray-950/30">
          <DecileTable deciles={deciles} spy={spy} />
        </div>
        <p className="text-xs text-gray-700 mt-2">
          Survivorship bias note: only stocks currently in the screener (mkt cap &gt;$100M, still trading) are included.
          Delisted or acquired stocks are excluded, which may inflate historical averages.
        </p>
      </div>
    </div>
  )
}
