import { useState, useEffect } from 'react'
import { RefreshCw, Info } from 'lucide-react'
import ScoreBadge from './ScoreBadge'

function YieldBadge({ value }) {
  if (!value) return <span className="text-gray-600">—</span>
  const color = value >= 30 ? 'text-emerald-400' : value >= 15 ? 'text-blue-400' : 'text-yellow-400'
  return <span className={`font-bold tabular-nums ${color}`}>{value}%</span>
}

export default function OptionsSection() {
  const [options, setOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/options.json')
        if (!res.ok) throw new Error('Options data not found')
        const json = await res.json()
        setOptions(json.options || [])
        setLastUpdated(json.lastUpdated)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      {/* Disclaimer */}
      <div className="flex gap-2 items-start bg-yellow-500/5 border border-yellow-500/20 rounded p-3 mb-5 text-xs text-yellow-200/60">
        <Info size={13} className="mt-0.5 shrink-0 text-yellow-500/50" />
        <span>
          <strong className="text-yellow-400/80">Research only.</strong> These are algorithmically identified
          cash-secured put opportunities based on value score and premium yield. Not financial advice.
          Options involve risk of loss. Verify all data independently before making any decision.
        </span>
      </div>

      {/* Strategy explanation */}
      <div className="mb-5 text-xs text-gray-500 leading-relaxed max-w-3xl">
        <strong className="text-gray-400">Strategy: Cash-Secured Puts</strong> — Sell a put option on a
        stock you'd be happy to own. You collect the premium immediately. If the stock stays above the
        strike at expiry, you keep the premium as profit. If it falls below, you buy the stock at the
        strike (reduced by the premium collected). Ranked by annualized yield × value score.
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-16 text-gray-600">
          <RefreshCw size={14} className="animate-spin" /> Loading options data...
        </div>
      )}

      {error && (
        <div className="py-16 text-center text-gray-600 text-sm">
          <p className="text-red-400 mb-1">Could not load options data.</p>
          <p>Run <code className="bg-gray-900 px-1 rounded">python scripts/fetch_data.py</code> to generate it.</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 mb-4">
              <RefreshCw size={11} />
              Updated {new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-3">Rank</th>
                  <th className="px-3 py-3">Ticker</th>
                  <th className="px-3 py-3">Company</th>
                  <th className="px-3 py-3">Sector</th>
                  <th className="px-3 py-3">Value Score</th>
                  <th className="px-3 py-3">Stock Price</th>
                  <th className="px-3 py-3">Strike</th>
                  <th className="px-3 py-3">% OTM</th>
                  <th className="px-3 py-3">Expiry</th>
                  <th className="px-3 py-3">DTE</th>
                  <th className="px-3 py-3">Bid</th>
                  <th className="px-3 py-3">Open Int.</th>
                  <th className="px-3 py-3">IV</th>
                  <th className="px-3 py-3">Ann. Yield</th>
                  <th className="px-3 py-3">Break-Even</th>
                </tr>
              </thead>
              <tbody>
                {options.map((o, i) => (
                  <tr
                    key={`${o.symbol}-${o.strike}-${o.expiry}`}
                    className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-950/50'}`}
                  >
                    <td className="px-3 py-3 text-gray-600 text-xs font-mono">#{i + 1}</td>
                    <td className="px-3 py-3 font-bold text-white tracking-wide">{o.symbol}</td>
                    <td className="px-3 py-3">
                      <span className="text-gray-300 truncate block max-w-[180px]" title={o.name}>{o.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded-full whitespace-nowrap">{o.sector}</span>
                    </td>
                    <td className="px-3 py-3"><ScoreBadge score={o.valueScore} /></td>
                    <td className="px-3 py-3 tabular-nums text-gray-300">${o.stockPrice?.toFixed(2)}</td>
                    <td className="px-3 py-3 tabular-nums text-white font-medium">${o.strike?.toFixed(2)}</td>
                    <td className="px-3 py-3 tabular-nums text-gray-400">{o.pctOtm}%</td>
                    <td className="px-3 py-3 tabular-nums text-gray-300 whitespace-nowrap">{o.expiry}</td>
                    <td className="px-3 py-3 tabular-nums text-gray-400">{o.dte}d</td>
                    <td className="px-3 py-3 tabular-nums text-emerald-400">${o.bid?.toFixed(2)}</td>
                    <td className="px-3 py-3 tabular-nums text-gray-400">{o.openInterest?.toLocaleString()}</td>
                    <td className="px-3 py-3 tabular-nums text-gray-400">{o.impliedVolatility}%</td>
                    <td className="px-3 py-3"><YieldBadge value={o.annualizedYield} /></td>
                    <td className="px-3 py-3 tabular-nums text-gray-400">${o.breakEven?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {options.length === 0 && (
              <div className="text-center py-16 text-gray-600">No qualifying options found in latest data refresh.</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
