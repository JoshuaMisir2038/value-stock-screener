import { useState, useEffect } from 'react'
import { RefreshCw, Info, TrendingUp, TrendingDown } from 'lucide-react'
import ScoreBadge from './ScoreBadge'
import { OptionsMethodology } from './Methodology'

function useMacro() {
  const [macro, setMacro] = useState(null)
  useEffect(() => {
    fetch('./data/macro.json').then(r => r.ok ? r.json() : null).then(setMacro).catch(() => {})
  }, [])
  return macro
}

function SentimentBanner({ macro }) {
  if (!macro) return null
  const vix   = macro.vix?.current
  const pcr   = macro.pcr?.equity?.value
  const t10y2 = macro.indicators?.T10Y2Y?.value

  const vixColor  = vix == null ? 'text-gray-500' : vix < 15 ? 'text-emerald-400' : vix < 25 ? 'text-yellow-400' : 'text-red-400'
  const vixLabel  = vix == null ? '—' : vix < 15 ? 'Calm' : vix < 25 ? 'Moderate' : vix < 35 ? 'Elevated' : 'Fear'
  const pcrColor  = pcr == null ? 'text-gray-500' : pcr < 0.7 ? 'text-red-400' : pcr <= 1.0 ? 'text-emerald-400' : 'text-yellow-400'
  const pcrLabel  = pcr == null ? '—' : pcr < 0.7 ? 'Greed' : pcr <= 0.9 ? 'Neutral' : pcr <= 1.2 ? 'Cautious' : 'Fear'
  const curveColor = t10y2 == null ? 'text-gray-500' : t10y2 >= 0 ? 'text-emerald-400' : 'text-red-400'
  const curveLabel = t10y2 == null ? '—' : t10y2 >= 0 ? 'Normal' : 'Inverted'

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5 text-xs">
      <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2.5">
        <div className="text-gray-600 mb-0.5">VIX</div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-bold tabular-nums ${vixColor}`}>{vix ?? '—'}</span>
          <span className={`${vixColor}`}>{vixLabel}</span>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2.5">
        <div className="text-gray-600 mb-0.5">Put/Call Ratio</div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-bold tabular-nums ${pcrColor}`}>{pcr ?? '—'}</span>
          <span className={`${pcrColor}`}>{pcrLabel}</span>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2.5">
        <div className="text-gray-600 mb-0.5">Yield Curve (10Y−2Y)</div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-base font-bold tabular-nums ${curveColor}`}>
            {t10y2 != null ? `${t10y2 > 0 ? '+' : ''}${t10y2}%` : '—'}
          </span>
          <span className={`${curveColor}`}>{curveLabel}</span>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2.5">
        <div className="text-gray-600 mb-0.5">Market Read</div>
        <div className="text-gray-300 font-medium leading-tight">
          {vix != null && pcr != null
            ? vix > 25 && pcr > 1.0
              ? '😨 High fear — potential buy signal'
              : vix < 15 && pcr < 0.7
              ? '🤑 Complacency — options are cheap'
              : '😐 Mixed — assess each trade independently'
            : '—'}
        </div>
      </div>
    </div>
  )
}

function RsiBadge({ value }) {
  if (value == null) return <span className="text-gray-600">—</span>
  let color
  if (value <= 35) color = 'text-emerald-400'       // oversold
  else if (value <= 55) color = 'text-blue-400'      // neutral-low
  else if (value <= 65) color = 'text-yellow-400'    // neutral-high
  else color = 'text-red-400'                        // overbought
  return <span className={`tabular-nums font-medium ${color}`}>{value}</span>
}

function Ma200Badge({ price, ma200, above }) {
  if (ma200 == null) return <span className="text-gray-600">—</span>
  const pct = ma200 ? ((price - ma200) / ma200 * 100).toFixed(1) : null
  const color = above ? 'text-emerald-400' : 'text-red-400'
  const arrow = above ? '▲' : '▼'
  return (
    <span className={`tabular-nums text-xs ${color}`}>
      {arrow} {Math.abs(pct)}%
    </span>
  )
}

function ActionBadge({ action, optionType }) {
  const isBuy = action === 'BUY'
  const color = isBuy ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${color}`}>
      {action} {optionType}
    </span>
  )
}

