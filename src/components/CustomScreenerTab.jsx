import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, X, Zap, TrendingUp, Globe, DollarSign, BarChart2, SlidersHorizontal } from 'lucide-react'

// ── Preset themes ──────────────────────────────────────────────────────────────
const PRESETS = [
  {
    id: 'deep_value',
    label: 'Deep Value',
    icon: DollarSign,
    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    filters: { maxPE: 15, maxPB: 2, maxPFCF: 20, minValueScore: 50 },
  },
  {
    id: 'ai_tech',
    label: 'AI / Tech Growth',
    icon: Zap,
    color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
    filters: { sectors: ['Technology'], minRevGrowth: 10, minGrossMargin: 40 },
  },
  {
    id: 'global_brands',
    label: 'Global Brands',
    icon: Globe,
    color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    filters: { minMarketCap: 50e9, sectors: ['Consumer Staples', 'Consumer Discretionary', 'Communication Services'] },
  },
  {
    id: 'dividend',
    label: 'Dividend Income',
    icon: TrendingUp,
    color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
    filters: { minDividendYield: 2.5, maxPayoutProxy: 80 },
  },
  {
    id: 'momentum',
    label: 'Momentum',
    icon: BarChart2,
    color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    filters: { aboveMa200: true, minReturn3m: 5, maxRSI: 70, minRSI: 45 },
  },
]

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Industrials', 'Energy', 'Materials',
  'Real Estate', 'Utilities', 'Communication Services',
]

const BLANK = {
  // Value
  maxPE: '', maxForwardPE: '', maxPB: '', maxPFCF: '', maxPSRatio: '', maxEVRevenue: '',
  // Quality
  minFCFMargin: '', minGrossMargin: '', minROE: '', minRuleOf40: '', maxNetDebtEbitda: '',
  // Growth
  minRevGrowth: '', minEarningsGrowth: '',
  // Technical
  minRSI: '', maxRSI: '', aboveMa200: '', goldenCross: '',
  // Income
  minDividendYield: '', maxPayoutProxy: '',
  // Returns
  minReturn1m: '', minReturn3m: '', minReturn6m: '', minReturn1y: '',
  // Size & Score
  minMarketCap: '', maxMarketCap: '', minValueScore: '',
  // Sectors
  sectors: [],
}

function num(v) { const n = parseFloat(v); return isNaN(n) ? null : n }

function applyFilters(stocks, f) {
  return stocks.filter(s => {
    if (f.sectors?.length && !f.sectors.includes(s.sector)) return false
    if (num(f.maxPE)           !== null && (s.peRatio        ?? Infinity) > num(f.maxPE))           return false
    if (num(f.maxForwardPE)    !== null && (s.forwardPE       ?? Infinity) > num(f.maxForwardPE))    return false
    if (num(f.maxPB)           !== null && (s.pbRatio         ?? Infinity) > num(f.maxPB))           return false
    if (num(f.maxPFCF)         !== null && (s.pFcf            ?? Infinity) > num(f.maxPFCF))         return false
    if (num(f.maxPSRatio)      !== null && (s.psRatio         ?? Infinity) > num(f.maxPSRatio))      return false
    if (num(f.maxEVRevenue)    !== null && (s.evRevenue        ?? Infinity) > num(f.maxEVRevenue))    return false
    if (num(f.minFCFMargin)    !== null && (s.fcfMargin        ?? -Infinity) * 100 < num(f.minFCFMargin))   return false
    if (num(f.minGrossMargin)  !== null && (s.grossMargin      ?? -Infinity) * 100 < num(f.minGrossMargin)) return false
    if (num(f.minROE)          !== null && (s.roe              ?? -Infinity) * 100 < num(f.minROE))         return false
    if (num(f.minRuleOf40)     !== null && (s.ruleOf40         ?? -Infinity) < num(f.minRuleOf40))          return false
    if (num(f.maxNetDebtEbitda)!== null && (s.netDebtEbitda    ?? Infinity) > num(f.maxNetDebtEbitda))      return false
    if (num(f.minRevGrowth)    !== null && (s.revenueGrowth    ?? -Infinity) * 100 < num(f.minRevGrowth))   return false
    if (num(f.minEarningsGrowth)!== null && (s.earningsGrowth ?? -Infinity) * 100 < num(f.minEarningsGrowth)) return false
    if (num(f.minRSI)          !== null && (s.rsi              ?? -Infinity) < num(f.minRSI))  return false
    if (num(f.maxRSI)          !== null && (s.rsi              ?? Infinity)  > num(f.maxRSI))  return false
    if (f.aboveMa200 === true  && !s.aboveMa200)  return false
    if (f.aboveMa200 === false &&  s.aboveMa200)  return false
    if (f.goldenCross === true  && !s.goldenCross) return false
    if (num(f.minDividendYield)!== null && (s.dividendYield ?? 0) < num(f.minDividendYield)) return false
    if (num(f.minReturn1m)     !== null && (s.return1m ?? -Infinity) < num(f.minReturn1m))  return false
    if (num(f.minReturn3m)     !== null && (s.return3m ?? -Infinity) < num(f.minReturn3m))  return false
    if (num(f.minReturn6m)     !== null && (s.return6m ?? -Infinity) < num(f.minReturn6m))  return false
    if (num(f.minReturn1y)     !== null && (s.return1y ?? -Infinity) < num(f.minReturn1y))  return false
    if (num(f.minMarketCap)    !== null && (s.marketCap ?? 0) < num(f.minMarketCap) * 1e9)  return false
    if (num(f.maxMarketCap)    !== null && (s.marketCap ?? Infinity) > num(f.maxMarketCap) * 1e9) return false
    if (num(f.minValueScore)   !== null && (s.valueScore ?? 0) < num(f.minValueScore))       return false
    return true
  })
}

