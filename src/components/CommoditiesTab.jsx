import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'

const CATEGORY_META = {
  energy:  { label: 'Energy',  color: 'text-orange-400',  border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
  metals:  { label: 'Metals',  color: 'text-yellow-400',  border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
  grains:  { label: 'Grains',  color: 'text-lime-400',    border: 'border-lime-500/20',   bg: 'bg-lime-500/5' },
  softs:   { label: 'Softs',   color: 'text-purple-400',  border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
}

function ChangeCell({ value }) {
  if (value == null) return <span className="text-gray-600">—</span>
  const color = value > 0.01 ? 'text-emerald-400' : value < -0.01 ? 'text-red-400' : 'text-gray-500'
  const sign = value > 0 ? '+' : ''
  return <span className={`tabular-nums font-medium ${color}`}>{sign}{value}%</span>
}

function RangeBar({ price, low52, high52 }) {
  if (price == null || low52 == null || high52 == null || high52 === low52) return null
  const pct = Math.min(100, Math.max(0, ((price - low52) / (high52 - low52)) * 100))
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-gray-700 text-[10px] tabular-nums w-12 text-right">{low52.toFixed(1)}</span>
      <div className="relative w-16 h-1.5 bg-gray-800 rounded-full">
        <div className="absolute top-0 left-0 h-full bg-blue-500/50 rounded-full" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full" style={{ left: `calc(${pct}% - 3px)` }} />
      </div>
      <span className="text-gray-700 text-[10px] tabular-nums w-12">{high52.toFixed(1)}</span>
    </div>
  )
}

function CommodityCard({ item }) {
  const hasData = item.price != null
  const change1d = item.change1d
  const arrowColor = !change1d ? 'text-gray-600'
    : change1d > 0.01 ? 'text-emerald-400'
    : change1d < -0.01 ? 'text-red-400'
    : 'text-gray-500'

  return (
    <div className="bg-gray-900 border border-gray-800 rounded p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-medium text-gray-200 text-sm">{item.name}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">{item.ticker} · {item.unit}</div>
        </div>
        {change1d != null && (
          <span className={`text-xs font-medium tabular-nums ${arrowColor}`}>
            {change1d > 0 ? '▲' : change1d < 0 ? '▼' : '—'} {Math.abs(change1d)}%
          </span>
        )}
      </div>

      <div className="text-2xl font-bold text-white tabular-nums mb-3">
        {hasData ? item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <div className="text-gray-600 mb-0.5">1D</div>
          <ChangeCell value={item.change1d} />
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">1W</div>
          <ChangeCell value={item.change1w} />
        </div>
      </div>

      <RangeBar price={item.price} low52={item.low52} high52={item.high52} />
    </div>
  )
}

function CategorySection({ id, rows }) {
  const meta = CATEGORY_META[id] || { label: id, color: 'text-gray-300', border: 'border-gray-700', bg: 'bg-gray-800/20' }
  return (
    <div className="mb-8">
      <div className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-3 px-2.5 py-1 rounded border ${meta.color} ${meta.border} ${meta.bg}`}>
        {meta.label}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {rows.map(item => <CommodityCard key={item.ticker} item={item} />)}
      </div>
    </div>
  )
}

export default function CommoditiesTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/commodities.json')
        if (!res.ok) throw new Error('Commodities data not found')
        setData(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-20 text-gray-600">
        <RefreshCw size={14} className="animate-spin" /> Loading commodities data...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center text-gray-600 text-sm">
        <p className="text-red-400 mb-1">Could not load commodities data.</p>
        <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_market_data.py</code> to generate it.</p>
      </div>
    )
  }

  const categories = ['energy', 'metals', 'grains', 'softs']

  return (
    <div>
      {categories.map(cat =>
        data[cat]?.length > 0 && <CategorySection key={cat} id={cat} rows={data[cat]} />
      )}

      {data.asOf && (
        <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-2">
          <RefreshCw size={10} /> Data as of {data.asOf}
        </div>
      )}
    </div>
  )
}
