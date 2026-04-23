import { useState } from 'react'
import { RotateCcw, ChevronDown, ChevronUp, Plus, X, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react'
import { DEFAULT_SCORE_METRICS, EXTRA_SCORE_METRICS } from '../utils/scoring'

const GROUP_ORDER = ['Valuation', 'Quality', 'Safety', 'Growth', 'Income', 'Technical']

const GROUP_COLORS = {
  Valuation: 'text-blue-400',
  Quality:   'text-emerald-400',
  Safety:    'text-yellow-400',
  Growth:    'text-purple-400',
  Income:    'text-orange-400',
  Technical: 'text-cyan-400',
}

export function defaultMetricConfig() {
  return DEFAULT_SCORE_METRICS.map(m => ({ ...m, enabled: true }))
}

export default function ScoreWeightsPanel({ metrics, onChange }) {
  const [open, setOpen] = useState(false)

  const activeKeys = new Set(metrics.map(m => m.key))
  const available = EXTRA_SCORE_METRICS.filter(m => !activeKeys.has(m.key))

  const totalWeight = metrics.filter(m => m.enabled).reduce((s, m) => s + m.weight, 0)

  function update(key, patch) {
    onChange(metrics.map(m => m.key === key ? { ...m, ...patch } : m))
  }

  function remove(key) {
    onChange(metrics.filter(m => m.key !== key))
  }

  function addMetric(m) {
    onChange([...metrics, { ...m, weight: 10, enabled: true }])
  }

  function reset() {
    onChange(DEFAULT_SCORE_METRICS.map(m => ({ ...m, enabled: true })))
  }

  // Group active metrics
  const grouped = GROUP_ORDER.reduce((acc, g) => {
    const items = metrics.filter(m => m.group === g)
    if (items.length) acc.push({ group: g, items })
    return acc
  }, [])

  return (
    <div className="border border-gray-800 bg-gray-900/30">
      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-900/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={12} className="text-blue-500" />
          <span className="text-[11px] font-bold tracking-widest text-gray-300 uppercase">
            Customize Value Score Weights
          </span>
          <span className="text-[9px] text-gray-600 uppercase tracking-wider">
            {metrics.filter(m => m.enabled).length} metrics · {totalWeight}pts total
          </span>
        </div>
        {open
          ? <ChevronUp size={13} className="text-gray-600" />
          : <ChevronDown size={13} className="text-gray-600" />}
      </button>

      {open && (
        <div className="border-t border-gray-800 px-4 pt-4 pb-5 space-y-5">

          {/* Info bar */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-600 leading-relaxed max-w-xl">
              Adjust weights to change what drives the Value Score. Enable/disable metrics, change their direction, or add new ones.
              The score auto-normalises — weights are relative, not absolute.
            </p>
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-gray-500 border border-gray-700 hover:border-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider shrink-0"
            >
              <RotateCcw size={10} />
              Reset Defaults
            </button>
          </div>

          {/* Active metrics by group */}
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className={`text-[9px] font-bold tracking-widest uppercase mb-2 ${GROUP_COLORS[group] ?? 'text-gray-600'}`}>
                {group}
              </div>
              <div className="space-y-2">
                {items.map(m => {
                  const isDefault = DEFAULT_SCORE_METRICS.some(d => d.key === m.key)
                  return (
                    <div
                      key={m.key}
                      className={`flex items-center gap-3 px-3 py-2 border transition-colors ${
                        m.enabled ? 'border-gray-800 bg-gray-900/40' : 'border-gray-900 bg-transparent opacity-50'
                      }`}
                    >
                      {/* Enable toggle */}
                      <button
                        onClick={() => update(m.key, { enabled: !m.enabled })}
                        className={`w-4 h-4 border flex items-center justify-center shrink-0 transition-colors ${
                          m.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-700'
                        }`}
                        title={m.enabled ? 'Disable metric' : 'Enable metric'}
                      >
                        {m.enabled && <span className="text-black text-[9px] font-bold">✓</span>}
                      </button>

                      {/* Label + desc */}
                      <div className="w-28 shrink-0">
                        <div className="text-[11px] text-gray-300 font-bold">{m.label}</div>
                        <div className="text-[9px] text-gray-600 mt-0.5 leading-tight line-clamp-1" title={m.desc}>{m.desc}</div>
                      </div>

                      {/* Direction toggle */}
                      <button
                        onClick={() => update(m.key, { lowerIsBetter: !m.lowerIsBetter })}
                        title={m.lowerIsBetter ? 'Lower is better (click to flip)' : 'Higher is better (click to flip)'}
                        className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 transition-colors shrink-0 w-24"
                      >
                        {m.lowerIsBetter
                          ? <><ArrowDown size={9} className="text-emerald-600" /><span>lower = better</span></>
                          : <><ArrowUp   size={9} className="text-blue-500"  /><span>higher = better</span></>
                        }
                      </button>

                      {/* Weight slider */}
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="range"
                          min={0}
                          max={40}
                          step={1}
                          value={m.weight}
                          onChange={e => update(m.key, { weight: parseInt(e.target.value) })}
                          disabled={!m.enabled}
                          className="flex-1 h-1 accent-orange-500 cursor-pointer"
                        />
                        <span className="text-[11px] text-blue-400 tabular-nums w-8 text-right font-bold">
                          {m.weight}pt
                        </span>
                        <div
                          className="h-2 bg-blue-500/60"
                          style={{ width: Math.max(2, (m.weight / 40) * 80) }}
                          title={`${Math.round((m.weight / totalWeight) * 100)}% of total`}
                        />
                        <span className="text-[9px] text-gray-700 w-8 text-right tabular-nums">
                          {totalWeight > 0 ? Math.round((m.weight / totalWeight) * 100) : 0}%
                        </span>
                      </div>

                      {/* Remove (only for added extras) */}
                      {!isDefault && (
                        <button
                          onClick={() => remove(m.key)}
                          className="text-gray-700 hover:text-red-400 transition-colors shrink-0"
                          title="Remove metric"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Add metrics */}
          {available.length > 0 && (
            <div>
              <div className="text-[9px] font-bold tracking-widest uppercase text-gray-700 mb-2">
                Add Metric to Score
              </div>
              <div className="flex flex-wrap gap-2">
                {available.map(m => (
                  <button
                    key={m.key}
                    onClick={() => addMetric(m)}
                    title={m.desc}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-700 hover:border-blue-500 text-[10px] text-gray-500 hover:text-blue-400 transition-colors`}
                  >
                    <Plus size={9} />
                    <span className={GROUP_COLORS[m.group] ?? ''}>{m.label}</span>
                    <span className="text-gray-700 text-[9px]">{m.group}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weight total bar */}
          <div className="border-t border-gray-800 pt-3 flex items-center gap-3">
            <span className="text-[10px] text-gray-600 uppercase tracking-wider">Effective distribution</span>
            <div className="flex flex-1 h-2 overflow-hidden border border-gray-800">
              {metrics.filter(m => m.enabled && m.weight > 0).map((m, i) => (
                <div
                  key={m.key}
                  style={{
                    width: `${(m.weight / totalWeight) * 100}%`,
                    backgroundColor: `hsl(${(i * 47) % 360}, 60%, 45%)`,
                  }}
                  title={`${m.label}: ${Math.round((m.weight / totalWeight) * 100)}%`}
                />
              ))}
            </div>
            <span className="text-[10px] text-gray-500 tabular-nums">{totalWeight}pts</span>
          </div>
        </div>
      )}
    </div>
  )
}
