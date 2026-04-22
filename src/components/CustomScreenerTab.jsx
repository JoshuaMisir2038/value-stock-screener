import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, X, Zap, TrendingUp, Globe, DollarSign, BarChart2,
  SlidersHorizontal, Shield, Flame, Leaf, Building2, Cpu, Heart, Battery, ShoppingCart,
  Factory, Coins, LineChart, Target, Award, Layers } from 'lucide-react'

// ── Preset themes ──────────────────────────────────────────────────────────────
const PRESET_GROUPS = [
  {
    label: 'Value / Contrarian',
    presets: [
      {
        id: 'deep_value',
        label: 'Deep Value',
        icon: DollarSign,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { maxPE: 15, maxPB: 2, maxPFCF: 20, minValueScore: 50 },
      },
      {
        id: 'magic_formula',
        label: 'Magic Formula',
        icon: Target,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { minROE: 15, maxEVRevenue: 3, minFCFMargin: 10 },
      },
      {
        id: 'fcf_yield',
        label: 'FCF Yield Play',
        icon: Coins,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { maxPFCF: 15, minFCFMargin: 12 },
      },
      {
        id: 'cheap_financials',
        label: 'Cheap Financials',
        icon: Building2,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { sectors: ['Financials'], maxPB: 1.5, maxPE: 15 },
      },
      {
        id: 'energy_value',
        label: 'Energy Value',
        icon: Battery,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { sectors: ['Energy'], maxPE: 12, maxPFCF: 15 },
      },
      {
        id: 'small_cap_value',
        label: 'Small Cap Value',
        icon: DollarSign,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { maxMarketCap: 5, maxPB: 2, maxPFCF: 20 },
      },
      {
        id: 'beaten_down_tech',
        label: 'Beaten Down Tech',
        icon: Cpu,
        color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
        filters: { sectors: ['Technology'], aboveMa200: false, maxRSI: 45 },
      },
    ],
  },
  {
    label: 'Growth',
    presets: [
      {
        id: 'ai_tech',
        label: 'AI / Tech Growth',
        icon: Zap,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { sectors: ['Technology'], minRevGrowth: 10, minGrossMargin: 40 },
      },
      {
        id: 'high_rule40',
        label: 'High Rule of 40',
        icon: Award,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { minRuleOf40: 40, minGrossMargin: 50 },
      },
      {
        id: 'high_earnings_growth',
        label: 'High Earnings Growth',
        icon: TrendingUp,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { minEarningsGrowth: 20, minRevGrowth: 10 },
      },
      {
        id: 'garp',
        label: 'GARP',
        icon: LineChart,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { maxForwardPE: 25, minRevGrowth: 10, minEarningsGrowth: 10 },
      },
      {
        id: 'mid_cap_growth',
        label: 'Mid Cap Growth',
        icon: BarChart2,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { minMarketCap: 2, maxMarketCap: 20, minRevGrowth: 15 },
      },
      {
        id: 'healthcare_innovation',
        label: 'Healthcare Innovation',
        icon: Heart,
        color: 'text-blue-400 border-blue-500/30 bg-blue-500/10',
        filters: { sectors: ['Healthcare'], minRevGrowth: 10, minGrossMargin: 50 },
      },
    ],
  },
  {
    label: 'Quality / Safety',
    presets: [
      {
        id: 'quality_compounder',
        label: 'Quality Compounder',
        icon: Award,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        filters: { minROE: 15, minGrossMargin: 40, minFCFMargin: 10, maxNetDebtEbitda: 2 },
      },
      {
        id: 'fortress_balance',
        label: 'Fortress Balance Sheet',
        icon: Shield,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        filters: { maxNetDebtEbitda: 0.5, minCurrentRatio: 2, minFCFMargin: 10 },
      },
      {
        id: 'mega_cap_quality',
        label: 'Mega Cap Quality',
        icon: Globe,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        filters: { minMarketCap: 100, minGrossMargin: 40, minFCFMargin: 10 },
      },
      {
        id: 'global_brands',
        label: 'Global Brands',
        icon: Globe,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        filters: { minMarketCap: 50, sectors: ['Consumer Staples', 'Consumer Discretionary', 'Communication Services'] },
      },
      {
        id: 'high_gross_margin',
        label: 'High Gross Margin',
        icon: Layers,
        color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
        filters: { minGrossMargin: 60, minOperatingMargin: 15 },
      },
    ],
  },
  {
    label: 'Income',
    presets: [
      {
        id: 'dividend',
        label: 'Dividend Income',
        icon: Coins,
        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        filters: { minDividendYield: 2.5 },
      },
      {
        id: 'defensive_dividend',
        label: 'Defensive Dividend',
        icon: Shield,
        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        filters: { sectors: ['Consumer Staples', 'Utilities', 'Healthcare'], minDividendYield: 2.5, maxPE: 20 },
      },
      {
        id: 'dividend_growth',
        label: 'Dividend Growth',
        icon: TrendingUp,
        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        filters: { minDividendYield: 1.5, minRevGrowth: 5 },
      },
      {
        id: 'real_assets',
        label: 'Real Assets / REIT',
        icon: Building2,
        color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
        filters: { sectors: ['Real Estate', 'Utilities'], minDividendYield: 3 },
      },
    ],
  },
  {
    label: 'Technical / Momentum',
    presets: [
      {
        id: 'momentum',
        label: 'Momentum',
        icon: Flame,
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        filters: { aboveMa200: true, minReturn3m: 5, maxRSI: 70, minRSI: 45 },
      },
      {
        id: 'golden_cross',
        label: 'Golden Cross',
        icon: TrendingUp,
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        filters: { goldenCross: true, aboveMa200: true, minRSI: 45, maxRSI: 65 },
      },
      {
        id: 'overbought_leaders',
        label: 'Overbought Leaders',
        icon: Flame,
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        filters: { minRSI: 65, aboveMa200: true, minReturn3m: 10 },
      },
      {
        id: 'oversold_bounce',
        label: 'Oversold Bounce',
        icon: LineChart,
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        filters: { maxRSI: 35, minValueScore: 40 },
      },
      {
        id: 'recovery_play',
        label: 'Recovery Play',
        icon: TrendingUp,
        color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
        filters: { aboveMa200: false, minRSI: 40, minReturn1m: 0 },
      },
    ],
  },
  {
    label: 'Sector Themes',
    presets: [
      {
        id: 'ai_infrastructure',
        label: 'AI Infrastructure',
        icon: Cpu,
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
        filters: { sectors: ['Technology', 'Communication Services'], minRevGrowth: 15, minGrossMargin: 55 },
      },
      {
        id: 'consumer_comeback',
        label: 'Consumer Comeback',
        icon: ShoppingCart,
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
        filters: { sectors: ['Consumer Discretionary'], aboveMa200: true, minRevGrowth: 5, maxRSI: 65 },
      },
      {
        id: 'inflation_beneficiaries',
        label: 'Inflation Beneficiaries',
        icon: Factory,
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
        filters: { sectors: ['Energy', 'Materials'], minFCFMargin: 8 },
      },
      {
        id: 'green_energy',
        label: 'Industrials / Clean',
        icon: Leaf,
        color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
        filters: { sectors: ['Industrials', 'Utilities'], minRevGrowth: 5 },
      },
    ],
  },
]

