import { useState, useMemo } from 'react'
import { useStocks } from './hooks/useStocks'
import { useWatchlist } from './hooks/useWatchlist'
import { useAuth } from './hooks/useAuth'
import { computeScoresWithMetrics } from './utils/scoring'
import ScoreWeightsPanel, { defaultMetricConfig } from './components/ScoreWeightsPanel'
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
import DCFTab from './components/DCFTab'
import EducationTab from './components/EducationTab'
import PredictionMarketsTab from './components/PredictionMarketsTab'
import WatchlistTab from './components/WatchlistTab'
import AuthModal from './components/AuthModal'
import AlertsPanel from './components/AlertsPanel'
import ChatWidget from './components/ChatWidget'
import { supabase } from './lib/supabase'
import AletheiaLogo from './components/AletheiaLogo'
import { EquityMethodology } from './components/Methodology'
import TickerBanner from './components/TickerBanner'
import CompareModal from './components/CompareModal'
import { TrendingUp, RefreshCw, BarChart2, Layers, Landmark, Package, Activity, FlaskConical, Globe, Flame, Newspaper, GitBranch, SlidersHorizontal, TestTube2, X, GitCompare, Calculator, BookOpen, Star, Bell, User, LogOut } from 'lucide-react'

const DEFAULT_FILTERS = {
  search: '',
  sector: '',
  minMarketCap: 0,
  minScore: 0,
}

const TAB_GROUPS = [
  {
    id: 'screener',
    label: 'SCREENER',
    icon: BarChart2,
    tabs: [
      { id: 'screener',       label: 'VALUE SCREENER',  icon: BarChart2 },
      { id: 'customscreener', label: 'CUSTOM',          icon: SlidersHorizontal },
      { id: 'watchlist',      label: 'WATCHLIST',       icon: Star },
    ],
  },
  {
    id: 'options',
    label: 'OPTIONS',
    icon: Layers,
    tabs: [
      { id: 'options',     label: 'IDEAS',    icon: Layers },
      { id: 'optbacktest', label: 'BACKTEST', icon: FlaskConical },
    ],
  },
  {
    id: 'markets',
    label: 'MARKETS',
    icon: Globe,
    tabs: [
      { id: 'bonds',       label: 'BONDS',        icon: Landmark },
      { id: 'commodities', label: 'COMMODITIES',  icon: Package },
      { id: 'macro',       label: 'MACRO',         icon: Globe },
      { id: 'predictions', label: 'PREDICTIONS',  icon: TrendingUp },
    ],
  },
  {
    id: 'backtests',
    label: 'BACKTESTS',
    icon: Activity,
    tabs: [
      { id: 'backtest',      label: 'SCORE',   icon: Activity },
      { id: 'custombacktest', label: 'CUSTOM', icon: TestTube2 },
    ],
  },
  {
    id: 'news',
    label: 'NEWS',
    icon: Newspaper,
    tabs: [
      { id: 'hackernews', label: 'HACKER NEWS',     icon: Flame },
      { id: 'news',       label: 'GLOBAL NEWS',     icon: Newspaper },
      { id: 'github',     label: 'GITHUB TRENDING', icon: GitBranch },
    ],
  },
  {
    id: 'tools',
    label: 'TOOLS',
    icon: Calculator,
    tabs: [
      { id: 'dcf',       label: 'DCF CALCULATOR', icon: Calculator },
      { id: 'education', label: 'EDUCATION',       icon: BookOpen },
    ],
  },
]

// Derive which group contains a given tab id
function getGroup(tabId) {
  return TAB_GROUPS.find(g => g.tabs.some(t => t.id === tabId)) ?? TAB_GROUPS[0]
}

