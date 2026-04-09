import { useState, useMemo } from 'react'
import { useStocks } from './hooks/useStocks'
import StockTable from './components/StockTable'
import Filters from './components/Filters'
import { TrendingUp, RefreshCw } from 'lucide-react'

const DEFAULT_FILTERS = {
  search: '',
  sector: '',
  minMarketCap: 0,
  minScore: 0,
}

export default function App() {
  const { stocks, loading, error, lastUpdated } = useStocks()
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

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
            <TrendingUp size={20} className="text-blue-400" />
            <h1 className="text-lg font-semibold text-white tracking-tight">Value Stock Screener</h1>
            <span className="text-xs text-gray-600 border border-gray-800 px-2 py-0.5 rounded">US Listed · Mkt Cap &gt;$300M</span>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <RefreshCw size={11} />
              Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-5">
        {/* Score legend */}
        <div className="flex gap-4 mb-5 text-xs text-gray-500">
          <span>Value Score (sector-relative):</span>
          <span className="text-emerald-400">75–100 Strong value</span>
          <span className="text-blue-400">55–74 Moderate value</span>
          <span className="text-yellow-400">35–54 Fair</span>
          <span className="text-red-400">0–34 Expensive</span>
        </div>

        {/* Filters */}
        <div className="mb-5">
          <Filters sectors={sectors} filters={filters} onChange={setFilters} />
        </div>

        {/* Count */}
        {!loading && !error && (
          <div className="mb-3 text-xs text-gray-600">
            {filtered.length.toLocaleString()} of {stocks.length.toLocaleString()} stocks
          </div>
        )}

        {/* States */}
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
            <p className="text-gray-700 text-xs mt-4">
              Run <code className="bg-gray-900 px-1 py-0.5 rounded">python scripts/fetch_data.py</code> to generate the data file.
            </p>
          </div>
        )}

        {!loading && !error && <StockTable data={filtered} />}
      </div>
    </div>
  )
}
