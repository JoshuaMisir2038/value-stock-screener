import { Search } from 'lucide-react'

const MARKET_CAPS = [
  { label: 'All', min: 0 },
  { label: '>$1B', min: 1e9 },
  { label: '>$10B', min: 10e9 },
  { label: '>$100B', min: 100e9 },
]

export default function Filters({ sectors, filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search ticker or name..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-8 pr-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-gray-600 w-56"
        />
      </div>

      {/* Sector */}
      <select
        value={filters.sector}
        onChange={e => onChange({ ...filters, sector: e.target.value })}
        className="px-3 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-100 focus:outline-none focus:border-gray-600"
      >
        <option value="">All Sectors</option>
        {sectors.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Market Cap */}
      <div className="flex gap-1">
        {MARKET_CAPS.map(cap => (
          <button
            key={cap.label}
            onClick={() => onChange({ ...filters, minMarketCap: cap.min })}
            className={`px-3 py-2 rounded text-xs border transition-colors ${
              filters.minMarketCap === cap.min
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600'
            }`}
          >
            {cap.label}
          </button>
        ))}
      </div>

      {/* Min Score */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Min score</span>
        <select
          value={filters.minScore}
          onChange={e => onChange({ ...filters, minScore: Number(e.target.value) })}
          className="px-2 py-2 bg-gray-900 border border-gray-800 rounded text-sm text-gray-100 focus:outline-none focus:border-gray-600"
        >
          <option value={0}>Any</option>
          <option value={50}>50+</option>
          <option value={65}>65+</option>
          <option value={75}>75+</option>
        </select>
      </div>
    </div>
  )
}
