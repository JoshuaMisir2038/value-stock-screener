import { Search } from 'lucide-react'

export default function Filters({ filters, onChange }) {
  return (
    <div className="flex items-center">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search ticker or company name..."
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className="pl-8 pr-4 py-2 bg-gray-900 border border-gray-700 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 w-72"
        />
      </div>
    </div>
  )
}
