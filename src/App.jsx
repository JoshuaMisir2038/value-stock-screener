import { useState, useMemo, useEffect } from 'react'
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
import EarningsCalendarTab from './components/EarningsCalendarTab'
import TenKAnalyzerTab from './components/TenKAnalyzerTab'
import PredictionMarketsTab from './components/PredictionMarketsTab'
import InstitutionalTab from './components/InstitutionalTab'
import WatchlistTab from './components/WatchlistTab'
import MembershipBanner from './components/MembershipBanner'
import DigestSubscribeBanner from './components/DigestSubscribeBanner'
import CommunityTrending from './components/CommunityTrending'
import ScreenerFilters, { applyScreenerFilters } from './components/ScreenerFilters'
import AuthModal from './components/AuthModal'
import AlertsPanel from './components/AlertsPanel'
import ChatWidget from './components/ChatWidget'
import { supabase } from './lib/supabase'
import AletheiaLogo from './components/AletheiaLogo'
import { EquityMethodology } from './components/Methodology'
import TickerBanner from './components/TickerBanner'
import CompareModal from './components/CompareModal'
import { TrendingUp, RefreshCw, BarChart2, Layers, Landmark, Package, Activity, FlaskConical, Globe, Flame, Newspaper, GitBranch, SlidersHorizontal, TestTube2, X, GitCompare, Calculator, BookOpen, Star, Bell, User, LogOut, Building2, CalendarDays, FileSearch } from 'lucide-react'

const URL_RESERVED = new Set(['tab', 'q', 'sort', 'dir'])

function timeAgo(isoString) {
  if (!isoString) return null
  const mins = Math.floor((Date.now() - new Date(isoString).getTime()) / 60_000)
  if (mins < 2)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

function readUrlParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    tab:            p.get('tab')  || 'screener',
    search:         p.get('q')    || '',
    sortId:         p.get('sort') || 'valueScore',
    sortDesc:       p.get('dir')  !== 'asc',
    screenerFilters: Object.fromEntries([...p.entries()].filter(([k]) => !URL_RESERVED.has(k))),
  }
}

