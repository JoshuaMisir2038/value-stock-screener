import { useState, useMemo } from 'react'
import { useStocks } from './hooks/useStocks'
import StockTable from './components/StockTable'
import Filters from './components/Filters'
import OptionsSection from './components/OptionsSection'
import BondsTab from './components/BondsTab'
import CommoditiesTab from './components/CommoditiesTab'
import BacktestTab from './components/BacktestTab'
import OptionsBacktestTab from './components/OptionsBacktestTab'
import MacroTab from './components/MacroTab'
import HackerNewsTab from './components/HackerNewsTab'
import GlobalNewsTab from './components/GlobalNewsTab'
import { EquityMethodology } from './components/Methodology'
import { TrendingUp, RefreshCw, BarChart2, Layers, Landmark, Package, Activity, FlaskConical, Globe, Flame, Newspaper } from 'lucide-react'

const DEFAULT_FILTERS = {
  search: '',
  sector: '',
  minMarketCap: 0,
  minScore: 0,
}

const TABS = [
  { id: 'screener',     label: 'Value Screener', icon: BarChart2 },
  { id: 'options',      label: 'Options Ideas',  icon: Layers },
  { id: 'bonds',        label: 'Bonds',          icon: Landmark },
  { id: 'commodities',  label: 'Commodities',    icon: Package },
  { id: 'backtest',     label: 'Score Backtest', icon: Activity },
  { id: 'optbacktest', label: 'Options Backtest', icon: FlaskConical },
  { id: 'macro',       label: 'Macro',           icon: Globe },
  { id: 'hackernews', label: 'Hacker News',     icon: Flame },
  { id: 'news',       label: 'Global News',     icon: Newspaper },
]

export default function App() {
  const { stocks, loading, error, lastUpdated, benchmark } = useStocks()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [tab, setTab] = useState('screener')

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean))
    return [...set].sort()
  }, [stocks])

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      if (filters.search) {
        const q = filters.search.toLowerCase()
        if (!s.symbol?.toLowerCase().includes(q) && !s.name?.toLowerCase().includes(q)) return false
      }
      if (filters.sector && s.sector !== filters.sector) return false
      if (filters.minMarketCap && (s.marketCap || 0) < filters.minMarketCap) return false
      if (filters.minScore && (s.valueScore || 0) < filters.minScore) return false
      return true
    })
  }, [stocks, filters])

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-24 h-24 rounded-full overflow-hidden shrink-0">
              <img src={`${import.meta.env.BASE_URL}desert.jpg`} alt="" className="w-full h-full object-cover scale-125" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Joshua Misir's Value Finder</h1>
              <p className="text-xs text-gray-600 italic">most stock screeners are trash, so i built my own</p>
            </div>
            <span className="text-xs text-gray-600 border border-gray-800 px-2 py-0.5 rounded">US Listed · Mkt Cap &gt;$300M</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <RefreshCw size={11} />
              Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-screen-2xl mx-auto px-6 flex gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {tab === 'screener' && (
          <>
            <div className="mb-4">
              <EquityMethodology />
            </div>

            <div className="mb-5">
              <Filters sectors={sectors} filters={filters} onChange={setFilters} />
            </div>

            {!loading && !error && (
              <div className="mb-3 text-xs text-gray-600">
                {filtered.length.toLocaleString()} of {stocks.length.toLocaleString()} stocks
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-32 text-gray-600">
                <RefreshCw size={16} className="animate-spin mr-2" />
                Loading stock data...
              </div>
            )}

            {error && (
              <div className="py-32 text-center">
                <p className="text-red-400 mb-2">Could not load stock data.</p>
                <p className="text-gray-600 text-sm">{error}</p>
              </div>
            )}

            {!loading && !error && <StockTable data={filtered} />}
          </>
        )}

        {tab === 'options'     && <OptionsSection />}
        {tab === 'bonds'       && <BondsTab />}
        {tab === 'commodities' && <CommoditiesTab />}
        {tab === 'backtest'    && <BacktestTab stocks={stocks} benchmark={benchmark} loading={loading} />}
        {tab === 'optbacktest' && <OptionsBacktestTab />}
        {tab === 'macro'       && <MacroTab />}
        {tab === 'hackernews'  && <HackerNewsTab />}
        {tab === 'news'        && <GlobalNewsTab />}
      </div>
    </div>
  )
}
