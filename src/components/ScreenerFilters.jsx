import { useState, useMemo } from 'react'
import { X } from 'lucide-react'

// ── Filter definitions ────────────────────────────────────────────────────────
// Each filter: { key, label, scale?, pct?, options: [{label, test}] }
// test(stockValue) → bool. null test = "Any" (no filter).

function any() { return null }
function lt(n)  { return v => v <  n }
function lte(n) { return v => v <= n }
function gt(n)  { return v => v >  n }
function gte(n) { return v => v >= n }
function between(lo, hi) { return v => v >= lo && v <= hi }

const DESCRIPTIVE = [
  {
    key: 'sector', label: 'Sector', dynamic: true,
    options: [{ label: 'Any', test: null }],
  },
  {
    key: 'marketCap', label: 'Market Cap', scale: 1e9,
    options: [
      { label: 'Any',               test: null },
      { label: 'Mega  (>$200B)',    test: gt(200)         },
      { label: 'Large ($10B–$200B)',test: between(10,200) },
      { label: 'Mid   ($2B–$10B)',  test: between(2,10)   },
      { label: 'Small (<$2B)',      test: lt(2)           },
      { label: 'Over $1B',          test: gt(1)           },
      { label: 'Over $5B',          test: gt(5)           },
      { label: 'Over $10B',         test: gt(10)          },
      { label: 'Over $20B',         test: gt(20)          },
      { label: 'Over $50B',         test: gt(50)          },
      { label: 'Over $100B',        test: gt(100)         },
      { label: 'Under $1B',         test: lt(1)           },
      { label: 'Under $2B',         test: lt(2)           },
      { label: 'Under $5B',         test: lt(5)           },
      { label: 'Under $10B',        test: lt(10)          },
    ],
  },
  {
    key: 'price', label: 'Price',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under $5',  test: lt(5)    },
      { label: 'Under $10', test: lt(10)   },
      { label: 'Under $20', test: lt(20)   },
      { label: 'Under $50', test: lt(50)   },
      { label: 'Over $10',  test: gt(10)   },
      { label: 'Over $20',  test: gt(20)   },
      { label: 'Over $50',  test: gt(50)   },
      { label: 'Over $100', test: gt(100)  },
      { label: 'Over $200', test: gt(200)  },
    ],
  },
  {
    key: 'dividendYield', label: 'Dividend Yield', pct: true,
    options: [
      { label: 'Any',        test: null      },
      { label: 'None (0%)',  test: v => v === 0 || v == null },
      { label: 'Positive',   test: gt(0)     },
      { label: 'Over 1%',    test: gt(1)     },
      { label: 'Over 2%',    test: gt(2)     },
      { label: 'Over 3%',    test: gt(3)     },
      { label: 'Over 4%',    test: gt(4)     },
      { label: 'Over 5%',    test: gt(5)     },
      { label: 'Over 6%',    test: gt(6)     },
      { label: 'High (>8%)', test: gt(8)     },
    ],
  },
  {
    key: 'valueScore', label: 'Value Score',
    options: [
      { label: 'Any',             test: null    },
      { label: 'Strong (≥75)',    test: gte(75) },
      { label: 'Moderate (≥55)', test: gte(55)  },
      { label: 'Over 50',        test: gt(50)   },
      { label: 'Over 60',        test: gt(60)   },
      { label: 'Over 70',        test: gt(70)   },
      { label: 'Under 30',       test: lt(30)   },
      { label: 'Under 40',       test: lt(40)   },
      { label: 'Under 50',       test: lt(50)   },
    ],
  },
]

