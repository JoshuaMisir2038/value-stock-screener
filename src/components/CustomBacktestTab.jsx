import { useState, useMemo } from 'react'
import { TrendingUp, TrendingDown, BarChart2, Info } from 'lucide-react'

const PERIODS = [
  { key: 'return1m',  label: '1 Month',  spyKey: 'return1m'  },
  { key: 'return3m',  label: '3 Months', spyKey: 'return3m'  },
  { key: 'return6m',  label: '6 Months', spyKey: 'return6m'  },
  { key: 'return1y',  label: '1 Year',   spyKey: 'return1y'  },
  { key: 'return2y',  label: '2 Years',  spyKey: 'return2y'  },
  { key: 'return3y',  label: '3 Years',  spyKey: 'return3y'  },
  { key: 'return5y',  label: '5 Years',  spyKey: 'return5y'  },
]

function mean(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null }
function median(arr) {
  if (!arr.length) return null
  const s = [...arr].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
function stddev(arr) {
  const m = mean(arr)
  if (m === null) return null
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length)
}

function DistBar({ returns, spyReturn, period }) {
  if (!returns.length) return null
  const min = Math.min(...returns, spyReturn ?? 0)
  const max = Math.max(...returns, spyReturn ?? 0)
  const range = max - min || 1
  const BINS = 12
  const binSize = range / BINS
  const bins = Array.from({ length: BINS }, (_, i) => ({
    lo: min + i * binSize,
    hi: min + (i + 1) * binSize,
    count: 0,
  }))
  returns.forEach(r => {
    const i = Math.min(BINS - 1, Math.floor((r - min) / binSize))
    bins[i].count++
  })
  const maxCount = Math.max(...bins.map(b => b.count), 1)

  return (
    <div>
      <div className="flex items-end gap-0.5 h-20">
        {bins.map((b, i) => {
          const hasspy = spyReturn !== null && spyReturn >= b.lo && spyReturn < b.hi
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
              <div
                className={`w-full rounded-t transition-colors ${hasspy ? 'bg-yellow-400/60' : 'bg-blue-500/40 group-hover:bg-blue-500/60'}`}
                style={{ height: `${(b.count / maxCount) * 100}%`, minHeight: b.count ? 2 : 0 }}
              />
              {b.count > 0 && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
                  {b.lo.toFixed(1)}% to {b.hi.toFixed(1)}%: {b.count}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-700 mt-1">
        <span>{min.toFixed(1)}%</span>
        <span>{max.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, color = 'text-white' }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded px-4 py-3">
      <p className="text-[11px] text-gray-600 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function sign(v) { return v >= 0 ? '+' : '' }

function PeriodResults({ period, returns, spy, stockList }) {
  if (!returns.length) return <div className="text-gray-600 text-sm">No return data for this period.</div>

  const avg = mean(returns)
  const med = median(returns)
  const sd  = stddev(returns)
  const wins = returns.filter(r => r > (spy ?? 0)).length
  const winRate = (wins / returns.length) * 100
  const best  = Math.max(...returns)
  const worst = Math.min(...returns)
  const bestStock  = stockList.find(s => (s[period.key] ?? null) === best)
  const worstStock = stockList.find(s => (s[period.key] ?? null) === worst)

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Avg Return (equal-weight)"
          value={`${sign(avg)}${avg.toFixed(1)}%`}
          sub={spy !== null ? `SPY: ${sign(spy)}${spy.toFixed(1)}%` : undefined}
          color={avg >= (spy ?? 0) ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          label="Median Return"
          value={`${sign(med)}${med.toFixed(1)}%`}
          color={med >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          label="Beat SPY Rate"
          value={`${winRate.toFixed(0)}%`}
          sub={`${wins} of ${returns.length} stocks`}
          color={winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}
        />
        <StatCard
          label="Std Deviation"
          value={`${sd.toFixed(1)}%`}
          sub="Return volatility"
        />
      </div>

      {/* Best / Worst */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded px-4 py-3">
          <p className="text-[11px] text-gray-600 mb-1 flex items-center gap-1"><TrendingUp size={10} /> Best performer</p>
          <p className="text-emerald-400 font-bold text-sm">{bestStock?.symbol} <span className="font-normal text-xs">{bestStock?.name}</span></p>
          <p className="text-emerald-400 text-lg font-bold">{sign(best)}{best.toFixed(1)}%</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded px-4 py-3">
          <p className="text-[11px] text-gray-600 mb-1 flex items-center gap-1"><TrendingDown size={10} /> Worst performer</p>
          <p className="text-red-400 font-bold text-sm">{worstStock?.symbol} <span className="font-normal text-xs">{worstStock?.name}</span></p>
          <p className="text-red-400 text-lg font-bold">{sign(worst)}{worst.toFixed(1)}%</p>
        </div>
      </div>

      {/* Distribution chart */}
      <div>
        <p className="text-xs text-gray-600 mb-2">Return distribution — yellow band = SPY return</p>
        <DistBar returns={returns} spyReturn={spy} period={period} />
      </div>

      {/* Per-stock table */}
      <div>
        <p className="text-xs text-gray-600 mb-2">All {returns.length} stocks — sorted by return</p>
        <div className="overflow-x-auto max-h-64 overflow-y-auto border border-gray-800 rounded">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-950">
              <tr className="border-b border-gray-800 text-gray-600">
                <th className="text-left px-3 py-2 font-medium">Ticker</th>
                <th className="text-left px-3 py-2 font-medium">Name</th>
                <th className="text-left px-3 py-2 font-medium">Sector</th>
                <th className="text-right px-3 py-2 font-medium">Return</th>
                <th className="text-right px-3 py-2 font-medium">vs SPY</th>
              </tr>
            </thead>
            <tbody>
              {[...stockList]
                .filter(s => s[period.key] !== null && s[period.key] !== undefined)
                .sort((a, b) => b[period.key] - a[period.key])
                .map(s => {
                  const ret = s[period.key]
                  const alpha = spy !== null ? ret - spy : null
                  return (
                    <tr key={s.symbol} className="border-b border-gray-900 hover:bg-gray-900/40">
                      <td className="px-3 py-1.5 font-bold text-white">{s.symbol}</td>
                      <td className="px-3 py-1.5 text-gray-500 max-w-[180px] truncate">{s.name}</td>
                      <td className="px-3 py-1.5 text-gray-600">{s.sector}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold ${ret >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {sign(ret)}{ret.toFixed(1)}%
                      </td>
                      <td className={`px-3 py-1.5 text-right ${alpha !== null ? (alpha >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-700'}`}>
                        {alpha !== null ? `${sign(alpha)}${alpha.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function CustomBacktestTab({ stocks, benchmark, backtestPayload }) {
  const [activePeriod, setActivePeriod] = useState('return1y')

  const stockList = backtestPayload?.results ?? []
  const filterDesc = useMemo(() => {
    if (!backtestPayload?.filters) return null
    const f = backtestPayload.filters
    const parts = []
    if (f.sectors?.length) parts.push(`Sectors: ${f.sectors.join(', ')}`)
    if (f.maxPE)         parts.push(`P/E ≤ ${f.maxPE}`)
    if (f.maxPB)         parts.push(`P/B ≤ ${f.maxPB}`)
    if (f.maxPFCF)       parts.push(`P/FCF ≤ ${f.maxPFCF}`)
    if (f.minFCFMargin)  parts.push(`FCF Margin ≥ ${f.minFCFMargin}%`)
    if (f.minGrossMargin)parts.push(`Gross Margin ≥ ${f.minGrossMargin}%`)
    if (f.minRevGrowth)  parts.push(`Rev Growth ≥ ${f.minRevGrowth}%`)
    if (f.minRSI)        parts.push(`RSI ≥ ${f.minRSI}`)
    if (f.maxRSI)        parts.push(`RSI ≤ ${f.maxRSI}`)
    if (f.aboveMa200 === true) parts.push('Above 200MA')
    if (f.minDividendYield) parts.push(`Yield ≥ ${f.minDividendYield}%`)
    if (f.minValueScore) parts.push(`Score ≥ ${f.minValueScore}`)
    if (f.minMarketCap)  parts.push(`Mkt Cap ≥ $${f.minMarketCap}B`)
    return parts
  }, [backtestPayload])

  if (!backtestPayload || !stockList.length) {
    return (
      <div className="py-32 text-center">
        <BarChart2 size={32} className="text-gray-800 mx-auto mb-4" />
        <p className="text-gray-500 text-sm mb-1">No screen to backtest yet</p>
        <p className="text-gray-700 text-xs">Go to the Custom Screener tab, set your filters, and click <strong className="text-gray-500">"Backtest This Screen"</strong></p>
      </div>
    )
  }

  const period = PERIODS.find(p => p.key === activePeriod)
  const spy = benchmark?.spy?.[period.spyKey] ?? null

  const returns = stockList
    .map(s => s[activePeriod])
    .filter(r => r !== null && r !== undefined)

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <BarChart2 size={16} />
            Custom Screen Backtest
          </h2>
          <p className="text-gray-600 text-xs mt-0.5">{stockList.length} stocks · equal-weight portfolio</p>
          {filterDesc?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {filterDesc.map((d, i) => (
                <span key={i} className="text-[11px] px-2 py-0.5 rounded border border-gray-800 text-gray-500 bg-gray-900/60">{d}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-gray-700 bg-gray-900 border border-gray-800 rounded px-2 py-1.5">
          <Info size={11} />
          Survivorship bias: uses current fundamentals applied to historical prices
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.key}
            onClick={() => setActivePeriod(p.key)}
            className={`px-3 py-1.5 rounded text-xs border transition-colors ${
              activePeriod === p.key
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <PeriodResults
        key={activePeriod}
        period={period}
        returns={returns}
        spy={spy}
        stockList={stockList}
      />
    </div>
  )
}
