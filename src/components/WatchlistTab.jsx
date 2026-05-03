import { useState } from 'react'
import { Star, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, BookmarkX } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import StockDetailModal from './StockDetailModal'
import ScoreHistoryModal from './ScoreHistoryModal'

function fmt(v, d = 1)  { return v != null && !isNaN(v) ? Number(v).toFixed(d) : '—' }
function pct(v)          { return v != null ? `${(v * 100).toFixed(1)}%` : '—' }
function signColor(v)    { return (v ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' }
function fmtMcap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(1)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1 day ago'
  if (d < 30)  return `${d} days ago`
  const m = Math.floor(d / 30)
  return m === 1 ? '1 month ago' : `${m} months ago`
}

const SORT_OPTIONS = [
  { key: 'addedAt',      label: 'Date Added',   dir: 'desc' },
  { key: 'valueScore',   label: 'Value Score',  dir: 'desc' },
  { key: 'return1y',     label: '1Y Return',    dir: 'desc' },
  { key: 'marketCap',    label: 'Market Cap',   dir: 'desc' },
]

export default function WatchlistTab({ stocks, watchlist, onRemove, onSetNote }) {
  const [sortKey,     setSortKey]     = useState('addedAt')
  const [sortDir,     setSortDir]     = useState('desc')
  const [detailStock, setDetailStock] = useState(null)
  const [historyStock,setHistoryStock]= useState(null)
  const [editingNote, setEditingNote] = useState(null) // symbol being edited

  const entries = Object.entries(watchlist) // [symbol, { addedAt, note }]

  const watchedStocks = entries
    .map(([symbol, meta]) => {
      const stock = stocks.find(s => s.symbol === symbol)
      return stock ? { ...stock, ...meta } : { symbol, ...meta, _missing: true }
    })
    .sort((a, b) => {
      if (sortKey === 'addedAt') {
        return sortDir === 'desc'
          ? new Date(b.addedAt) - new Date(a.addedAt)
          : new Date(a.addedAt) - new Date(b.addedAt)
      }
      const av = a[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const bv = b[sortKey] ?? (sortDir === 'desc' ? -Infinity : Infinity)
      return sortDir === 'desc' ? bv - av : av - bv
    })

  function cycleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir(SORT_OPTIONS.find(o => o.key === key)?.dir ?? 'desc')
    }
  }

  function SortIcon({ k }) {
    if (sortKey !== k) return <ChevronsUpDown size={10} className="inline ml-1 text-gray-700" />
    return sortDir === 'desc'
      ? <ChevronDown size={10} className="inline ml-1 text-blue-400" />
      : <ChevronUp   size={10} className="inline ml-1 text-blue-400" />
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Star size={32} className="text-gray-800 mb-4" />
        <p className="text-gray-500 text-sm mb-1">Your watchlist is empty</p>
        <p className="text-gray-700 text-xs">
          Click the <Star size={11} className="inline mb-0.5" /> star next to any stock in the Value Screener to add it here.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-widest uppercase flex items-center gap-2">
            <Star size={13} className="text-yellow-400" />
            Watchlist
          </h2>
          <p className="text-[11px] text-gray-600 mt-0.5">{watchedStocks.length} stock{watchedStocks.length !== 1 ? 's' : ''} · stored in your browser</p>
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-700 uppercase tracking-wider mr-1">Sort:</span>
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => cycleSort(o.key)}
              className={`px-2 py-1 text-[10px] border rounded transition-colors ${
                sortKey === o.key
                  ? 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                  : 'border-gray-800 text-gray-600 hover:text-gray-400'
              }`}
            >
              {o.label}
              <SortIcon k={o.key} />
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-600 text-left">
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] w-24">Score</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Ticker</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] min-w-[160px]">Company</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Sector</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">Price</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">Mkt Cap</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">P/E</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">P/FCF</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">FCF Mgn</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">Rev G</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">RSI</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] text-right">1Y Ret</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Added</th>
              <th className="pb-2 pr-3 font-medium uppercase tracking-wider text-[10px] min-w-[180px]">Notes</th>
              <th className="pb-2 font-medium uppercase tracking-wider text-[10px] w-8"></th>
            </tr>
          </thead>
          <tbody>
            {watchedStocks.map(s => (
              <tr key={s.symbol} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors group">
                {/* Score */}
                <td className="py-2.5 pr-3">
                  {s._missing
                    ? <span className="text-gray-700 text-[10px]">no data</span>
                    : <div className="flex items-center gap-1">
                        <ScoreBadge score={s.valueScore} />
                      </div>
                  }
                </td>

                {/* Ticker */}
                <td className="py-2.5 pr-3">
                  <button
                    onClick={() => !s._missing && setDetailStock(s)}
                    className="font-bold text-white tracking-wide hover:text-blue-400 transition-colors"
                  >
                    {s.symbol}
                  </button>
                </td>

                {/* Company */}
                <td className="py-2.5 pr-3 text-gray-400 max-w-[180px] truncate">{s.name ?? '—'}</td>

                {/* Sector */}
                <td className="py-2.5 pr-3 text-gray-600 whitespace-nowrap">{s.sector ?? '—'}</td>

                {/* Price */}
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-300">
                  {s.price ? `$${s.price.toFixed(2)}` : '—'}
                </td>

                {/* Mkt Cap */}
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-500">{fmtMcap(s.marketCap)}</td>

                {/* P/E */}
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">{fmt(s.peRatio)}</td>

                {/* P/FCF */}
                <td className="py-2.5 pr-3 text-right tabular-nums text-gray-400">{fmt(s.pFcf)}</td>

                {/* FCF Margin */}
                <td className={`py-2.5 pr-3 text-right tabular-nums ${signColor(s.fcfMargin)}`}>{pct(s.fcfMargin)}</td>

                {/* Rev Growth */}
                <td className={`py-2.5 pr-3 text-right tabular-nums ${signColor(s.revenueGrowth)}`}>
                  {s.revenueGrowth != null ? `${(s.revenueGrowth * 100) >= 0 ? '+' : ''}${(s.revenueGrowth * 100).toFixed(1)}%` : '—'}
                </td>

                {/* RSI */}
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {s.rsi != null
                    ? <span className={s.rsi <= 35 ? 'text-emerald-400' : s.rsi <= 55 ? 'text-blue-400' : s.rsi <= 65 ? 'text-yellow-400' : 'text-red-400'}>
                        {fmt(s.rsi)}
                      </span>
                    : <span className="text-gray-600">—</span>
                  }
                </td>

                {/* 1Y Return */}
                <td className={`py-2.5 pr-3 text-right tabular-nums ${signColor(s.return1y)}`}>
                  {s.return1y != null ? `${s.return1y >= 0 ? '+' : ''}${fmt(s.return1y)}%` : '—'}
                </td>

                {/* Added */}
                <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap text-[10px]">
                  {timeAgo(s.addedAt)}
                </td>

                {/* Notes */}
                <td className="py-2.5 pr-3 min-w-[180px]">
                  {editingNote === s.symbol
                    ? <input
                        autoFocus
                        defaultValue={s.note}
                        onBlur={e => { onSetNote(s.symbol, e.target.value); setEditingNote(null) }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.target.blur() }}
                        className="w-full bg-gray-800 border border-gray-600 text-gray-200 text-[11px] px-2 py-1 focus:outline-none focus:border-blue-500 rounded"
                        placeholder="Add a note..."
                      />
                    : <button
                        onClick={() => setEditingNote(s.symbol)}
                        className="text-left w-full text-[11px] text-gray-600 hover:text-gray-400 transition-colors italic truncate max-w-[180px]"
                        title={s.note || 'Click to add a note'}
                      >
                        {s.note || <span className="text-gray-800 not-italic">+ add note</span>}
                      </button>
                  }
                </td>

                {/* Remove */}
                <td className="py-2.5">
                  <button
                    onClick={() => onRemove(s.symbol)}
                    className="text-gray-800 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from watchlist"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailStock && <StockDetailModal stock={detailStock} onClose={() => setDetailStock(null)} />}
      {historyStock && <ScoreHistoryModal symbol={historyStock.symbol} name={historyStock.name} currentScore={historyStock.valueScore} onClose={() => setHistoryStock(null)} />}
    </>
  )
}