const FUNDAMENTAL = [
  {
    key: 'peRatio', label: 'P/E Ratio',
    options: [
      { label: 'Any',        test: null     },
      { label: 'Profitable', test: gt(0)    },
      { label: 'Low (<15)',  test: v => v > 0 && v < 15 },
      { label: 'Under 5',   test: v => v > 0 && v < 5  },
      { label: 'Under 10',  test: v => v > 0 && v < 10 },
      { label: 'Under 15',  test: v => v > 0 && v < 15 },
      { label: 'Under 20',  test: v => v > 0 && v < 20 },
      { label: 'Under 25',  test: v => v > 0 && v < 25 },
      { label: 'Under 30',  test: v => v > 0 && v < 30 },
      { label: 'Under 40',  test: v => v > 0 && v < 40 },
      { label: 'Over 10',   test: gt(10)   },
      { label: 'Over 20',   test: gt(20)   },
      { label: 'Over 30',   test: gt(30)   },
      { label: 'Over 50',   test: gt(50)   },
      { label: 'High (>50)',test: gt(50)   },
    ],
  },
  {
    key: 'forwardPE', label: 'Forward P/E',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under 10',  test: v => v > 0 && v < 10  },
      { label: 'Under 15',  test: v => v > 0 && v < 15  },
      { label: 'Under 20',  test: v => v > 0 && v < 20  },
      { label: 'Under 25',  test: v => v > 0 && v < 25  },
      { label: 'Under 30',  test: v => v > 0 && v < 30  },
      { label: 'Over 15',   test: gt(15)   },
      { label: 'Over 20',   test: gt(20)   },
      { label: 'Over 30',   test: gt(30)   },
    ],
  },
  {
    key: 'pFcf', label: 'P/FCF',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under 10',  test: v => v > 0 && v < 10  },
      { label: 'Under 15',  test: v => v > 0 && v < 15  },
      { label: 'Under 20',  test: v => v > 0 && v < 20  },
      { label: 'Under 25',  test: v => v > 0 && v < 25  },
      { label: 'Under 30',  test: v => v > 0 && v < 30  },
      { label: 'Over 20',   test: gt(20)   },
      { label: 'Over 30',   test: gt(30)   },
      { label: 'Over 50',   test: gt(50)   },
    ],
  },
  {
    key: 'pbRatio', label: 'P/B Ratio',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under 1',   test: v => v > 0 && v < 1   },
      { label: 'Under 2',   test: v => v > 0 && v < 2   },
      { label: 'Under 3',   test: v => v > 0 && v < 3   },
      { label: 'Under 5',   test: v => v > 0 && v < 5   },
      { label: 'Over 2',    test: gt(2)    },
      { label: 'Over 5',    test: gt(5)    },
      { label: 'Over 10',   test: gt(10)   },
    ],
  },
  {
    key: 'psRatio', label: 'P/S Ratio',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under 1',   test: v => v > 0 && v < 1   },
      { label: 'Under 2',   test: v => v > 0 && v < 2   },
      { label: 'Under 3',   test: v => v > 0 && v < 3   },
      { label: 'Under 5',   test: v => v > 0 && v < 5   },
      { label: 'Over 2',    test: gt(2)    },
      { label: 'Over 5',    test: gt(5)    },
      { label: 'Over 10',   test: gt(10)   },
    ],
  },
  {
    key: 'evEbitda', label: 'EV/EBITDA',
    options: [
      { label: 'Any',       test: null     },
      { label: 'Under 5',   test: v => v > 0 && v < 5   },
      { label: 'Under 8',   test: v => v > 0 && v < 8   },
      { label: 'Under 10',  test: v => v > 0 && v < 10  },
      { label: 'Under 15',  test: v => v > 0 && v < 15  },
      { label: 'Under 20',  test: v => v > 0 && v < 20  },
      { label: 'Over 10',   test: gt(10)   },
      { label: 'Over 15',   test: gt(15)   },
      { label: 'Over 25',   test: gt(25)   },
    ],
  },
  {
    key: 'grossMargin', label: 'Gross Margin', pct: true,
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 30%',   test: gt(30)  },
      { label: 'Over 40%',   test: gt(40)  },
      { label: 'Over 50%',   test: gt(50)  },
      { label: 'Over 60%',   test: gt(60)  },
      { label: 'Over 70%',   test: gt(70)  },
      { label: 'Over 80%',   test: gt(80)  },
      { label: 'Under 20%',  test: lt(20)  },
      { label: 'Under 10%',  test: lt(10)  },
    ],
  },
  {
    key: 'fcfMargin', label: 'FCF Margin', pct: true,
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 5%',    test: gt(5)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 15%',   test: gt(15)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 25%',   test: gt(25)  },
      { label: 'Over 30%',   test: gt(30)  },
      { label: 'Negative',   test: lt(0)   },
    ],
  },
  {
    key: 'operatingMargin', label: 'Op. Margin', pct: true,
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 5%',    test: gt(5)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 15%',   test: gt(15)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 25%',   test: gt(25)  },
      { label: 'Negative',   test: lt(0)   },
    ],
  },
  {
    key: 'revenueGrowth', label: 'Revenue Growth', pct: true,
    options: [
      { label: 'Any',          test: null    },
      { label: 'Positive',     test: gt(0)   },
      { label: 'Over 5%',      test: gt(5)   },
      { label: 'Over 10%',     test: gt(10)  },
      { label: 'Over 15%',     test: gt(15)  },
      { label: 'Over 20%',     test: gt(20)  },
      { label: 'Over 30%',     test: gt(30)  },
      { label: 'Over 50%',     test: gt(50)  },
      { label: 'Negative',     test: lt(0)   },
      { label: 'Under -10%',   test: lt(-10) },
    ],
  },
  {
    key: 'earningsGrowth', label: 'EPS Growth', pct: true,
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 30%',   test: gt(30)  },
      { label: 'Over 50%',   test: gt(50)  },
      { label: 'Negative',   test: lt(0)   },
    ],
  },
  {
    key: 'roe', label: 'ROE', pct: true,
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 15%',   test: gt(15)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 30%',   test: gt(30)  },
      { label: 'Negative',   test: lt(0)   },
    ],
  },
  {
    key: 'debtEquity', label: 'Debt / Equity',
    options: [
      { label: 'Any',       test: null     },
      { label: 'None (0)',  test: v => v === 0 },
      { label: 'Under 0.5',test: v => v >= 0 && v < 0.5 },
      { label: 'Under 1',  test: v => v >= 0 && v < 1   },
      { label: 'Under 2',  test: v => v >= 0 && v < 2   },
      { label: 'Over 0.5', test: gt(0.5)  },
      { label: 'Over 1',   test: gt(1)    },
      { label: 'Over 2',   test: gt(2)    },
    ],
  },
  {
    key: 'netDebtEbitda', label: 'Net Debt/EBITDA',
    options: [
      { label: 'Any',          test: null     },
      { label: 'Net Cash (<0)',test: lt(0)    },
      { label: 'Under 1x',    test: lt(1)    },
      { label: 'Under 2x',    test: lt(2)    },
      { label: 'Under 3x',    test: lt(3)    },
      { label: 'Over 2x',     test: gt(2)    },
      { label: 'Over 3x',     test: gt(3)    },
      { label: 'Over 4x',     test: gt(4)    },
    ],
  },
]

