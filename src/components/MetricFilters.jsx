import { useState } from 'react'
import { Plus, X, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react'

export const FILTER_METRICS = [
  { key: 'price',           label: 'Price',            unit: '$',   hint: 'e.g. 50'    },
  { key: 'marketCap',       label: 'Market Cap',       unit: '$B',  hint: 'e.g. 20',  scale: 1e9 },
  { key: 'valueScore',      label: 'Value Score',      unit: '',    hint: '0–100'      },
  { key: 'peRatio',         label: 'P/E Ratio',        unit: '',    hint: 'e.g. 20'    },
  { key: 'forwardPE',       label: 'Forward P/E',      unit: '',    hint: 'e.g. 18'    },
  { key: 'pFcf',            label: 'P/FCF',            unit: '',    hint: 'e.g. 25'    },
  { key: 'pbRatio',         label: 'P/B Ratio',        unit: '',    hint: 'e.g. 1'     },
  { key: 'psRatio',         label: 'P/S Ratio',        unit: '',    hint: 'e.g. 3'     },
  { key: 'evEbitda',        label: 'EV/EBITDA',        unit: '',    hint: 'e.g. 12'    },
  { key: 'evRevenue',       label: 'EV/Revenue',       unit: '',    hint: 'e.g. 4'     },
  { key: 'grossMargin',     label: 'Gross Margin',     unit: '%',   hint: 'e.g. 50',  pct: true },
  { key: 'operatingMargin', label: 'Op Margin',        unit: '%',   hint: 'e.g. 15',  pct: true },
  { key: 'fcfMargin',       label: 'FCF Margin',       unit: '%',   hint: 'e.g. 10',  pct: true },
  { key: 'revenueGrowth',   label: 'Revenue Growth',   unit: '%',   hint: 'e.g. 10',  pct: true },
  { key: 'earningsGrowth',  label: 'EPS Growth',       unit: '%',   hint: 'e.g. 10',  pct: true },
  { key: 'ruleOf40',        label: 'Rule of 40',       unit: '',    hint: 'e.g. 40'    },
  { key: 'roe',             label: 'ROE',              unit: '%',   hint: 'e.g. 15',  pct: true },
  { key: 'debtEquity',      label: 'Debt / Equity',    unit: '',    hint: 'e.g. 1'     },
  { key: 'currentRatio',    label: 'Current Ratio',    unit: '',    hint: 'e.g. 1.5'   },
  { key: 'netDebtEbitda',   label: 'Net Debt/EBITDA',  unit: '',    hint: 'e.g. 2'     },
  { key: 'dividendYield',   label: 'Dividend Yield',   unit: '%',   hint: 'e.g. 2',   pct: true },
  { key: 'rsi',             label: 'RSI',              unit: '',    hint: '0–100'      },
  { key: 'return1m',        label: '1M Return',        unit: '%',   hint: 'e.g. 5'     },
  { key: 'return3m',        label: '3M Return',        unit: '%',   hint: 'e.g. 10'    },
  { key: 'return6m',        label: '6M Return',        unit: '%',   hint: 'e.g. 15'    },
  { key: 'return1y',        label: '1Y Return',        unit: '%',   hint: 'e.g. 20'    },
]

const CONDITIONS = [
  { value: '<',  label: '< less than'         },
  { value: '<=', label: '≤ at most'            },
  { value: '>',  label: '> greater than'       },
  { value: '>=', label: '≥ at least'           },
]

let _id = 0
function newRow() {
  return { id: ++_id, metric: 'pbRatio', condition: '<', value: '' }
}

// Apply metric filters to a stocks array — exported so App.jsx can use it
export function applyMetricFilters(stocks, filters) {
  const active = filters.filter(f => f.value !== '' && !isNaN(parseFloat(f.value)))
  if (!active.length) return stocks

  return stocks.filter(stock => {
    for (const f of active) {
      const meta      = FILTER_METRICS.find(m => m.key === f.metric)
      if (!meta) continue

      let val = stock[f.metric]
      if (val == null || isNaN(val)) return false  // exclude stocks missing this metric

      // Normalise to the same units the user types in
      if (meta.pct)   val = val * 100      // 0.25 → 25
      if (meta.scale) val = val / meta.scale  // raw dollars → billions for marketCap

      const threshold = parseFloat(f.value)
      if (f.condition === '<'  && !(val <  threshold)) return false
      if (f.condition === '<=' && !(val <= threshold)) return false
      if (f.condition === '>'  && !(val >  threshold)) return false
      if (f.condition === '>=' && !(val >= threshold)) return false
    }
    return true
  })
}

export default function MetricFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false)
  const active = filters.filter(f => f.value !== '').length

  function add() {
    onChange([...filters, newRow()])
    setOpen(true)
  }

  function remove(id) {
    onChange(filters.filter(f => f.id !== id))
  }

  function update(id, patch) {
    onChange(filters.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function clearAll() {
    onChange([])
  }

  return (
    <div className="border border-gray-800 bg-gray-900/20">
      {/* Toggle bar */}
      <div className="flex items-center gap-3 px-3 py-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
        >
          <SlidersHorizontal size={11} className={active ? 'text-blue-400' : ''} />
          <span className="uppercase tracking-wider">Metric Filters</span>
          {active > 0 && (
            <span className="px-1.5 py-0.5 bg-blue-500/20 border border-blue-500/40 text-blue-400 text-[10px] font-bold">
              {active} active
            </span>
          )}
          {open ? <ChevronUp size={11} className="text-gray-600" /> : <ChevronDown size={11} className="text-gray-600" />}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {active > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors uppercase tracking-wider"
            >
              Clear all
            </button>
          )}
          <button
            onClick={add}
            className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium border border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors uppercase tracking-wider"
          >
            <Plus size={10} /> Add filter
          </button>
        </div>
      </div>

      {/* Filter rows */}
      {open && filters.length > 0 && (
        <div className="border-t border-gray-800 px-3 py-2.5 space-y-2">
          {filters.map(f => {
            const meta = FILTER_METRICS.find(m => m.key === f.metric)
            return (
              <div key={f.id} className="flex items-center gap-2">
                {/* Metric */}
                <select
                  value={f.metric}
                  onChange={e => update(f.id, { metric: e.target.value })}
                  className="bg-gray-900 border border-gray-700 text-gray-200 text-[11px] px-2 py-1.5 focus:outline-none focus:border-blue-500 w-40"
                >
                  {FILTER_METRICS.map(m => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>

                {/* Condition */}
                <select
                  value={f.condition}
                  onChange={e => update(f.id, { condition: e.target.value })}
                  className="bg-gray-900 border border-gray-700 text-gray-200 text-[11px] px-2 py-1.5 focus:outline-none focus:border-blue-500 w-32"
                >
                  {CONDITIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>

                {/* Value */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={f.value}
                    onChange={e => update(f.id, { value: e.target.value })}
                    placeholder={meta?.hint ?? ''}
                    step="any"
                    className="bg-gray-900 border border-gray-700 text-gray-200 text-[11px] px-2 py-1.5 focus:outline-none focus:border-blue-500 w-24 tabular-nums"
                  />
                  {meta?.unit && (
                    <span className="text-[10px] text-gray-600">{meta.unit}</span>
                  )}
                </div>

                {/* Active badge */}
                {f.value !== '' && !isNaN(parseFloat(f.value)) && (
                  <span className="text-[10px] text-emerald-600 uppercase tracking-wider">✓</span>
                )}

                {/* Remove */}
                <button
                  onClick={() => remove(f.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors ml-1"
                >
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {open && filters.length === 0 && (
        <div className="border-t border-gray-800 px-3 py-3 text-[11px] text-gray-700">
          No filters yet — click <strong className="text-gray-500">Add filter</strong> to start screening
        </div>
      )}
    </div>
  )
}
