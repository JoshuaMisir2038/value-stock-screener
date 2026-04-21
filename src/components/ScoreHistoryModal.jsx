import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import ScoreBadge from './ScoreBadge'

// Module-level cache — fetch once per page load
let _cache = null
let _promise = null

function loadHistory() {
  if (_cache) return Promise.resolve(_cache)
  if (!_promise) {
    _promise = fetch('./data/score_history.json')
      .then(r => r.ok ? r.json() : {})
      .then(d => { _cache = d; return d })
      .catch(() => { _promise = null; return {} })
  }
  return _promise
}

function ScoreLineChart({ entries }) {
  const W = 480, H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 34 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (!entries || entries.length < 2) {
    return (
      <div className="text-center text-gray-600 text-xs py-8">
        Not enough history yet — check back tomorrow.
      </div>
    )
  }

  const scores  = entries.map(e => e.s)
  const minS    = Math.max(0,   Math.min(...scores) - 8)
  const maxS    = Math.min(100, Math.max(...scores) + 8)

  const xScale = i => PAD.left + (i / (entries.length - 1)) * chartW
  const yScale = v => PAD.top + chartH - ((v - minS) / (maxS - minS)) * chartH

  const pts     = entries.map((e, i) => `${xScale(i).toFixed(1)},${yScale(e.s).toFixed(1)}`)
  const linePath = `M ${pts.join(' L ')}`
  const lastX    = xScale(entries.length - 1)
  const areaPath = `M ${PAD.left},${PAD.top + chartH} L ${pts.join(' L ')} L ${lastX},${PAD.top + chartH} Z`

  const last = scores[scores.length - 1]
  const color = last >= 75 ? '#34d399' : last >= 55 ? '#60a5fa' : last >= 35 ? '#fbbf24' : '#f87171'

  // X-axis: show ~4 evenly spaced date labels
  const labelIdxs = entries.length <= 4
    ? entries.map((_, i) => i)
    : [0, Math.floor(entries.length * 0.33), Math.floor(entries.length * 0.67), entries.length - 1]

  const guides = [25, 50, 75].filter(g => g > minS && g < maxS)

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {guides.map(g => (
        <g key={g}>
          <line
            x1={PAD.left} y1={yScale(g)} x2={PAD.left + chartW} y2={yScale(g)}
            stroke="#1f2937" strokeWidth="1" strokeDasharray="3,3"
          />
          <text x={PAD.left - 4} y={yScale(g) + 3.5} textAnchor="end" fontSize="9" fill="#4b5563">{g}</text>
        </g>
      ))}

      <path d={areaPath} fill="url(#sg)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.75"
            strokeLinejoin="round" strokeLinecap="round" />

      {/* Current value endpoint */}
      <circle cx={lastX} cy={yScale(last)} r="3.5" fill={color} />
      <text x={lastX + 6} y={yScale(last) + 3.5} fontSize="9" fill={color} fontWeight="600">{last}</text>

      {labelIdxs.map(idx => (
        <text key={idx} x={xScale(idx)} y={H - 2} textAnchor="middle" fontSize="9" fill="#4b5563">
          {entries[idx].d.slice(5)}
        </text>
      ))}
    </svg>
  )
}

export default function ScoreHistoryModal({ symbol, name, currentScore, onClose }) {
  const [entries, setEntries] = useState(null)

  useEffect(() => {
    loadHistory().then(data => setEntries(data[symbol] || []))
  }, [symbol])

  const scores = entries?.map(e => e.s) ?? []
  const avg    = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const min    = scores.length ? Math.min(...scores) : null
  const max    = scores.length ? Math.max(...scores) : null

  // Trend: current vs 14 entries ago (2 trading weeks)
  const trendBase = scores.length >= 5 ? scores[Math.max(0, scores.length - 14)] : null
  const trend     = trendBase != null ? scores[scores.length - 1] - trendBase : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div
        className="relative bg-gray-950 border border-gray-800 rounded-lg shadow-2xl w-full max-w-lg p-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-white text-lg tracking-wide">{symbol}</span>
              <ScoreBadge score={currentScore} />
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[340px]">{name}</div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Stats */}
        {entries !== null && scores.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'Current', value: currentScore, color: '' },
              { label: 'Avg',     value: avg,          color: '' },
              { label: 'Low',     value: min,          color: 'text-red-400' },
              { label: 'High',    value: max,          color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-gray-900 rounded px-2 py-1.5 text-center">
                <div className="text-[10px] text-gray-600 mb-0.5">{label}</div>
                <div className={`text-sm font-bold tabular-nums ${color || 'text-gray-200'}`}>{value ?? '—'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Trend label */}
        {trend != null && (
          <div className="flex items-center gap-1.5 text-xs mb-3">
            {trend > 2
              ? <TrendingUp  size={12} className="text-emerald-400" />
              : trend < -2
              ? <TrendingDown size={12} className="text-red-400" />
              : <Minus size={12} className="text-gray-500" />}
            <span className={trend > 2 ? 'text-emerald-400' : trend < -2 ? 'text-red-400' : 'text-gray-500'}>
              {trend > 0 ? '+' : ''}{trend} pts vs 2 weeks ago
            </span>
          </div>
        )}

        {/* Chart */}
        {entries === null
          ? <div className="text-center py-8 text-gray-600 text-xs">Loading history...</div>
          : <ScoreLineChart entries={entries} />
        }

        <div className="text-[10px] text-gray-700 mt-3">
          Scores are snapshotted once per trading day. Reflects fundamentals vs sector peers at time of capture.
        </div>
      </div>
    </div>
  )
}