const TECHNICAL = [
  {
    key: 'rsi', label: 'RSI',
    options: [
      { label: 'Any',               test: null              },
      { label: 'Oversold (<30)',    test: lt(30)            },
      { label: 'Oversold (<35)',    test: lt(35)            },
      { label: 'Neutral (35–65)',   test: between(35, 65)   },
      { label: 'Overbought (>65)', test: gt(65)             },
      { label: 'Overbought (>70)', test: gt(70)             },
      { label: 'Under 20',          test: lt(20)            },
      { label: 'Under 30',          test: lt(30)            },
      { label: 'Under 40',          test: lt(40)            },
      { label: 'Over 50',           test: gt(50)            },
      { label: 'Over 60',           test: gt(60)            },
      { label: 'Over 70',           test: gt(70)            },
      { label: 'Over 80',           test: gt(80)            },
    ],
  },
  {
    key: 'aboveMa200', label: 'vs 200-Day MA', boolean: true,
    options: [
      { label: 'Any',     test: null                    },
      { label: 'Above',   test: v => v === true          },
      { label: 'Below',   test: v => v === false         },
    ],
  },
  {
    key: 'goldenCross', label: 'Golden Cross', boolean: true,
    options: [
      { label: 'Any',   test: null              },
      { label: 'Yes',   test: v => v === true   },
      { label: 'No',    test: v => v !== true   },
    ],
  },
  {
    key: 'return1m', label: '1M Return',
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 5%',    test: gt(5)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Negative',   test: lt(0)   },
      { label: 'Under -5%',  test: lt(-5)  },
      { label: 'Under -10%', test: lt(-10) },
      { label: 'Under -20%', test: lt(-20) },
    ],
  },
  {
    key: 'return3m', label: '3M Return',
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 30%',   test: gt(30)  },
      { label: 'Negative',   test: lt(0)   },
      { label: 'Under -10%', test: lt(-10) },
      { label: 'Under -20%', test: lt(-20) },
    ],
  },
  {
    key: 'return1y', label: '1Y Return',
    options: [
      { label: 'Any',        test: null    },
      { label: 'Positive',   test: gt(0)   },
      { label: 'Over 10%',   test: gt(10)  },
      { label: 'Over 20%',   test: gt(20)  },
      { label: 'Over 50%',   test: gt(50)  },
      { label: 'Over 100%',  test: gt(100) },
      { label: 'Negative',   test: lt(0)   },
      { label: 'Under -10%', test: lt(-10) },
      { label: 'Under -20%', test: lt(-20) },
      { label: 'Under -30%', test: lt(-30) },
    ],
  },
  {
    key: 'change1d', label: '1D Change',
    options: [
      { label: 'Any',        test: null    },
      { label: 'Up today',   test: gt(0)   },
      { label: 'Over 2%',    test: gt(2)   },
      { label: 'Over 5%',    test: gt(5)   },
      { label: 'Down today', test: lt(0)   },
      { label: 'Under -2%',  test: lt(-2)  },
      { label: 'Under -5%',  test: lt(-5)  },
    ],
  },
]

