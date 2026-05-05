import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, TrendingUp, AlertTriangle } from 'lucide-react'

// ── Data fetching ─────────────────────────────────────────────────────────────

const PROXY = url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`

// Hard Promise.race timeout — guarantees every fetch settles within ms
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// Try direct first (many APIs allow CORS), fall back to proxy
async function safeFetch(directUrl, label) {
  try {
    return await withTimeout(getJson(directUrl), 8000, label)
  } catch (e) {
    console.warn(`${label} direct failed (${e.message}), trying proxy`)
    return withTimeout(getJson(PROXY(directUrl)), 12000, `${label}-proxy`)
  }
}

async function fetchPolymarket() {
  const data = await safeFetch(
    'https://gamma-api.polymarket.com/markets?limit=50&active=true&closed=false&order=volume24hr&ascending=false',
    'Polymarket'
  )
  return (Array.isArray(data) ? data : [])
    .filter(m => m.question && m.active && !m.closed)
    .map(m => {
      let prob = null
      try {
        const prices = JSON.parse(m.outcomePrices || '[]')
        prob = prices[0] != null ? Math.round(parseFloat(prices[0]) * 100) : null
      } catch {}
      return {
        id:       `pm-${m.id}`,
        source:   'Polymarket',
        question: m.question,
        category: m.groupItemTitle || m.category || 'General',
        prob,
        volume:   m.volume     ? parseFloat(m.volume)     : 0,
        vol24h:   m.volume24hr ? parseFloat(m.volume24hr) : 0,
        url:      `https://polymarket.com/event/${m.slug}`,
        endDate:  m.endDate || null,
      }
    })
}

async function fetchKalshi() {
  const data = await safeFetch(
    'https://api.kalshi.com/trade-api/v2/markets?limit=50&status=open',
    'Kalshi'
  )
  return (data.markets || []).map(m => ({
    id:       `ks-${m.ticker}`,
    source:   'Kalshi',
    question: m.title,
    category: m.category || 'General',
    prob:     m.yes_ask != null ? Math.round(m.yes_ask) : null,
    volume:   m.volume  || 0,
    vol24h:   m.volume  || 0,
    url:      `https://kalshi.com/markets/${m.ticker_name || m.ticker}`,
    endDate:  m.close_time || null,
  }))
}

async function fetchManifold() {
  const data = await safeFetch(
    'https://api.manifold.markets/v0/markets?limit=50&sort=liquidity&filter=open&contractType=BINARY',
    'Manifold'
  )
  return (Array.isArray(data) ? data : []).map(m => ({
    id:       `mf-${m.id}`,
    source:   'Manifold',
    question: m.question,
    category: m.category || 'General',
    prob:     m.probability != null ? Math.round(m.probability * 100) : null,
    volume:   m.volume     || 0,
    vol24h:   m.volume     || 0,
    url:      m.url,
    endDate:  m.closeTime  ? new Date(m.closeTime).toISOString() : null,
  }))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVolume(v) {
  if (!v) return '—'
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
  return `$${v.toFixed(0)}`
}

function fmtDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return null }
}

function probColor(p) {
  if (p == null) return 'text-gray-600'
  if (p >= 70)  return 'text-emerald-400'
  if (p >= 50)  return 'text-blue-400'
  if (p >= 30)  return 'text-yellow-400'
  return 'text-red-400'
}

function probBarColor(p) {
  if (p == null) return 'bg-gray-700'
  if (p >= 70)  return 'bg-emerald-500'
  if (p >= 50)  return 'bg-blue-500'
  if (p >= 30)  return 'bg-yellow-500'
  return 'bg-red-500'
}

const SOURCE_STYLES = {
  Polymarket: 'text-blue-400   border-blue-500/30   bg-blue-500/10',
  Kalshi:     'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  Manifold:   'text-purple-400  border-purple-500/30  bg-purple-500/10',
}

// ── Market card ───────────────────────────────────────────────────────────────