export default function App() {
  const { rawStocks, loading, refreshing, error, lastUpdated, benchmark } = useStocks()
  const [scoreMetrics, setScoreMetrics] = useState(() => defaultMetricConfig())
  const stocks = useMemo(
    () => computeScoresWithMetrics(rawStocks, scoreMetrics),
    [rawStocks, scoreMetrics]
  )
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [tab, setTab] = useState('screener')
  const [backtestPayload, setBacktestPayload] = useState(null)
  const [compareSymbols, setCompareSymbols] = useState([])
  const { watchlist, toggle: toggleWatch, setNote: setWatchNote, remove: removeFromWatch } = useWatchlist()
  const { user, signIn, signOut } = useAuth()
  const [showAuth,   setShowAuth]   = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showCompare, setShowCompare] = useState(false)

  const handleToggleCompare = symbol => {
    setCompareSymbols(prev => {
      if (prev.includes(symbol)) return prev.filter(s => s !== symbol)
      if (prev.length >= 4) return prev  // max 4
      return [...prev, symbol]
    })
  }

  const compareStockObjects = compareSymbols.map(sym => stocks.find(s => s.symbol === sym)).filter(Boolean)

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
            <AletheiaLogo size={48} />
            <div>
              <h1 className="text-sm font-bold text-white tracking-[0.2em] uppercase">ALETHEIA</h1>
              <p className="text-[11px] text-gray-600 tracking-wider">ἀλήθεια &mdash; the unconcealment of value</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-gray-600 border border-gray-800 px-3 py-1">
                <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                <span className="uppercase tracking-wider">
                  {refreshing ? 'REFRESHING...' : `UPDATED ${new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}`}
                </span>
              </div>
            )}
            <div className="text-blue-500 font-bold tracking-widest text-xs border border-blue-500 px-3 py-1">
              LIVE
            </div>

            {/* Auth controls — only shown when Supabase is configured */}
            {supabase && (
              user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAlerts(true)}
                    className="flex items-center gap-1.5 px-3 py-1 text-[11px] border border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                    title="Manage alerts"
                  >
                    <Bell size={11} />
                    Alerts
                  </button>
                  <button
                    onClick={signOut}
                    className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
                    title={`Signed in as ${user.email}`}
                  >
                    <LogOut size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] border border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors"
                >
                  <User size={11} />
                  Sign In
                </button>
              )
            )}
          </div>
        </div>

        {/* Primary group row */}
        <div className="max-w-screen-2xl mx-auto px-4 flex border-b border-gray-800">
          {TAB_GROUPS.map(({ id, label, icon: Icon, tabs }) => {
            const isActive = getGroup(tab).id === id
            return (
              <button
                key={id}
                onClick={() => !isActive && setTab(tabs[0].id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-bold tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-white bg-gray-900/60'
                    : 'border-transparent text-gray-600 hover:text-gray-400 hover:bg-gray-900/30'
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Secondary sub-tab row — only shown when active group has > 1 tab */}
        {getGroup(tab).tabs.length > 1 && (
          <div className="max-w-screen-2xl mx-auto px-4 flex bg-gray-900/40">
            {getGroup(tab).tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-medium tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                  tab === id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-600 hover:text-gray-400'
                }`}
              >
                <Icon size={10} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!loading && stocks.length > 0 && <TickerBanner stocks={stocks} />}

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {tab === 'screener' && (
          <>
            <div className="mb-4">
              <EquityMethodology />
            </div>

            <div className="mb-4">
              <ScoreWeightsPanel metrics={scoreMetrics} onChange={setScoreMetrics} />
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

            {!loading && !error && (
              <StockTable
                data={filtered}
                compareStocks={compareSymbols}
                onToggleCompare={handleToggleCompare}
                watchlist={watchlist}
                onToggleWatch={toggleWatch}
              />
            )}
          </>
        )}

        {tab === 'options'     && <OptionsSection />}
        {tab === 'bonds'       && <BondsTab />}
        {tab === 'commodities' && <CommoditiesTab />}
        {tab === 'backtest'    && <BacktestTab stocks={stocks} benchmark={benchmark} loading={loading} />}
        {tab === 'optbacktest' && <OptionsBacktestTab />}
        {tab === 'macro'       && <MacroTab />}
        {tab === 'predictions' && <PredictionMarketsTab />}
        {tab === 'hackernews'  && <HackerNewsTab />}
        {tab === 'news'        && <GlobalNewsTab />}
        {tab === 'github'         && <GitHubTrendingTab />}
        {tab === 'customscreener' && <CustomScreenerTab stocks={stocks} benchmark={benchmark} onSendToBacktest={handleSendToBacktest} />}
        {tab === 'custombacktest' && <CustomBacktestTab stocks={stocks} benchmark={benchmark} backtestPayload={backtestPayload} />}
        {tab === 'dcf'            && <DCFTab stocks={stocks} />}
        {tab === 'education'      && <EducationTab />}
        {tab === 'watchlist'      && (
          <WatchlistTab
            stocks={stocks}
            watchlist={watchlist}
            onRemove={removeFromWatch}
            onSetNote={setWatchNote}
          />
        )}
      </div>

      {/* Floating comparison tray */}
      {compareSymbols.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-700 bg-gray-950/95 backdrop-blur px-6 py-3">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-4">
            <GitCompare size={14} className="text-gray-500 shrink-0" />
            <span className="text-[11px] text-gray-500 uppercase tracking-wider shrink-0">Comparing:</span>
            <div className="flex items-center gap-2 flex-1">
              {compareSymbols.map((sym, idx) => {
                const colors = [
                  'text-orange-400 border-orange-500',
                  'text-cyan-400 border-cyan-500',
                  'text-yellow-400 border-yellow-400',
                  'text-purple-400 border-purple-500',
                ]
                return (
                  <div key={sym} className={`flex items-center gap-1.5 px-2 py-0.5 border text-[11px] font-bold tracking-wider ${colors[idx]}`}>
                    {sym}
                    <button
                      onClick={() => handleToggleCompare(sym)}
                      className="opacity-60 hover:opacity-100 transition-opacity ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center gap-2">
              {compareSymbols.length >= 2 && (
                <button
                  onClick={() => setShowCompare(true)}
                  className="px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase bg-blue-500 text-black hover:bg-blue-400 transition-colors"
                >
                  COMPARE {compareSymbols.length} STOCKS
                </button>
              )}
              <button
                onClick={() => setCompareSymbols([])}
                className="px-3 py-1.5 text-[11px] text-gray-500 border border-gray-700 hover:border-gray-500 hover:text-gray-300 transition-colors uppercase tracking-wider"
              >
                CLEAR
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompare && compareStockObjects.length >= 2 && (
        <CompareModal
          stocks={compareStockObjects}
          onClose={() => setShowCompare(false)}
        />
      )}

      <ChatWidget stocks={stocks} />

      {showAuth && (
        <AuthModal onClose={() => setShowAuth(false)} signIn={signIn} />
      )}

      {showAlerts && user && (
        <AlertsPanel
          user={user}
          stocks={stocks}
          onClose={() => setShowAlerts(false)}
        />
      )}
    </div>
  )
}