const ALL_PRESETS = PRESET_GROUPS.flatMap(g => g.presets)

const SECTORS = [
  'Technology', 'Healthcare', 'Financials', 'Consumer Discretionary',
  'Consumer Staples', 'Industrials', 'Energy', 'Materials',
  'Real Estate', 'Utilities', 'Communication Services',
]

const BLANK = {
  // Value multiples
  minPE: '', maxPE: '', minForwardPE: '', maxForwardPE: '',
  minPB: '', maxPB: '', minPFCF: '', maxPFCF: '',
  maxPSRatio: '', maxEVRevenue: '', maxEVEbitda: '',
  // Profitability (min-only — screens for high-quality businesses)
  minGrossMargin: '', minOperatingMargin: '', minFCFMargin: '',
  minROE: '', minRuleOf40: '',
  // Leverage / Liquidity
  maxNetDebtEbitda: '', maxDebtEquity: '', minCurrentRatio: '',
  // Growth
  minRevGrowth: '', maxRevGrowth: '', minEarningsGrowth: '', maxEarningsGrowth: '',
  // Technical
  minRSI: '', maxRSI: '', aboveMa200: '', goldenCross: '',
  // Income
  minDividendYield: '',
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
    if (num(f.minPE)            !== null && (s.peRatio         ?? -Infinity) < num(f.minPE))           return false
    if (num(f.maxPE)            !== null && (s.peRatio         ?? Infinity)  > num(f.maxPE))           return false
    if (num(f.minForwardPE)     !== null && (s.forwardPE        ?? -Infinity) < num(f.minForwardPE))    return false
    if (num(f.maxForwardPE)     !== null && (s.forwardPE        ?? Infinity)  > num(f.maxForwardPE))    return false
    if (num(f.minPB)            !== null && (s.pbRatio          ?? -Infinity) < num(f.minPB))           return false
    if (num(f.maxPB)            !== null && (s.pbRatio          ?? Infinity)  > num(f.maxPB))           return false
    if (num(f.minPFCF)          !== null && (s.pFcf             ?? -Infinity) < num(f.minPFCF))         return false
    if (num(f.maxPFCF)          !== null && (s.pFcf             ?? Infinity)  > num(f.maxPFCF))         return false
    if (num(f.maxPSRatio)       !== null && (s.psRatio          ?? Infinity)  > num(f.maxPSRatio))      return false
    if (num(f.maxEVRevenue)     !== null && (s.evRevenue         ?? Infinity)  > num(f.maxEVRevenue))    return false
    if (num(f.maxEVEbitda)      !== null && (s.evEbitda          ?? Infinity)  > num(f.maxEVEbitda))     return false
    if (num(f.minGrossMargin)   !== null && (s.grossMargin       ?? -Infinity) * 100 < num(f.minGrossMargin))   return false
    if (num(f.minOperatingMargin)!==null && (s.operatingMargin  ?? -Infinity) * 100 < num(f.minOperatingMargin)) return false
    if (num(f.minFCFMargin)     !== null && (s.fcfMargin         ?? -Infinity) * 100 < num(f.minFCFMargin))     return false
    if (num(f.minROE)           !== null && (s.roe               ?? -Infinity) * 100 < num(f.minROE))           return false
    if (num(f.minRuleOf40)      !== null && (s.ruleOf40          ?? -Infinity) < num(f.minRuleOf40))            return false
    if (num(f.maxNetDebtEbitda) !== null && (s.netDebtEbitda     ?? Infinity)  > num(f.maxNetDebtEbitda))       return false
    if (num(f.maxDebtEquity)    !== null && (s.debtEquity        ?? Infinity)  > num(f.maxDebtEquity))          return false
    if (num(f.minCurrentRatio)  !== null && (s.currentRatio      ?? -Infinity) < num(f.minCurrentRatio))        return false
    if (num(f.minRevGrowth)     !== null && (s.revenueGrowth     ?? -Infinity) * 100 < num(f.minRevGrowth))     return false
    if (num(f.maxRevGrowth)     !== null && (s.revenueGrowth     ?? Infinity)  * 100 > num(f.maxRevGrowth))     return false
    if (num(f.minEarningsGrowth)!== null && (s.earningsGrowth   ?? -Infinity) * 100 < num(f.minEarningsGrowth)) return false
    if (num(f.maxEarningsGrowth)!== null && (s.earningsGrowth   ?? Infinity)  * 100 > num(f.maxEarningsGrowth)) return false
    if (num(f.minRSI)           !== null && (s.rsi               ?? -Infinity) < num(f.minRSI))  return false
    if (num(f.maxRSI)           !== null && (s.rsi               ?? Infinity)  > num(f.maxRSI))  return false
    if (f.aboveMa200 === true   && !s.aboveMa200)  return false
    if (f.aboveMa200 === false  &&  s.aboveMa200)  return false
    if (f.goldenCross === true   && !s.goldenCross) return false
    if (num(f.minDividendYield) !== null && (s.dividendYield ?? 0) < num(f.minDividendYield)) return false
    if (num(f.minReturn1m)      !== null && (s.return1m ?? -Infinity) < num(f.minReturn1m))  return false
    if (num(f.minReturn3m)      !== null && (s.return3m ?? -Infinity) < num(f.minReturn3m))  return false
    if (num(f.minReturn6m)      !== null && (s.return6m ?? -Infinity) < num(f.minReturn6m))  return false
    if (num(f.minReturn1y)      !== null && (s.return1y ?? -Infinity) < num(f.minReturn1y))  return false
    if (num(f.minMarketCap)     !== null && (s.marketCap ?? 0) < num(f.minMarketCap) * 1e9)  return false
    if (num(f.maxMarketCap)     !== null && (s.marketCap ?? Infinity) > num(f.maxMarketCap) * 1e9) return false
    if (num(f.minValueScore)    !== null && (s.valueScore ?? 0) < num(f.minValueScore))       return false
    return true
  })
}

