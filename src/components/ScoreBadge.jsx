export default function ScoreBadge({ score }) {
  if (score == null) return <span className="text-gray-500">—</span>

  let color
  if (score >= 75) color = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  else if (score >= 55) color = 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  else if (score >= 35) color = 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
  else color = 'bg-red-500/20 text-red-400 border border-red-500/30'

  return (
    <span className={`inline-flex items-center justify-center w-10 h-7 rounded text-xs font-bold ${color}`}>
      {score}
    </span>
  )
}
