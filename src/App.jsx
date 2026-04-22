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
import GitHubTrendingTab from './components/GitHubTrendingTab'
import CustomScreenerTab from './components/CustomScreenerTab'
import CustomBacktestTab from './components/CustomBacktestTab'
import { EquityMethodology } from './components/Methodology'
import TickerBanner from './components/TickerBanner'
import { TrendingUp, RefreshCw, BarChart2, Layers, Landmark, Package, Activity, FlaskConical, Globe, Flame, Newspaper, GitBranch, SlidersHorizontal, TestTube2 } from 'lucide-react'

const DEFAULT_FILTERS = {
  search: '',
  sector: '',
  minMarketCap: 0,
  minScore: 0,
}

const TABS = [
  { id: 'screener',       label: 'VALUE SCREENER',    icon: BarChart2 },
  { id: 'options',        label: 'OPTIONS IDEAS',      icon: Layers },
  { id: 'bonds',          label: 'BONDS',              icon: Landmark },
  { id: 'commodities',    label: 'COMMODITIES',        icon: Package },
  { id: 'backtest',       label: 'SCORE BACKTEST',     icon: Activity },
  { id: 'optbacktest',    label: 'OPTIONS BACKTEST',   icon: FlaskConical },
  { id: 'macro',          label: 'MACRO',              icon: Globe },
  { id: 'hackernews',     label: 'HACKER NEWS',        icon: Flame },
  { id: 'news',           label: 'GLOBAL NEWS',        icon: Newspaper },
  { id: 'github',         label: 'GITHUB TRENDING',    icon: GitBranch },
  { id: 'customscreener', label: 'CUSTOM SCREENER',    icon: SlidersHorizontal },
  { id: 'custombacktest', label: 'CUSTOM BACKTEST',    icon: TestTube2 },
]

export default function App() {
  const { stocks, loading, error, lastUpdated, benchmark } = useStocks()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [tab, setTab] = useState('screener')
  const [backtestPayload, setBacktestPayload] = useState(null)

  const handleSendToBacktest = payload => {
    setBacktestPayload(payload)
    setTab('custombacktest')
  }

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
      <div className="border-b border-gray-700 bg-gray-950 sticky top-0 z-10">
        {/* Terminal top bar */}
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 overflow-hidden shrink-0 border border-gray-700">
              <img src={`${import.meta.env.BASE_URL}desert.jpg`} alt="" className="w-full h-full object-cover scale-125" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-widest uppercase">JOSHUA MISIR // VALUE FINDER</h1>
              <p className="text-[11px] text-gray-600 italic">most stock screeners are trash, so i built my own</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-gray-600 border border-gray-800 px-3 py-1">
                <RefreshCw size={10} />
                <span className="uppercase tracking-wider">
                  UPDATED {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                </span>
              </div>
            )}
            <div className="text-blue-500 font-bold tracking-widest text-xs border border-blue-500 px-3 py-1">
              LIVE
            </div>
          </div>
        </div>

        {/* Tab row */}
        <div className="max-w-screen-2xl mx-auto px-4 flex overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                tab === id
                  ? 'border-blue-500 text-blue-500 bg-gray-900'
                  : 'border-transparent text-gray-600 hover:text-gray-400 hover:bg-gray-900'
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {!loading && stocks.length > 0 && <TickerBanner stocks={stocks} />}

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
        {tab === 'github'         && <GitHubTrendingTab />}
        {tab === 'customscreener' && <CustomScreenerTab stocks={stocks} benchmark={benchmark} onSendToBacktest={handleSendToBacktest} />}
        {tab === 'custombacktest' && <CustomBacktestTab stocks={stocks} benchmark={benchmark} backtestPayload={backtestPayload} />}
      </div>
    </div>
  )
}
