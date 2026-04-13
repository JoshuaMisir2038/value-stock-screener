export default function MetricCell({ value, format = 'ratio', signed = false }) {
  if (value == null || isNaN(value)) return <span className="text-gray-600">—</span>

  // For non-signed fields, hide zero/negative values for ratios
  if (!signed && format === 'ratio' && value <= 0) return <span className="text-gray-600">—</span>

  let display
  let color = ''

  if (format === 'percent') {
    const pct = value * 100
    display = `${pct >= 0 && signed ? '+' : ''}${pct.toFixed(1)}%`
    if (signed) color = pct >= 0 ? 'text-emerald-400' : 'text-red-400'
  } else if (format === 'marketcap') {
    if (value >= 1e12) display = `$${(value / 1e12).toFixed(1)}T`
    else if (value >= 1e9) display = `$${(value / 1e9).toFixed(1)}B`
    else display = `$${(value / 1e6).toFixed(0)}M`
  } else {
    if (value <= 0) return <span className="text-gray-600">—</span>
    display = value.toFixed(1) + 'x'
  }

  return <span className={`tabular-nums ${color}`}>{display}</span>
}