const TABS = [
  { id: 'descriptive',  label: 'Descriptive',  filters: DESCRIPTIVE  },
  { id: 'fundamental',  label: 'Fundamental',  filters: FUNDAMENTAL  },
  { id: 'technical',    label: 'Technical',    filters: TECHNICAL    },
]

// ── Filter application — exported for App.jsx ─────────────────────────────────

export function applyScreenerFilters(stocks, filterState, sectors) {
  return stocks.filter(stock => {
    for (const [key, selectedLabel] of Object.entries(filterState)) {
      if (!selectedLabel || selectedLabel === 'Any') continue

      // Sector is special (string match)
      if (key === 'sector') {
        if (stock.sector !== selectedLabel) return false
        continue
      }

      const def = [...DESCRIPTIVE, ...FUNDAMENTAL, ...TECHNICAL].find(f => f.key === key)
      if (!def) continue
      const opt = def.options.find(o => o.label === selectedLabel)
      if (!opt || !opt.test) continue

      // Get the stock value, normalise it
      let val = stock[key]
      if (def.boolean) {
        if (!opt.test(val)) return false
        continue
      }
      if (val == null || isNaN(val)) return false
      if (def.pct)   val = val * 100
      if (def.scale) val = val / def.scale
      if (!opt.test(val)) return false
    }
    return true
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

function FilterSelect({ def, value, onChange, sectors }) {
  const isActive = value && value !== 'Any'
  const options  = def.dynamic
    ? [{ label: 'Any', test: null }, ...(sectors || []).map(s => ({ label: s, test: null }))]
    : def.options

  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <label className="text-[11px] font-semibold text-gray-300 uppercase tracking-wide truncate">
        {def.label}
      </label>
      <select
        value={value || 'Any'}
        onChange={e => onChange(def.key, e.target.value)}
        className={`bg-gray-900 border text-[12px] font-medium px-2 py-1.5 focus:outline-none transition-colors cursor-pointer ${
          isActive
            ? 'border-blue-500/60 text-blue-200 bg-blue-500/5'
            : 'border-gray-700 text-gray-200 hover:border-gray-500 hover:text-white'
        }`}
      >
        {options.map(o => (
          <option key={o.label} value={o.label}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

export default function ScreenerFilters({ filterState, onChange, sectors }) {
  const [activeTab, setActiveTab] = useState('descriptive')

  const activeCount = Object.values(filterState).filter(v => v && v !== 'Any').length

  function set(key, value) {
    onChange({ ...filterState, [key]: value })
  }

  function clearAll() {
    onChange({})
  }

  const currentTab = TABS.find(t => t.id === activeTab)

  const activeSummary = useMemo(() => {
    const items = []
    for (const [key, label] of Object.entries(filterState)) {
      if (!label || label === 'Any') continue
      const def = [...DESCRIPTIVE, ...FUNDAMENTAL, ...TECHNICAL].find(f => f.key === key)
      const displayKey = def?.label ?? key
      items.push({ key, displayKey, label })
    }
    return items
  }, [filterState])

  return (
    <div className="border border-gray-800 bg-gray-950">
      {/* Tab row */}
      <div className="flex items-center border-b border-gray-800">
        <div className="flex">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-[12px] font-bold tracking-wide uppercase transition-colors border-b-2 ${
                activeTab === t.id
                  ? 'border-blue-500 text-white bg-gray-900/40'
                  : 'border-transparent text-gray-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeCount > 0 && (
          <div className="ml-auto flex items-center gap-3 px-3">
            <span className="text-[11px] text-blue-300 font-bold">
              {activeCount} filter{activeCount !== 1 ? 's' : ''} active
            </span>
            <button
              onClick={clearAll}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors uppercase tracking-wide"
            >
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Filter grid */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-x-4 gap-y-3">
          {currentTab.filters.map(def => (
            <FilterSelect
              key={def.key}
              def={def}
              value={filterState[def.key]}
              onChange={set}
              sectors={sectors}
            />
          ))}
        </div>
      </div>

      {/* Active filter tags */}
      {activeSummary.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3 border-t border-gray-900 pt-2">
          <span className="text-[11px] text-gray-400 uppercase tracking-wide mr-1">Active:</span>
          {activeSummary.map(({ key, displayKey, label }) => (
            <div
              key={key}
              className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 text-[10px] text-blue-300"
            >
              <span className="text-blue-500">{displayKey}</span>
              <span className="text-gray-500 mx-0.5">·</span>
              <span>{label}</span>
              <button
                onClick={() => set(key, 'Any')}
                className="ml-1 text-blue-500/60 hover:text-red-400 transition-colors"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
