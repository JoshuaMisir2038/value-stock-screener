import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

function formatMcap(v) {
  if (!v) return '—'
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9)  return `$${(v / 1e9).toFixed(1)}B`
  return `$${(v / 1e6).toFixed(0)}M`
}

function TickerItem({ stock }) {
  const chg = stock.change1d ?? stock.return1m ?? null
  const up  = chg !== null && chg >= 0

  return (
    <span className="inline-flex items-center gap-2 px-5 shrink-0 border-r border-gray-800/60 last:border-0">
      <span className="font-bold text-white text-xs tracking-wide">{stock.symbol}</span>
      {chg !== null ? (
        <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? '+' : ''}{chg.toFixed(2)}%
        </span>
      ) : (
        <span className="text-gray-600 text-xs">—</span>
      )}
      <span className="text-gray-600 text-[11px]">{formatMcap(stock.marketCap)}</span>
    </span>
  )
}

function BannerRow({ stocks, duration, reverse }) {
  // duplicate for seamless loop
  const items = [...stocks, ...stocks]

  return (
    <div className="overflow-hidden h-8 flex items-center border-b border-gray-800/50 bg-gray-950/80">
      <div
        className={`flex items-center whitespace-nowrap ${reverse ? 'ticker-reverse' : 'ticker-forward'}`}
        style={{ animationDuration: `${duration}s` }}
      >
        {items.map((s, i) => <TickerItem key={`${s.symbol}-${i}`} stock={s} />)}
      </div>
    </div>
  )
}

export default function TickerBanner({ stocks }) {
  const top100 = useMemo(() => {
    return [...stocks]
      .filter(s => s.marketCap)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 100)
  }, [stocks])

  if (!top100.length) return null

  const half1 = top100.slice(0, 50)
  const half2 = top100.slice(50, 100)

  return (
    <div>
      <BannerRow stocks={half1} duration={200} reverse={false} />
      <BannerRow stocks={half2} duration={240} reverse={true}  />
    </div>
  )
}