function OptionsTable({ rows, showYield }) {
  if (!rows.length) return <div className="text-center py-8 text-gray-600 text-sm">No qualifying options found.</div>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-gray-800 text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="px-3 py-3">#</th>
            <th className="px-3 py-3">Action</th>
            <th className="px-3 py-3">Ticker</th>
            <th className="px-3 py-3">Company</th>
            <th className="px-3 py-3">Sector</th>
            <th className="px-3 py-3">Val Score</th>
            <th className="px-3 py-3">Price</th>
            <th className="px-3 py-3">RSI</th>
            <th className="px-3 py-3">vs 200MA</th>
            <th className="px-3 py-3">Strike</th>
            <th className="px-3 py-3">% OTM</th>
            <th className="px-3 py-3">Expiry</th>
            <th className="px-3 py-3">DTE</th>
            <th className="px-3 py-3">Bid</th>
            <th className="px-3 py-3">Ask</th>
            <th className="px-3 py-3">IV</th>
            <th className="px-3 py-3">Open Int.</th>
            {showYield
              ? <th className="px-3 py-3">Ann. Yield</th>
              : <th className="px-3 py-3">Max Loss</th>}
            <th className="px-3 py-3">Break-Even</th>
            <th className="px-3 py-3">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => (
            <tr
              key={`${o.symbol}-${o.strike}-${o.expiry}-${i}`}
              className={`border-b border-gray-900 hover:bg-gray-900/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-950/50'}`}
            >
              <td className="px-3 py-3 text-gray-600 text-xs font-mono">#{i + 1}</td>
              <td className="px-3 py-3 whitespace-nowrap">
                <ActionBadge action={o.action} optionType={o.optionType} />
              </td>
              <td className="px-3 py-3 font-bold text-white tracking-wide">{o.symbol}</td>
              <td className="px-3 py-3">
                <span className="text-gray-300 truncate block max-w-[160px]" title={o.name}>{o.name}</span>
              </td>
              <td className="px-3 py-3">
                <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded-full whitespace-nowrap">{o.sector}</span>
              </td>
              <td className="px-3 py-3"><ScoreBadge score={o.valueScore} /></td>
              <td className="px-3 py-3 tabular-nums text-gray-300">${o.stockPrice?.toFixed(2)}</td>
              <td className="px-3 py-3"><RsiBadge value={o.rsi} /></td>
              <td className="px-3 py-3">
                <Ma200Badge price={o.stockPrice} ma200={o.ma200} above={o.aboveMa200} />
              </td>
              <td className="px-3 py-3 tabular-nums text-white font-medium">${o.strike?.toFixed(2)}</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">{o.pctOtm}%</td>
              <td className="px-3 py-3 tabular-nums text-gray-300 whitespace-nowrap">{o.expiry}</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">{o.dte}d</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">${o.bid?.toFixed(2)}</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">${o.ask?.toFixed(2)}</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">{o.impliedVolatility}%</td>
              <td className="px-3 py-3 tabular-nums text-gray-400">{o.openInterest?.toLocaleString()}</td>
              {showYield
                ? <td className="px-3 py-3 tabular-nums font-bold text-emerald-400">{o.annualizedYield}%</td>
                : <td className="px-3 py-3 tabular-nums text-red-400/70">${o.maxLoss?.toFixed(0)}</td>}
              <td className="px-3 py-3 tabular-nums text-gray-400">${o.breakEven?.toFixed(2)}</td>
              <td className="px-3 py-3 text-gray-500 text-xs whitespace-nowrap">{o.signal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function OptionsSection() {
  const macro = useMacro()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('calls')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/options.json')
        if (!res.ok) throw new Error('Options data not found')
        setData(await res.json())
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
      <SentimentBanner macro={macro} />

      <div className="mb-4">
        <OptionsMethodology />
      </div>

      {/* Disclaimer */}
      <div className="flex gap-2 items-start bg-yellow-500/5 border border-yellow-500/20 rounded p-3 mb-5 text-xs text-yellow-200/60">
        <Info size={13} className="mt-0.5 shrink-0 text-yellow-500/50" />
        <span>
          <strong className="text-yellow-400/80">Research only.</strong> Algorithmically identified
          options based on value score, RSI, and 200-day moving average. Not financial advice.
          Options involve significant risk including total loss of premium paid. Verify all data independently.
        </span>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 text-xs">
        <div className="bg-gray-900 border border-gray-800 rounded p-3">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-medium">
            <TrendingUp size={12} /> BUY CALL
          </div>
          <p className="text-gray-500 leading-relaxed">
            SPY above 50MA · Golden cross · RSI 38–60 · Positive 1M momentum ·
            IV/HV ratio &lt;1.8 · No earnings in window.
            Exit at 50% gain or 21 DTE remaining.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded p-3">
          <div className="flex items-center gap-2 mb-1.5 text-orange-400 font-medium">
            <TrendingDown size={12} /> SELL PUT (Income)
          </div>
          <p className="text-gray-500 leading-relaxed">
            Above 200MA · RSI 40–65 · Value score ≥60. Collect premium to potentially
            buy a stock you want anyway at a discount. Profitable if stock stays above strike.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded p-3">
          <div className="flex items-center gap-2 mb-1.5 text-red-400 font-medium">
            <TrendingDown size={12} /> BUY PUT (Bearish)
          </div>
          <p className="text-gray-500 leading-relaxed">
            Below 200MA (downtrend) · RSI 55–75 (overbought bounce likely to fail) · Low value score.
            You profit if the stock falls below break-even before expiry.
          </p>
        </div>
      </div>

      {/* RSI legend */}
      <div className="flex gap-4 mb-5 text-xs text-gray-500">
        <span>RSI:</span>
        <span className="text-emerald-400">≤35 Oversold</span>
        <span className="text-blue-400">35–55 Neutral-low</span>
        <span className="text-yellow-400">55–65 Neutral-high</span>
        <span className="text-red-400">≥65 Overbought</span>
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

      {!loading && !error && data && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {[
                { id: 'calls', label: `Calls (${data.calls?.length || 0})` },
                { id: 'puts',  label: `Puts (${data.puts?.length || 0})` },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`px-4 py-1.5 rounded text-sm border transition-colors ${
                    view === id
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                      : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {data.asOf && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <RefreshCw size={11} />
                Data as of {data.asOf}
              </div>
            )}
          </div>

          {view === 'calls' && (
            <OptionsTable rows={data.calls || []} showYield={false} />
          )}
          {view === 'puts' && (
            <OptionsTable rows={data.puts || []} showYield={true} />
          )}
        </>
      )}
    </div>
  )
}