function MarketRow({ m }) {
  const end = fmtDate(m.endDate)
  return (
    <div className="border border-gray-800 hover:border-gray-700 transition-colors p-4 group">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-16 text-center">
          <div className={`text-xl font-bold tabular-nums ${probColor(m.prob)}`}>
            {m.prob != null ? `${m.prob}%` : '—'}
          </div>
          <div className="text-[9px] text-gray-700 uppercase tracking-wider mt-0.5">YES</div>
          {m.prob != null && (
            <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${probBarColor(m.prob)}`} style={{ width: `${m.prob}%` }} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={m.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-gray-200 hover:text-white font-medium leading-snug block mb-2 group-hover:underline underline-offset-2"
          >
            {m.question}
          </a>
          <div className="flex items-center gap-3 flex-wrap text-[10px]">
            <span className={`px-1.5 py-0.5 border rounded-sm font-bold ${SOURCE_STYLES[m.source] ?? 'text-gray-500 border-gray-700'}`}>
              {m.source}
            </span>
            {m.volume > 0 && (
              <span className="font-bold text-gray-200">
                {fmtVolume(m.volume)} <span className="text-gray-600 font-normal">wagered</span>
              </span>
            )}
            {m.category && m.category !== 'General' && (
              <span className="text-gray-500">{m.category}</span>
            )}
            {end && <span className="text-gray-600">Closes {end}</span>}
            <a
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-gray-700 hover:text-gray-400 transition-colors flex items-center gap-1"
            >
              View <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main tab ─────────────────────────────────────────────────────────────────

const SOURCES     = ['All', 'Polymarket', 'Kalshi', 'Manifold']
const SORT_OPTIONS = [
  { key: 'vol24h',  label: 'Volume'       },
  { key: 'prob',    label: 'Probability'  },
  { key: 'endDate', label: 'Closing Soon' },
]

export default function PredictionMarketsTab() {
  const [markets,   setMarkets]   = useState([])
  const [statuses,  setStatuses]  = useState({ Polymarket: 'idle', Kalshi: 'idle', Manifold: 'idle' })
  const [source,    setSource]    = useState('All')
  const [sortKey,   setSortKey]   = useState('vol24h')
  const [search,    setSearch]    = useState('')
  const [lastFetch, setLastFetch] = useState(null)

  const load = useCallback(async () => {
    setStatuses({ Polymarket: 'loading', Kalshi: 'loading', Manifold: 'loading' })
    setMarkets([])

    const fetchers = [
      { key: 'Polymarket', fn: fetchPolymarket },
      { key: 'Kalshi',     fn: fetchKalshi     },
      { key: 'Manifold',   fn: fetchManifold   },
    ]

    const results = await Promise.allSettled(
      fetchers.map(f => withTimeout(f.fn(), 20000, f.key))
    )

    let all = []
    const next = {}
    results.forEach((r, i) => {
      const key = fetchers[i].key
      if (r.status === 'fulfilled') {
        next[key] = 'ok'
        all = [...all, ...r.value]
      } else {
        next[key] = 'error'
        console.warn(`${key} failed:`, r.reason)
      }
    })

    setStatuses(next)
    setMarkets(all)
    setLastFetch(new Date())
  }, [])

  useEffect(() => { load() }, [load])

  const visible = markets
    .filter(m => {
      if (source !== 'All' && m.source !== source) return false
      if (search) {
        const q = search.toLowerCase()
        return m.question.toLowerCase().includes(q) || m.category?.toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => {
      if (sortKey === 'endDate') {
        if (!a.endDate) return 1
        if (!b.endDate) return -1
        return new Date(a.endDate) - new Date(b.endDate)
      }
      if (sortKey === 'prob') return (b.prob ?? -1) - (a.prob ?? -1)
      return (b.vol24h ?? 0) - (a.vol24h ?? 0)
    })

  const anyLoading = Object.values(statuses).some(s => s === 'loading')

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={13} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Prediction Markets</h2>
          </div>
          <p className="text-[11px] text-gray-600">
            Live markets from Polymarket, Kalshi, and Manifold — ranked by amount wagered.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastFetch && (
            <span className="text-[10px] text-gray-700">
              {lastFetch.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={load}
            disabled={anyLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-800 text-[11px] text-gray-500 hover:border-gray-600 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={11} className={anyLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Source status badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {Object.entries(statuses).map(([src, status]) => (
          <div
            key={src}
            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-sm text-[10px] font-medium ${
              status === 'ok'      ? SOURCE_STYLES[src] :
              status === 'loading' ? 'border-gray-700 text-gray-600' :
              'border-red-500/30 text-red-400 bg-red-500/5'
            }`}
          >
            {status === 'loading' && <RefreshCw size={9} className="animate-spin" />}
            {status === 'error'   && <AlertTriangle size={9} />}
            {src}
            {status === 'ok' && <span className="opacity-50">· {markets.filter(m => m.source === src).length}</span>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex">
          {SOURCES.map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={`px-3 py-1.5 text-[11px] font-medium tracking-wider border-b-2 transition-colors whitespace-nowrap ${
                source === s ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-600 hover:text-gray-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-4">
          <span className="text-[10px] text-gray-700 uppercase tracking-wider">Sort:</span>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setSortKey(o.key)}
              className={`px-2.5 py-1 text-[10px] border rounded transition-colors ${
                sortKey === o.key
                  ? 'border-blue-500/40 text-blue-400 bg-blue-500/10'
                  : 'border-gray-800 text-gray-600 hover:text-gray-400'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search markets..."
          className="ml-auto bg-gray-900 border border-gray-800 text-gray-300 text-xs px-3 py-1.5 focus:outline-none focus:border-gray-600 w-48"
        />
      </div>

      {anyLoading && markets.length === 0 && (
        <div className="flex items-center justify-center py-24 text-gray-600 gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Fetching prediction markets…
        </div>
      )}

      {!anyLoading && visible.length === 0 && (
        <div className="py-24 text-center text-gray-700 text-sm">
          No markets found — try a different filter or refresh.
        </div>
      )}

      {visible.length > 0 && (
        <div className="mb-3 text-[11px] text-gray-700">{visible.length} markets</div>
      )}

      <div className="space-y-2">
        {visible.map(m => <MarketRow key={m.id} m={m} />)}
      </div>
    </div>
  )
}