const DEFAULT_FILTERS = { search: '' }

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
      { id: 'bonds',         label: 'BONDS',         icon: Landmark  },
      { id: 'commodities',   label: 'COMMODITIES',   icon: Package   },
      { id: 'macro',         label: 'MACRO',         icon: Globe     },
      { id: 'institutional', label: 'WHALES',        icon: Building2 },
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
      { id: 'earnings',  label: 'EARNINGS',        icon: CalendarDays },
      { id: 'tenk',      label: '10-K ANALYZER',  icon: FileSearch },
      { id: 'dcf',       label: 'DCF CALCULATOR', icon: Calculator },
      { id: 'education', label: 'EDUCATION',       icon: BookOpen },
    ],
  },
  {
    id: 'predict',
    label: 'PREDICT',
    icon: TrendingUp,
    tabs: [
      { id: 'predictions', label: 'PREDICTION MARKETS', icon: TrendingUp },
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
  const [filters, setFilters] = useState(() => ({ search: readUrlParams().search }))
  const [tab, setTab] = useState(() => readUrlParams().tab)
  const [screenerFilters, setScreenerFilters] = useState(() => readUrlParams().screenerFilters)
  const [sorting, setSorting] = useState(() => {
    const { sortId, sortDesc } = readUrlParams()
    return [{ id: sortId, desc: sortDesc }]
  })
  const [backtestPayload, setBacktestPayload] = useState(null)
  const [compareSymbols, setCompareSymbols] = useState([])
  const { watchlist, toggle: toggleWatch, setNote: setWatchNote, remove: removeFromWatch } = useWatchlist()
  const { user, signUp, signInWithPassword, signInWithMagicLink, signOut } = useAuth()
  const [showAuth,   setShowAuth]   = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [showJoin,   setShowJoin]   = useState(false)
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

  // Sync tab, search, filters, and sort to URL so views are shareable/bookmarkable
  useEffect(() => {
    const p = new URLSearchParams()
    if (tab !== 'screener')         p.set('tab',  tab)
    if (filters.search)             p.set('q',    filters.search)
    if (sorting[0]?.id && sorting[0].id !== 'valueScore') p.set('sort', sorting[0].id)
    if (sorting[0] && !sorting[0].desc) p.set('dir', 'asc')
    for (const [k, v] of Object.entries(screenerFilters)) {
      if (v && v !== 'Any') p.set(k, v)
    }
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [tab, filters.search, screenerFilters, sorting])

  const sectors = useMemo(() => {
    const set = new Set(stocks.map(s => s.sector).filter(Boolean))
    return [...set].sort()
  }, [stocks])

  const filtered = useMemo(() => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      return stocks.filter(s =>
        s.symbol?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q)
      )
    }
    return applyScreenerFilters(stocks, screenerFilters, sectors)
  }, [stocks, filters.search, screenerFilters, sectors])

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-600 bg-gray-950 sticky top-0 z-10">
        {/* Terminal top bar */}
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-4">
            <AletheiaLogo size={48} />
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-[0.2em] uppercase">ALETHEIA</h1>
              <p className="text-[11px] text-gray-400 tracking-wider">truth in data</p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-gray-400 border border-gray-700 px-3 py-1">
                <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                <span className="uppercase tracking-wider">
                  {refreshing ? 'REFRESHING...' : `UPDATED ${timeAgo(lastUpdated)?.toUpperCase()}`}
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
        <div className="max-w-screen-2xl mx-auto px-4 flex border-b border-gray-700">
          {TAB_GROUPS.map(({ id, label, icon: Icon, tabs }) => {
            const isActive = getGroup(tab).id === id
            return (
              <button
                key={id}
                onClick={() => !isActive && setTab(tabs[0].id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-bold tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? 'border-blue-400 text-white bg-gray-900/60'
                    : 'border-transparent text-gray-100 hover:text-white hover:bg-gray-900/30'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
        </div>

        {/* Secondary sub-tab row — only shown when active group has > 1 tab */}
        {getGroup(tab).tabs.length > 1 && (
          <div className="max-w-screen-2xl mx-auto px-4 flex border-b border-gray-700 bg-gray-900/40">
            {getGroup(tab).tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-semibold tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                  tab === id
                    ? 'border-blue-400 text-white'
                    : 'border-transparent text-gray-200 hover:text-white'
                }`}
              >
                <Icon size={11} />
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
            {!user && supabase && <MembershipBanner signIn={signInWithMagicLink} />}
            {supabase && <DigestSubscribeBanner user={user} />}
            {supabase && <CommunityTrending stocks={stocks} onTickerClick={() => {}} />}

            <div className="mb-4">
              <EquityMethodology />
            </div>

            <div className="mb-4">
              <ScoreWeightsPanel metrics={scoreMetrics} onChange={setScoreMetrics} />
            </div>

            <div className="mb-3">
              <Filters filters={filters} onChange={setFilters} />
            </div>

            <div className="mb-5">
              <ScreenerFilters
                filterState={screenerFilters}
                onChange={setScreenerFilters}
                sectors={sectors}
              />
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

            {!loading && !error && filtered.length === 0 && (
              <div className="py-20 text-center text-gray-500 text-sm">
                {filters.search
                  ? <>No stock matching <span className="text-gray-300 font-bold uppercase">{filters.search}</span> found in today's data. It may not have been fetched in the latest pipeline run — try again after the next scheduled update.</>
                  : 'No stocks match the active filters.'}
              </div>
            )}

            {!loading && !error && filtered.length > 0 && (
              <StockTable
                data={filtered}
                compareStocks={compareSymbols}
                onToggleCompare={handleToggleCompare}
                watchlist={watchlist}
                onToggleWatch={toggleWatch}
                sorting={sorting}
                onSortChange={setSorting}
              />
            )}
          </>
        )}

        {tab === 'options'     && <OptionsSection />}
        {tab === 'bonds'       && <BondsTab />}
        {tab === 'commodities' && <CommoditiesTab />}
        {tab === 'backtest'    && <BacktestTab stocks={stocks} benchmark={benchmark} loading={loading} />}
        {tab === 'optbacktest' && <OptionsBacktestTab />}
        {tab === 'macro'         && <MacroTab />}
        {tab === 'institutional' && <InstitutionalTab />}
        {tab === 'predictions' && <PredictionMarketsTab />}
        {tab === 'hackernews'  && <HackerNewsTab />}
        {tab === 'news'        && <GlobalNewsTab />}
        {tab === 'github'         && <GitHubTrendingTab />}
        {tab === 'customscreener' && <CustomScreenerTab stocks={stocks} benchmark={benchmark} onSendToBacktest={handleSendToBacktest} />}
        {tab === 'custombacktest' && <CustomBacktestTab stocks={stocks} benchmark={benchmark} backtestPayload={backtestPayload} />}
        {tab === 'earnings'       && <EarningsCalendarTab stocks={stocks} />}
        {tab === 'tenk'           && <TenKAnalyzerTab stocks={stocks} />}
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
        <AuthModal
          onClose={() => setShowAuth(false)}
          signUp={signUp}
          signInWithPassword={signInWithPassword}
          signInWithMagicLink={signInWithMagicLink}
        />
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