function FilterInput({ label, value, onChange, placeholder = '', hint }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-700 text-[10px]">{hint}</span>}
      </label>
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

function RangeInputs({ label, minVal, maxVal, onMin, onMax, minPlaceholder, maxPlaceholder, hint }) {
  return (
    <div className="col-span-2">
      <label className="block text-[11px] text-gray-500 mb-1">
        {label}
        {hint && <span className="ml-1 text-gray-700 text-[10px]">{hint}</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          value={minVal}
          onChange={e => onMin(e.target.value)}
          placeholder={minPlaceholder || 'Min'}
          className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-600"
        />
        <input
          type="number"
          value={maxVal}
          onChange={e => onMax(e.target.value)}
          placeholder={maxPlaceholder || 'Max'}
          className="flex-1 bg-gray-900 border border-gray-800 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-gray-600"
        />
      </div>
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
function pctRaw(v) { return v !== null && v !== undefined ? `${(v * 100).toFixed(1)}%` : '—' }
function signColor(v) { return (v ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-400' }

const SORT_COLS = [
  { id: 'valueScore',     label: 'Score' },
  { id: 'marketCap',      label: 'Mkt Cap' },
  { id: 'peRatio',        label: 'P/E' },
  { id: 'pbRatio',        label: 'P/B' },
  { id: 'pFcf',           label: 'P/FCF' },
  { id: 'evEbitda',       label: 'EV/EBITDA' },
  { id: 'grossMargin',    label: 'Gross Mgn' },
  { id: 'operatingMargin',label: 'Op Mgn' },
  { id: 'ruleOf40',       label: 'Rule of 40' },
  { id: 'revenueGrowth',  label: 'Rev G' },
  { id: 'return1y',       label: '1Y Ret' },
  { id: 'dividendYield',  label: 'Yield' },
]

const TABLE_COLS = [
  { key: 'symbol',          label: 'Ticker',      align: 'left',  render: s => <span className="font-bold text-white">{s.symbol}</span> },
  { key: 'name',            label: 'Name',        align: 'left',  render: s => <span className="text-gray-400 max-w-[140px] truncate block">{s.name}</span> },
  { key: 'sector',          label: 'Sector',      align: 'left',  render: s => <span className="text-gray-600 whitespace-nowrap">{s.sector}</span> },
  { key: 'valueScore',      label: 'Score',       align: 'right', render: s => <span className={`font-semibold ${(s.valueScore ?? 0) >= 70 ? 'text-emerald-400' : (s.valueScore ?? 0) >= 50 ? 'text-yellow-400' : 'text-gray-500'}`}>{s.valueScore ?? '—'}</span> },
  { key: 'marketCap',       label: 'Mkt Cap',     align: 'right', render: s => <span className="text-gray-400">{fmtMcap(s.marketCap)}</span> },
  { key: 'peRatio',         label: 'P/E',         align: 'right', render: s => <span className="text-gray-400">{fmt(s.peRatio)}</span> },
  { key: 'forwardPE',       label: 'Fwd P/E',     align: 'right', render: s => <span className="text-gray-400">{fmt(s.forwardPE)}</span> },
  { key: 'pbRatio',         label: 'P/B',         align: 'right', render: s => <span className="text-gray-400">{fmt(s.pbRatio)}</span> },
  { key: 'pFcf',            label: 'P/FCF',       align: 'right', render: s => <span className="text-gray-400">{fmt(s.pFcf)}</span> },
  { key: 'evEbitda',        label: 'EV/EBITDA',   align: 'right', render: s => <span className="text-gray-400">{fmt(s.evEbitda)}</span> },
  { key: 'grossMargin',     label: 'Gross%',      align: 'right', render: s => <span className="text-gray-400">{pctRaw(s.grossMargin)}</span> },
  { key: 'operatingMargin', label: 'Op%',         align: 'right', render: s => <span className={signColor(s.operatingMargin)}>{pctRaw(s.operatingMargin)}</span> },
  { key: 'fcfMargin',       label: 'FCF%',        align: 'right', render: s => <span className={signColor(s.fcfMargin)}>{pctRaw(s.fcfMargin)}</span> },
  { key: 'ruleOf40',        label: 'Ro40',        align: 'right', render: s => <span className={`${(s.ruleOf40 ?? 0) >= 40 ? 'text-emerald-400' : 'text-gray-500'}`}>{fmt(s.ruleOf40)}</span> },
  { key: 'roe',             label: 'ROE%',        align: 'right', render: s => <span className={signColor(s.roe)}>{pctRaw(s.roe)}</span> },
  { key: 'revenueGrowth',   label: 'Rev G',       align: 'right', render: s => <span className={signColor(s.revenueGrowth)}>{pct((s.revenueGrowth ?? null) !== null ? s.revenueGrowth * 100 : null)}</span> },
  { key: 'earningsGrowth',  label: 'EPS G',       align: 'right', render: s => <span className={signColor(s.earningsGrowth)}>{pct((s.earningsGrowth ?? null) !== null ? s.earningsGrowth * 100 : null)}</span> },
  { key: 'netDebtEbitda',   label: 'ND/EBITDA',   align: 'right', render: s => <span className="text-gray-400">{fmt(s.netDebtEbitda)}</span> },
  { key: 'rsi',             label: 'RSI',         align: 'right', render: s => <span className="text-gray-400">{fmt(s.rsi)}</span> },
  { key: 'return1y',        label: '1Y Ret',      align: 'right', render: s => <span className={signColor(s.return1y)}>{pct(s.return1y)}</span> },
  { key: 'dividendYield',   label: 'Yield',       align: 'right', render: s => <span className="text-gray-400">{s.dividendYield ? `${s.dividendYield.toFixed(2)}%` : '—'}</span> },
]

export default function CustomScreenerTab({ stocks, onSendToBacktest }) {
  const [filters, setFilters]           = useState({ ...BLANK })
  const [openSections, setOpenSections] = useState({ value: true, profitability: false, leverage: false, growth: false, technical: false, income: false, returns: false, size: false })
  const [openGroups, setOpenGroups]     = useState({ 'Value / Contrarian': true, 'Growth': false, 'Quality / Safety': false, 'Income': false, 'Technical / Momentum': false, 'Sector Themes': false })
  const [sortCol, setSortCol]           = useState('valueScore')
  const [sortDir, setSortDir]           = useState('desc')
  const [activePreset, setActivePreset] = useState(null)
  const [visibleCols, setVisibleCols]   = useState(['symbol','name','sector','valueScore','marketCap','peRatio','pbRatio','pFcf','evEbitda','grossMargin','operatingMargin','fcfMargin','ruleOf40','revenueGrowth','return1y','dividendYield'])

  const set = (key, val) => setFilters(f => ({ ...f, [key]: val }))
  const toggleSection = key => setOpenSections(s => ({ ...s, [key]: !s[key] }))
  const toggleGroup   = key => setOpenGroups(g => ({ ...g, [key]: !g[key] }))

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
    k === 'sectors' ? v.length > 0 : v !== '' && v !== null && v !== ''
  )

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const toggleCol = key => setVisibleCols(c => c.includes(key) ? c.filter(k => k !== key) : [...c, key])
  const displayCols = TABLE_COLS.filter(c => visibleCols.includes(c.key))

  return (
    <div className="flex gap-5">
      {/* ── Sidebar ── */}
      <div className="w-68 shrink-0 space-y-3" style={{ width: 272 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <SlidersHorizontal size={14} /> Custom Screener
          </div>
          {hasFilters && (
            <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
              <X size={11} /> Clear all
            </button>
          )}
        </div>

        {/* ── Quick themes ── */}
        <div>
          <p className="text-[11px] text-gray-600 uppercase tracking-wider mb-2">Quick Themes</p>
          <div className="space-y-2">
            {PRESET_GROUPS.map(group => (
              <div key={group.label} className="border border-gray-800/60 rounded">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {group.label}
                  {openGroups[group.label] ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {openGroups[group.label] && (
                  <div className="px-2 pb-2 space-y-1 border-t border-gray-800/40">
                    {group.presets.map(p => {
                      const Icon = p.icon
                      return (
                        <button
                          key={p.id}
                          onClick={() => applyPreset(p)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded border text-xs font-medium transition-colors ${
                            activePreset === p.id ? p.color : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-900'
                          }`}
                        >
                          <Icon size={11} />
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sector multi-select ── */}
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

        {/* ── Filter sections ── */}
        <Section title="Value Multiples" open={openSections.value} onToggle={() => toggleSection('value')}>
          <RangeInputs label="P/E Ratio"       minVal={filters.minPE}        maxVal={filters.maxPE}        onMin={v => set('minPE', v)}        onMax={v => set('maxPE', v)}        minPlaceholder="Min" maxPlaceholder="e.g. 20" />
          <RangeInputs label="Fwd P/E"         minVal={filters.minForwardPE} maxVal={filters.maxForwardPE} onMin={v => set('minForwardPE', v)} onMax={v => set('maxForwardPE', v)} minPlaceholder="Min" maxPlaceholder="e.g. 18" />
          <RangeInputs label="P/B Ratio"       minVal={filters.minPB}        maxVal={filters.maxPB}        onMin={v => set('minPB', v)}        onMax={v => set('maxPB', v)}        minPlaceholder="Min" maxPlaceholder="e.g. 3" />
          <RangeInputs label="P/FCF"           minVal={filters.minPFCF}      maxVal={filters.maxPFCF}      onMin={v => set('minPFCF', v)}      onMax={v => set('maxPFCF', v)}      minPlaceholder="Min" maxPlaceholder="e.g. 25" />
          <FilterInput label="Max P/S"         value={filters.maxPSRatio}    onChange={v => set('maxPSRatio', v)}   placeholder="e.g. 5" />
          <FilterInput label="Max EV/Revenue"  value={filters.maxEVRevenue}  onChange={v => set('maxEVRevenue', v)} placeholder="e.g. 4" />
          <FilterInput label="Max EV/EBITDA"   value={filters.maxEVEbitda}   onChange={v => set('maxEVEbitda', v)}  placeholder="e.g. 15" hint="enterprise value" />
        </Section>

        <Section title="Profitability & Margins" open={openSections.profitability} onToggle={() => toggleSection('profitability')}>
          <FilterInput label="Min Gross Margin %"     value={filters.minGrossMargin}     onChange={v => set('minGrossMargin', v)}     placeholder="e.g. 50" hint="e.g. 97% for Visa" />
          <FilterInput label="Min Operating Margin %" value={filters.minOperatingMargin} onChange={v => set('minOperatingMargin', v)} placeholder="e.g. 15" />
          <FilterInput label="Min FCF Margin %"       value={filters.minFCFMargin}       onChange={v => set('minFCFMargin', v)}       placeholder="e.g. 10" />
          <FilterInput label="Min ROE %"              value={filters.minROE}             onChange={v => set('minROE', v)}             placeholder="e.g. 15" />
          <FilterInput label="Min Rule of 40"         value={filters.minRuleOf40}        onChange={v => set('minRuleOf40', v)}        placeholder="e.g. 40" hint="rev growth + FCF%" />
        </Section>

        <Section title="Leverage & Liquidity" open={openSections.leverage} onToggle={() => toggleSection('leverage')}>
          <FilterInput label="Max Net Debt/EBITDA" value={filters.maxNetDebtEbitda}  onChange={v => set('maxNetDebtEbitda', v)}  placeholder="e.g. 3" />
          <FilterInput label="Max Debt/Equity"     value={filters.maxDebtEquity}     onChange={v => set('maxDebtEquity', v)}     placeholder="e.g. 1" />
          <FilterInput label="Min Current Ratio"   value={filters.minCurrentRatio}   onChange={v => set('minCurrentRatio', v)}   placeholder="e.g. 1.5" hint="current assets / liabilities" />
        </Section>

        <Section title="Growth" open={openSections.growth} onToggle={() => toggleSection('growth')}>
          <RangeInputs label="Revenue Growth %"  minVal={filters.minRevGrowth}      maxVal={filters.maxRevGrowth}      onMin={v => set('minRevGrowth', v)}      onMax={v => set('maxRevGrowth', v)}      minPlaceholder="e.g. 10" maxPlaceholder="Max" />
          <RangeInputs label="Earnings Growth %" minVal={filters.minEarningsGrowth} maxVal={filters.maxEarningsGrowth} onMin={v => set('minEarningsGrowth', v)} onMax={v => set('maxEarningsGrowth', v)} minPlaceholder="e.g. 10" maxPlaceholder="Max" />
        </Section>

        <Section title="Technical" open={openSections.technical} onToggle={() => toggleSection('technical')}>
          <RangeInputs label="RSI Range" minVal={filters.minRSI} maxVal={filters.maxRSI} onMin={v => set('minRSI', v)} onMax={v => set('maxRSI', v)} minPlaceholder="e.g. 40" maxPlaceholder="e.g. 70" />
          <div className="col-span-2 space-y-2">
            <label className="block text-[11px] text-gray-500">Price vs 200-day MA</label>
            <div className="flex gap-2">
              {[['', 'Any'], [true, 'Above'], [false, 'Below']].map(([val, lbl]) => (
                <button key={lbl} onClick={() => set('aboveMa200', val)}
                  className={`flex-1 py-1 rounded text-xs border transition-colors ${filters.aboveMa200 === val ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <label className="block text-[11px] text-gray-500">Golden Cross (50MA &gt; 200MA)</label>
            <div className="flex gap-2">
              {[['', 'Any'], [true, 'Yes']].map(([val, lbl]) => (
                <button key={lbl} onClick={() => set('goldenCross', val)}
                  className={`flex-1 py-1 rounded text-xs border transition-colors ${filters.goldenCross === val ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
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
          <FilterInput label="Min 1M Return %"  value={filters.minReturn1m}  onChange={v => set('minReturn1m', v)}  placeholder="e.g. 5" />
          <FilterInput label="Min 3M Return %"  value={filters.minReturn3m}  onChange={v => set('minReturn3m', v)}  placeholder="e.g. 5" />
          <FilterInput label="Min 6M Return %"  value={filters.minReturn6m}  onChange={v => set('minReturn6m', v)}  placeholder="e.g. 5" />
          <FilterInput label="Min 1Y Return %"  value={filters.minReturn1y}  onChange={v => set('minReturn1y', v)}  placeholder="e.g. 10" />
        </Section>

        <Section title="Size & Score" open={openSections.size} onToggle={() => toggleSection('size')}>
          <RangeInputs label="Market Cap ($B)" minVal={filters.minMarketCap} maxVal={filters.maxMarketCap} onMin={v => set('minMarketCap', v)} onMax={v => set('maxMarketCap', v)} minPlaceholder="e.g. 1" maxPlaceholder="e.g. 100" />
          <FilterInput label="Min Value Score" value={filters.minValueScore} onChange={v => set('minValueScore', v)} placeholder="e.g. 50" />
        </Section>

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
        {/* Header row */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span className="text-gray-500 text-sm">
            {hasFilters
              ? <><span className="text-white font-semibold">{results.length}</span> stocks match</>
              : <span className="text-gray-600">Pick a theme or configure filters</span>}
          </span>
          {results.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {SORT_COLS.map(c => (
                <button key={c.id} onClick={() => handleSort(c.id)}
                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${sortCol === c.id ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'}`}>
                  {c.label}{sortCol === c.id ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Column toggles */}
        {results.length > 0 && (
          <div className="flex gap-1 flex-wrap mb-3">
            {TABLE_COLS.filter(c => !['symbol','name','sector'].includes(c.key)).map(c => (
              <button key={c.key} onClick={() => toggleCol(c.key)}
                className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${visibleCols.includes(c.key) ? 'bg-gray-800 border-gray-700 text-gray-300' : 'border-gray-900 text-gray-700 hover:text-gray-500'}`}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {!hasFilters && <div className="py-24 text-center text-gray-700 text-sm">Choose a quick theme or configure filters on the left</div>}
        {hasFilters && results.length === 0 && <div className="py-24 text-center text-gray-600 text-sm">No stocks match — try relaxing some filters</div>}

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-800 text-gray-600 text-left">
                  {displayCols.map(c => (
                    <th key={c.key} className={`pb-2 pr-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(s => (
                  <tr key={s.symbol} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors">
                    {displayCols.map(c => (
                      <td key={c.key} className={`py-1.5 pr-3 ${c.align === 'right' ? 'text-right' : ''}`}>
                        {c.render(s)}
                      </td>
                    ))}
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