function FilterInput({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-600"
      />
    </div>
  )
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="border border-gray-800 rounded">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
      >
        {title}
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t border-gray-800/60 pt-3">{children}</div>}
    </div>
  )
}

function fmt(v, digits = 1) {
  if (v === null || v === undefined) return '—'
  return Number(v).toFixed(digits)
}
function fmtMcap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}
function pct(v) { return v !== null && v !== undefined ? `${v > 0 ? '+' : ''}${fmt(v)}%` : '—' }

const SORT_COLS = [
  { id: 'valueScore', label: 'Score' },
  { id: 'marketCap',  label: 'Mkt Cap' },
  { id: 'peRatio',    label: 'P/E' },
  { id: 'pbRatio',    label: 'P/B' },
  { id: 'pFcf',       label: 'P/FCF' },
  { id: 'return1y',   label: '1Y Ret' },
  { id: 'dividendYield', label: 'Yield' },
]

export default function CustomScreenerTab({ stocks, benchmark, onSendToBacktest }) {
  const [filters, setFilters]         = useState({ ...BLANK })
  const [openSections, setOpenSections] = useState({ value: true, quality: false, growth: false, technical: false, income: false, returns: false, size: false })
  const [sortCol, setSortCol]         = useState('valueScore')
  const [sortDir, setSortDir]         = useState('desc')
  const [activePreset, setActivePreset] = useState(null)

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const toggleSection = key => setOpenSections(s => ({ ...s, [key]: !s[key] }))

  const applyPreset = preset => {
    if (activePreset === preset.id) {
      setFilters({ ...BLANK })
      setActivePreset(null)
    } else {
      setFilters({ ...BLANK, ...preset.filters })
      setActivePreset(preset.id)
    }
  }

  const clearAll = () => { setFilters({ ...BLANK }); setActivePreset(null) }

  const toggleSector = s => {
    setFilters(f => {
      const curr = f.sectors || []
      return { ...f, sectors: curr.includes(s) ? curr.filter(x => x !== s) : [...curr, s] }
    })
    setActivePreset(null)
  }

  const results = useMemo(() => {
    const filtered = applyFilters(stocks, filters)
    return filtered.sort((a, b) => {
      const av = a[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const bv = b[sortCol] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? bv - av : av - bv
    })
  }, [stocks, filters, sortCol, sortDir])

  const hasFilters = Object.entries(filters).some(([k, v]) =>
    k === 'sectors' ? v.length > 0 : v !== '' && v !== null
  )

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  return (
    <div className="flex gap-6">
      {/* ── Sidebar filters ── */}
      <div className="w-72 shrink-0 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <SlidersHorizontal size={15} />
            Custom Screener
          </div>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* Preset themes */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Quick Themes</p>
          <div className="space-y-1.5">
            {PRESETS.map(p => {
              const Icon = p.icon
              return (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded border text-xs font-medium transition-colors ${
                    activePreset === p.id ? p.color : 'border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
                  }`}
                >
                  <Icon size={12} />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sector multi-select */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Sectors</p>
          <div className="flex flex-wrap gap-1">
            {SECTORS.map(s => (
              <button
                key={s}
                onClick={() => toggleSector(s)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                  filters.sectors?.includes(s)
                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                    : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Filter sections */}
        <Section title="Value Multiples" open={openSections.value} onToggle={() => toggleSection('value')}>
          <FilterInput label="Max P/E"         value={filters.maxPE}        onChange={v => set('maxPE', v)}        placeholder="e.g. 20" />
          <FilterInput label="Max Fwd P/E"     value={filters.maxForwardPE} onChange={v => set('maxForwardPE', v)} placeholder="e.g. 18" />
          <FilterInput label="Max P/B"         value={filters.maxPB}        onChange={v => set('maxPB', v)}        placeholder="e.g. 3" />
          <FilterInput label="Max P/FCF"       value={filters.maxPFCF}      onChange={v => set('maxPFCF', v)}      placeholder="e.g. 25" />
          <FilterInput label="Max P/S"         value={filters.maxPSRatio}   onChange={v => set('maxPSRatio', v)}   placeholder="e.g. 5" />
          <FilterInput label="Max EV/Revenue"  value={filters.maxEVRevenue} onChange={v => set('maxEVRevenue', v)} placeholder="e.g. 4" />
        </Section>

        <Section title="Quality & Profitability" open={openSections.quality} onToggle={() => toggleSection('quality')}>
          <FilterInput label="Min FCF Margin %" value={filters.minFCFMargin}    onChange={v => set('minFCFMargin', v)}    placeholder="e.g. 10" />
          <FilterInput label="Min Gross Margin %" value={filters.minGrossMargin} onChange={v => set('minGrossMargin', v)} placeholder="e.g. 40" />
          <FilterInput label="Min ROE %"        value={filters.minROE}         onChange={v => set('minROE', v)}         placeholder="e.g. 15" />
          <FilterInput label="Min Rule of 40"   value={filters.minRuleOf40}    onChange={v => set('minRuleOf40', v)}    placeholder="e.g. 40" />
          <FilterInput label="Max Net Debt/EBITDA" value={filters.maxNetDebtEbitda} onChange={v => set('maxNetDebtEbitda', v)} placeholder="e.g. 3" />
        </Section>

        <Section title="Growth" open={openSections.growth} onToggle={() => toggleSection('growth')}>
          <FilterInput label="Min Rev Growth %"      value={filters.minRevGrowth}       onChange={v => set('minRevGrowth', v)}      placeholder="e.g. 10" />
          <FilterInput label="Min Earnings Growth %" value={filters.minEarningsGrowth}  onChange={v => set('minEarningsGrowth', v)} placeholder="e.g. 5" />
        </Section>

        <Section title="Technical" open={openSections.technical} onToggle={() => toggleSection('technical')}>
          <FilterInput label="Min RSI" value={filters.minRSI} onChange={v => set('minRSI', v)} placeholder="e.g. 40" />
          <FilterInput label="Max RSI" value={filters.maxRSI} onChange={v => set('maxRSI', v)} placeholder="e.g. 70" />
          <div className="col-span-2 space-y-2">
            <label className="block text-[11px] text-gray-500">Price vs 200-day MA</label>
            <div className="flex gap-2">
              {[['', 'Any'], [true, 'Above'], [false, 'Below']].map(([val, lbl]) => (
                <button
                  key={lbl}
                  onClick={() => set('aboveMa200', val)}
                  className={`flex-1 py-1 rounded text-xs border transition-colors ${
                    filters.aboveMa200 === val
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <label className="block text-[11px] text-gray-500">Golden Cross (50MA &gt; 200MA)</label>
            <div className="flex gap-2">
              {[['', 'Any'], [true, 'Yes']].map(([val, lbl]) => (
                <button
                  key={lbl}
                  onClick={() => set('goldenCross', val)}
                  className={`flex-1 py-1 rounded text-xs border transition-colors ${
                    filters.goldenCross === val
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Income" open={openSections.income} onToggle={() => toggleSection('income')}>
          <FilterInput label="Min Dividend Yield %" value={filters.minDividendYield} onChange={v => set('minDividendYield', v)} placeholder="e.g. 2" />
        </Section>

        <Section title="Price Returns" open={openSections.returns} onToggle={() => toggleSection('returns')}>
          <FilterInput label="Min 1M Return %" value={filters.minReturn1m} onChange={v => set('minReturn1m', v)} placeholder="e.g. 5" />
          <FilterInput label="Min 3M Return %" value={filters.minReturn3m} onChange={v => set('minReturn3m', v)} placeholder="e.g. 5" />
          <FilterInput label="Min 6M Return %" value={filters.minReturn6m} onChange={v => set('minReturn6m', v)} placeholder="e.g. 5" />
          <FilterInput label="Min 1Y Return %" value={filters.minReturn1y} onChange={v => set('minReturn1y', v)} placeholder="e.g. 10" />
        </Section>

        <Section title="Size & Score" open={openSections.size} onToggle={() => toggleSection('size')}>
          <FilterInput label="Min Mkt Cap ($B)" value={filters.minMarketCap} onChange={v => set('minMarketCap', v)} placeholder="e.g. 1" />
          <FilterInput label="Max Mkt Cap ($B)" value={filters.maxMarketCap} onChange={v => set('maxMarketCap', v)} placeholder="e.g. 100" />
          <FilterInput label="Min Value Score"  value={filters.minValueScore} onChange={v => set('minValueScore', v)} placeholder="e.g. 50" />
        </Section>

        {/* Backtest CTA */}
        {results.length > 0 && (
          <button
            onClick={() => onSendToBacktest({ filters, results })}
            className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
          >
            Backtest This Screen ({results.length} stocks) →
          </button>
        )}
      </div>

      {/* ── Results ── */}
      <div className="flex-1 min-w-0">
        {/* Result header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-gray-500 text-sm">
            {hasFilters
              ? <><span className="text-white font-semibold">{results.length}</span> stocks match your screen</>
              : <span className="text-gray-600">Set filters to screen stocks, or pick a theme →</span>
            }
          </span>
          {results.length > 0 && (
            <div className="flex gap-1">
              {SORT_COLS.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSort(c.id)}
                  className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                    sortCol === c.id
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {c.label}{sortCol === c.id ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {!hasFilters && (
          <div className="py-24 text-center text-gray-700 text-sm">
            Choose a quick theme or configure filters on the left
          </div>
        )}

        {hasFilters && results.length === 0 && (
          <div className="py-24 text-center text-gray-600 text-sm">
            No stocks match — try relaxing some filters
          </div>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-600 text-left">
                  <th className="pb-2 pr-3 font-medium">Ticker</th>
                  <th className="pb-2 pr-3 font-medium">Name</th>
                  <th className="pb-2 pr-3 font-medium">Sector</th>
                  <th className="pb-2 pr-3 font-medium text-right">Score</th>
                  <th className="pb-2 pr-3 font-medium text-right">Mkt Cap</th>
                  <th className="pb-2 pr-3 font-medium text-right">P/E</th>
                  <th className="pb-2 pr-3 font-medium text-right">P/B</th>
                  <th className="pb-2 pr-3 font-medium text-right">P/FCF</th>
                  <th className="pb-2 pr-3 font-medium text-right">FCF%</th>
                  <th className="pb-2 pr-3 font-medium text-right">Rev G</th>
                  <th className="pb-2 pr-3 font-medium text-right">RSI</th>
                  <th className="pb-2 pr-3 font-medium text-right">1Y Ret</th>
                  <th className="pb-2 font-medium text-right">Yield</th>
                </tr>
              </thead>
              <tbody>
                {results.map(s => (
                  <tr key={s.symbol} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors">
                    <td className="py-2 pr-3 font-bold text-white">{s.symbol}</td>
                    <td className="py-2 pr-3 text-gray-400 max-w-[160px] truncate">{s.name}</td>
                    <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">{s.sector}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={`font-semibold ${
                        (s.valueScore ?? 0) >= 70 ? 'text-emerald-400' :
                        (s.valueScore ?? 0) >= 50 ? 'text-yellow-400' : 'text-gray-500'
                      }`}>{s.valueScore ?? '—'}</span>
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-400">{fmtMcap(s.marketCap)}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{fmt(s.peRatio)}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{fmt(s.pbRatio)}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{fmt(s.pFcf)}</td>
                    <td className="py-2 pr-3 text-right text-gray-400">{s.fcfMargin !== null && s.fcfMargin !== undefined ? `${(s.fcfMargin * 100).toFixed(1)}%` : '—'}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={s.revenueGrowth >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                        {s.revenueGrowth !== null && s.revenueGrowth !== undefined ? pct(s.revenueGrowth * 100) : '—'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-400">{fmt(s.rsi)}</td>
                    <td className="py-2 pr-3 text-right">
                      <span className={(s.return1y ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-400'}>
                        {pct(s.return1y)}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-400">{s.dividendYield ? `${s.dividendYield.toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
