import { useState, useMemo } from 'react'
import { Calendar, Sparkles, ChevronDown, ChevronUp, Loader2, AlertTriangle } from 'lucide-react'

const WORKER_URL = 'https://small-resonance-5e82.misirjosh.workers.dev'

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.round((target - today) / 86400000)
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtMktCap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

function pct(v) {
  if (v == null) return '—'
  const n = (v * 100).toFixed(1)
  return `${n > 0 ? '+' : ''}${n}%`
}

function scoreColor(s) {
  if (s >= 70) return 'text-emerald-400'
  if (s >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function ratingBadge(r) {
  if (!r) return null
  const map = {
    'strong_buy': ['STRONG BUY', 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'],
    'buy':        ['BUY',         'text-emerald-400 border-emerald-500/30 bg-emerald-500/5'],
    'hold':       ['HOLD',        'text-yellow-400  border-yellow-500/30  bg-yellow-500/5'],
    'sell':       ['SELL',        'text-red-400     border-red-500/30     bg-red-500/5'],
    'strong_sell':['STRONG SELL', 'text-red-300     border-red-500/40     bg-red-500/10'],
  }
  const [label, cls] = map[r] ?? [r.toUpperCase(), 'text-gray-400 border-gray-700']
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 border ${cls}`}>{label}</span>
}

// ── AI Preview ────────────────────────────────────────────────────────────────

function buildPrompt(stock) {
  const days = daysUntil(stock.earningsDate)
  const upside = stock.targetPrice && stock.price
    ? `${(((stock.targetPrice - stock.price) / stock.price) * 100).toFixed(1)}% upside to analyst target ($${stock.targetPrice?.toFixed(2)})`
    : null

  return `You are a concise buy-side equity analyst. Write a pre-earnings preview for this stock reporting in ${days} day${days !== 1 ? 's' : ''}.

STOCK: ${stock.symbol} — ${stock.name}
Sector: ${stock.sector} | Market Cap: ${fmtMktCap(stock.marketCap)}

KEY METRICS:
- Value Score: ${stock.valueScore ?? '—'}/100 (percentile vs peers)
- Trailing P/E: ${stock.peRatio?.toFixed(1) ?? '—'}x | Forward P/E: ${stock.forwardPE?.toFixed(1) ?? '—'}x
- P/Sales: ${stock.psRatio?.toFixed(1) ?? '—'}x | P/Book: ${stock.pbRatio?.toFixed(1) ?? '—'}x
- Revenue Growth (YoY): ${stock.revenueGrowth != null ? pct(stock.revenueGrowth) : '—'}
- Operating Margin: ${stock.operatingMargin != null ? pct(stock.operatingMargin) : '—'}
- FCF Margin: ${stock.fcfMargin != null ? pct(stock.fcfMargin) : '—'}
- ROE: ${stock.roe != null ? pct(stock.roe) : '—'}
- Debt/Equity: ${stock.debtEquity?.toFixed(2) ?? '—'}x
${upside ? `- Analyst Consensus: ${stock.analystRating?.replace('_', ' ').toUpperCase() ?? '—'} (${upside}, ${stock.analystCount ?? '?'} analysts)` : ''}
- RSI: ${stock.rsi ?? '—'} | Above 200-day MA: ${stock.aboveMa200 ? 'Yes' : 'No'}
- 1M Return: ${stock.return1m != null ? `${stock.return1m > 0 ? '+' : ''}${stock.return1m}%` : '—'} | 3M: ${stock.return3m != null ? `${stock.return3m > 0 ? '+' : ''}${stock.return3m}%` : '—'}

Write exactly these 5 sections (use the bold headers as shown):

**CONSENSUS SETUP**
[1-2 sentences on current market expectations and sentiment heading into the print]

**BULL CASE**
[1-2 sentences on what would send the stock meaningfully higher]

**BEAR CASE**
[1-2 sentences on the specific risk that would disappoint]

**WATCH THESE NUMBERS**
• [Most important metric to watch and why]
• [Second metric]
• [Third metric]

**SETUP SUMMARY**
[One sentence on the overall risk/reward going into earnings]

Be specific and data-driven. Reference the actual numbers provided.`
}

async function streamPreview(stock, onChunk, onDone, onError) {
  try {
    const resp = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: buildPrompt(stock) }],
      }),
    })
    if (!resp.ok) throw new Error(`Worker error ${resp.status}`)

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') { onDone(); return }
        try {
          const chunk = JSON.parse(payload)
          const token = chunk.choices?.[0]?.delta?.content
          if (token) onChunk(token)
        } catch { /* skip malformed SSE */ }
      }
    }
    onDone()
  } catch (e) {
    onError(e.message)
  }
}

// Render markdown-style bold sections
function PreviewText({ text }) {
  const sections = text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-white block mt-3 mb-0.5 text-[11px] tracking-wider uppercase">{part.slice(2, -2)}</strong>
    }
    return <span key={i} className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap">{part}</span>
  })
  return <div>{sections}</div>
}

// ── Per-stock row with inline AI preview ──────────────────────────────────────

function EarningsRow({ stock }) {
  const [open,    setOpen]    = useState(false)
  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const days = daysUntil(stock.earningsDate)
  const urgent = days <= 3

  function handlePreview() {
    if (open && text) { setOpen(false); return }
    setOpen(true)
    if (text) return  // already generated
    setLoading(true)
    setError(null)
    setText('')
    streamPreview(
      stock,
      token => setText(prev => prev + token),
      ()    => setLoading(false),
      msg   => { setError(msg); setLoading(false) },
    )
  }

  return (
    <div className="border-b border-gray-900 last:border-0">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-900/30 transition-colors">
        {/* Ticker + name */}
        <div className="w-28 shrink-0">
          <div className="text-white font-bold text-sm tracking-wider">{stock.symbol}</div>
          <div className="text-gray-500 text-[10px] truncate max-w-[108px]">{stock.name}</div>
        </div>

        {/* Days badge */}
        <div className={`shrink-0 w-16 text-center py-0.5 text-[10px] font-bold tracking-wider border ${
          urgent
            ? 'text-orange-300 border-orange-500/40 bg-orange-500/10'
            : days <= 14
            ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/5'
            : 'text-gray-400 border-gray-700'
        }`}>
          {days === 0 ? 'TODAY' : days === 1 ? '1 DAY' : `${days} DAYS`}
        </div>

        {/* Sector */}
        <div className="text-gray-500 text-[10px] w-28 shrink-0 truncate">{stock.sector}</div>

        {/* Metrics */}
        <div className="flex gap-5 flex-1 text-[11px] tabular-nums">
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Score</div>
            <div className={`font-bold ${scoreColor(stock.valueScore)}`}>{stock.valueScore ?? '—'}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Fwd P/E</div>
            <div className="text-gray-300">{stock.forwardPE?.toFixed(1) ?? '—'}x</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Rev Growth</div>
            <div className={stock.revenueGrowth > 0 ? 'text-emerald-400' : stock.revenueGrowth < 0 ? 'text-red-400' : 'text-gray-400'}>
              {stock.revenueGrowth != null ? pct(stock.revenueGrowth) : '—'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Op Margin</div>
            <div className="text-gray-300">{stock.operatingMargin != null ? pct(stock.operatingMargin) : '—'}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Mkt Cap</div>
            <div className="text-gray-400">{fmtMktCap(stock.marketCap)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-600 text-[9px] uppercase tracking-wider mb-0.5">Consensus</div>
            <div>{ratingBadge(stock.analystRating) ?? <span className="text-gray-600">—</span>}</div>
          </div>
        </div>

        {/* AI Preview button */}
        <button
          onClick={handlePreview}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border transition-colors ${
            open
              ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
              : 'border-gray-700 text-gray-500 hover:border-violet-500/40 hover:text-violet-400'
          }`}
        >
          <Sparkles size={10} />
          {open ? 'HIDE' : 'AI PREVIEW'}
          {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {/* AI Preview panel */}
      {open && (
        <div className="px-4 pb-4 pt-1 bg-gray-950/60 border-t border-gray-800/60">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={11} className="text-violet-400" />
            <span className="text-[10px] text-violet-400 font-bold tracking-widest uppercase">AI Pre-Earnings Preview</span>
            <span className="text-[10px] text-gray-600">— {stock.symbol} · reports in {days} day{days !== 1 ? 's' : ''}</span>
            {loading && <Loader2 size={10} className="animate-spin text-gray-600 ml-auto" />}
          </div>

          {error ? (
            <div className="flex items-center gap-2 text-red-400 text-[11px]">
              <AlertTriangle size={12} /> {error}
            </div>
          ) : text ? (
            <div className="pl-1 border-l-2 border-violet-500/30">
              <PreviewText text={text} />
              {loading && <span className="inline-block w-1.5 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-middle" />}
            </div>
          ) : loading ? (
            <div className="text-gray-600 text-[11px] animate-pulse">Generating preview…</div>
          ) : null}

          <p className="text-[9px] text-gray-700 mt-3">
            AI-generated analysis for informational purposes only. Not investment advice. Verify with primary sources.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EarningsCalendarTab({ stocks }) {
  const [window, setWindow]   = useState(30)  // days ahead
  const [sector, setSector]   = useState('All')
  const [minScore, setMinScore] = useState(0)

  const sectors = useMemo(() => {
    const s = [...new Set(stocks.map(s => s.sector).filter(Boolean))].sort()
    return ['All', ...s]
  }, [stocks])

  const grouped = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const cutoff = new Date(today); cutoff.setDate(today.getDate() + window)

    const filtered = stocks.filter(s => {
      if (!s.earningsDate) return false
      const d = new Date(s.earningsDate + 'T00:00:00')
      if (d < today || d > cutoff) return false
      if (sector !== 'All' && s.sector !== sector) return false
      if ((s.valueScore ?? 0) < minScore) return false
      return true
    }).sort((a, b) => a.earningsDate.localeCompare(b.earningsDate))

    // Group by date string
    const map = new Map()
    for (const s of filtered) {
      const key = s.earningsDate
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(s)
    }
    return map
  }, [stocks, window, sector, minScore])

  const total = [...grouped.values()].reduce((n, arr) => n + arr.length, 0)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={13} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Earnings Calendar</h2>
          </div>
          <p className="text-[11px] text-gray-500">
            Upcoming earnings from your screened universe · AI pre-earnings preview per stock
          </p>
        </div>
        <div className="text-right text-[10px] text-gray-600">
          <div>{total} report{total !== 1 ? 's' : ''} in the next {window} days</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Window */}
        <div className="flex items-center gap-0">
          {[7, 14, 30, 60].map(d => (
            <button
              key={d}
              onClick={() => setWindow(d)}
              className={`px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase border-y border-r first:border-l transition-colors ${
                window === d
                  ? 'border-blue-500/60 bg-blue-500/10 text-blue-300'
                  : 'border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {d}D
            </button>
          ))}
        </div>

        {/* Sector */}
        <select
          value={sector}
          onChange={e => setSector(e.target.value)}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-[11px] px-3 py-1.5 focus:outline-none focus:border-gray-600"
        >
          {sectors.map(s => <option key={s}>{s}</option>)}
        </select>

        {/* Min score */}
        <select
          value={minScore}
          onChange={e => setMinScore(Number(e.target.value))}
          className="bg-gray-900 border border-gray-800 text-gray-300 text-[11px] px-3 py-1.5 focus:outline-none focus:border-gray-600"
        >
          {[0, 40, 50, 60, 70].map(v => (
            <option key={v} value={v}>{v === 0 ? 'Any Score' : `Score ≥ ${v}`}</option>
          ))}
        </select>
      </div>

      {/* Calendar groups */}
      {grouped.size === 0 ? (
        <div className="py-16 text-center text-gray-600 text-sm">
          No earnings found in the next {window} days matching these filters.
          <div className="text-[11px] mt-2 text-gray-700">
            Earnings dates populate from the data pipeline — try a wider window or check back after the next data refresh.
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([dateStr, day_stocks]) => {
            const days = daysUntil(dateStr)
            return (
              <div key={dateStr} className="border border-gray-800">
                {/* Date header */}
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-900/50 border-b border-gray-800">
                  <span className="text-white font-bold text-[12px] tracking-wider">{fmtDate(dateStr)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 border ${
                    days <= 1 ? 'text-orange-300 border-orange-500/40 bg-orange-500/10'
                    : days <= 7 ? 'text-yellow-400 border-yellow-500/30'
                    : 'text-gray-500 border-gray-700'
                  }`}>
                    {days === 0 ? 'TODAY' : days === 1 ? 'TOMORROW' : `IN ${days} DAYS`}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-auto">
                    {day_stocks.length} report{day_stocks.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Column headers */}
                <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-950/40 border-b border-gray-900">
                  <div className="w-28 shrink-0 text-[9px] text-gray-600 uppercase tracking-wider">Ticker</div>
                  <div className="w-16 shrink-0 text-[9px] text-gray-600 uppercase tracking-wider">Days</div>
                  <div className="w-28 shrink-0 text-[9px] text-gray-600 uppercase tracking-wider">Sector</div>
                  <div className="flex gap-5 flex-1 text-[9px] text-gray-600 uppercase tracking-wider">
                    <div className="w-10 text-center">Score</div>
                    <div className="w-12 text-center">Fwd P/E</div>
                    <div className="w-16 text-center">Rev Growth</div>
                    <div className="w-16 text-center">Op Margin</div>
                    <div className="w-16 text-center">Mkt Cap</div>
                    <div className="w-20 text-center">Consensus</div>
                  </div>
                  <div className="shrink-0 w-24" />
                </div>

                {/* Rows */}
                {day_stocks.map(s => <EarningsRow key={s.symbol} stock={s} />)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
