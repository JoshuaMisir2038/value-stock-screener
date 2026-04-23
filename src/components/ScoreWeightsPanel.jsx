import { useState, useEffect, useRef } from 'react'
import { RotateCcw, ChevronDown, ChevronUp, Plus, X, SlidersHorizontal, ArrowDown, ArrowUp } from 'lucide-react'
import { DEFAULT_SCORE_METRICS, EXTRA_SCORE_METRICS } from '../utils/scoring'

const GROUP_COLORS = {
  Valuation: 'text-blue-400',
  Quality:   'text-emerald-400',
  Safety:    'text-yellow-400',
  Growth:    'text-purple-400',
  Income:    'text-orange-400',
  Technical: 'text-cyan-400',
}

const GROUP_DOT = {
  Valuation: 'bg-blue-500',
  Quality:   'bg-emerald-500',
  Safety:    'bg-yellow-400',
  Growth:    'bg-purple-500',
  Income:    'bg-orange-500',
  Technical: 'bg-cyan-500',
}

export function defaultMetricConfig() {
  return DEFAULT_SCORE_METRICS.map(m => ({ ...m, enabled: true }))
}

export default function ScoreWeightsPanel({ metrics, onChange }) {
  const [open, setOpen] = useState(false)

  // Local draft weights — updated instantly on drag, pushed to parent only on release
  const [draftWeights, setDraftWeights] = useState(() =>
    Object.fromEntries(metrics.map(m => [m.key, m.weight]))
  )
  const metricKeySig = metrics.map(m => m.key).join(',')
  useEffect(() => {
    setDraftWeights(Object.fromEntries(metrics.map(m => [m.key, m.weight])))
  }, [metricKeySig]) // re-sync when metrics are added/removed or reset

  const activeKeys = new Set(metrics.map(m => m.key))
  const available = EXTRA_SCORE_METRICS.filter(m => !activeKeys.has(m.key))
  // Total uses draft weights so the % readout updates live while dragging
  const totalWeight = metrics
    .filter(m => m.enabled)
    .reduce((s, m) => s + (draftWeights[m.key] ?? m.weight), 0)

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

  return (
    <div className="border border-gray-800">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <SlidersHorizontal size={11} className="text-blue-500 shrink-0" />
          <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">
            Customize Value Score Weights
          </span>
          <span className="text-[9px] text-gray-700 uppercase tracking-wider">
            {metrics.filter(m => m.enabled).length} active · {totalWeight}pts
          </span>
        </div>
        <div className="flex items-center gap-3">
          {open && (
            <button
              onClick={e => { e.stopPropagation(); reset() }}
              className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider"
            >
              <RotateCcw size={9} />
              Reset
            </button>
          )}
          {open ? <ChevronUp size={12} className="text-gray-700" /> : <ChevronDown size={12} className="text-gray-700" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1fr] border-b border-gray-900 px-3 py-1.5 bg-gray-900/40">
            <div className="text-[9px] text-gray-700 uppercase tracking-widest">Metric · Weight</div>
            <div className="text-[9px] text-gray-700 uppercase tracking-widest pl-4">Direction · Why it matters</div>
          </div>

          {/* Metric rows */}
          <div>
            {metrics.map((m, i) => {
              const isDefault = DEFAULT_SCORE_METRICS.some(d => d.key === m.key)
              return (
                <div
                  key={m.key}
                  className={`grid grid-cols-[1fr_1fr] border-b border-gray-900/60 transition-colors ${
                    m.enabled ? 'hover:bg-gray-900/30' : 'opacity-40'
                  } ${i % 2 === 0 ? '' : 'bg-gray-950/30'}`}
                >
                  {/* LEFT — controls */}
                  <div className="flex items-center gap-2 px-3 py-2 pr-4">
                    {/* Enable checkbox */}
                    <button
                      onClick={() => update(m.key, { enabled: !m.enabled })}
                      className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 transition-colors ${
                        m.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-700'
                      }`}
                    >
                      {m.enabled && <span className="text-black text-[8px] font-bold leading-none">✓</span>}
                    </button>

                    {/* Group dot + label */}
                    <div className={`w-1.5 h-1.5 shrink-0 ${GROUP_DOT[m.group] ?? 'bg-gray-600'}`} />
                    <span className="text-[11px] text-gray-300 font-bold w-20 shrink-0">{m.label}</span>

                    {/* Slider — local draft state for instant visual response,
                        commits to parent (triggers recompute) only on release */}
                    <input
                      type="range"
                      min={0}
                      max={40}
                      step={1}
                      value={draftWeights[m.key] ?? m.weight}
                      onChange={e =>
                        setDraftWeights(prev => ({ ...prev, [m.key]: parseInt(e.target.value) }))
                      }
                      onMouseUp={e =>
                        update(m.key, { weight: parseInt(e.target.value) })
                      }
                      onTouchEnd={e =>
                        update(m.key, { weight: parseInt(e.currentTarget.value) })
                      }
                      disabled={!m.enabled}
                      className="flex-1 h-0.5 accent-orange-500 cursor-pointer min-w-0"
                    />

                    {/* Weight + pct — show draft value while dragging */}
                    <div className="flex items-center gap-1 shrink-0 w-16 justify-end">
                      <span className="text-[11px] text-blue-400 tabular-nums font-bold">
                        {draftWeights[m.key] ?? m.weight}pt
                      </span>
                      <span className="text-[9px] text-gray-700 tabular-nums">
                        {totalWeight > 0
                          ? `${Math.round(((draftWeights[m.key] ?? m.weight) / totalWeight) * 100)}%`
                          : '0%'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT — direction + description */}
                  <div className="flex items-center gap-2.5 px-4 py-2 border-l border-gray-900">
                    {/* Direction toggle */}
                    <button
                      onClick={() => update(m.key, { lowerIsBetter: !m.lowerIsBetter })}
                      title="Click to flip direction"
                      className={`flex items-center gap-0.5 shrink-0 text-[9px] font-bold uppercase tracking-wide transition-colors hover:opacity-80 w-20 ${
                        m.lowerIsBetter ? 'text-emerald-500' : 'text-purple-400'
                      }`}
                    >
                      {m.lowerIsBetter
                        ? <><ArrowDown size={9} /><span>lower ↗</span></>
                        : <><ArrowUp   size={9} /><span>higher ↗</span></>
                      }
                    </button>

                    {/* Description */}
                    <span className="text-[10px] text-gray-600 leading-snug flex-1 min-w-0">{m.desc}</span>

                    {/* Remove button (extras only) */}
                    {!isDefault && (
                      <button
                        onClick={() => remove(m.key)}
                        className="text-gray-700 hover:text-red-400 transition-colors shrink-0 ml-1"
                        title="Remove"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add metric + distribution footer */}
          <div className="px-3 py-2.5 flex items-center gap-3 border-t border-gray-900/60 bg-gray-900/20">
            {/* Add buttons */}
            {available.length > 0 && (
              <div className="flex flex-wrap gap-1.5 flex-1">
                <span className="text-[9px] text-gray-700 uppercase tracking-wider self-center shrink-0">Add:</span>
                {available.map(m => (
                  <button
                    key={m.key}
                    onClick={() => addMetric(m)}
                    title={m.desc}
                    className={`flex items-center gap-1 px-2 py-0.5 border border-gray-800 hover:border-gray-600 text-[9px] transition-colors ${GROUP_COLORS[m.group] ?? 'text-gray-500'} hover:bg-gray-900`}
                  >
                    <Plus size={8} />
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {/* Distribution bar */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-1.5 w-48 overflow-hidden border border-gray-800">
                {metrics.filter(m => m.enabled && (draftWeights[m.key] ?? m.weight) > 0).map((m, i) => (
                  <div
                    key={m.key}
                    style={{
                      width: `${((draftWeights[m.key] ?? m.weight) / totalWeight) * 100}%`,
                      backgroundColor: `hsl(${(i * 47) % 360}, 55%, 45%)`,
                    }}
                    title={`${m.label}: ${Math.round(((draftWeights[m.key] ?? m.weight) / totalWeight) * 100)}%`}
                  />
                ))}
              </div>
              <span className="text-[9px] text-gray-700 tabular-nums">{totalWeight}pts</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
