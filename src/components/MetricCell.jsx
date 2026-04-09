export default function MetricCell({ value, format = 'ratio' }) {
  if (value == null || isNaN(value) || value <= 0) {
    return <span className="text-gray-600">—</span>
  }

  let display
  if (format === 'percent') {
    display = `${(value * 100).toFixed(1)}%`
  } else if (format === 'marketcap') {
    if (value >= 1e12) display = `$${(value / 1e12).toFixed(1)}T`
    else if (value >= 1e9) display = `$${(value / 1e9).toFixed(1)}B`
    else display = `$${(value / 1e6).toFixed(0)}M`
  } else {
    display = value.toFixed(1) + 'x'
  }

  return <span className="tabular-nums">{display}</span>
}
