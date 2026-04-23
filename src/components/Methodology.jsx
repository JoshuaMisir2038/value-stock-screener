import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function Section({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-800 rounded overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-300 hover:bg-gray-900 transition-colors text-left"
      >
        <span className="font-medium">{title}</span>
        {open ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>
      {open && <div className="px-4 pb-4 bg-gray-900/30">{children}</div>}
    </div>
  )
}

export function EquityMethodology() {
  return (
    <Section title="How is the Value Score calculated?">
      <div className="pt-3 space-y-3">
        <div className="flex gap-6 text-xs">
          <div>
            <span className="text-gray-300 font-bold">Mkt Score</span>
            <span className="text-gray-600 ml-2">percentile rank vs entire universe — use to compare across sectors</span>
          </div>
          <div>
            <span className="text-gray-300 font-bold">Sec Score</span>
            <span className="text-gray-600 ml-2">percentile rank within sector only — use to find the best name within a sector</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Each metric is percentile-ranked within its comparison pool, multiplied by its weight, summed, and normalised to 0–100.
          Weights and metrics are fully adjustable — use the panel below.
        </p>
        <div className="flex gap-2 text-[11px]">
          {[
            { range: '75–100', label: 'Strong Value',   color: 'border-emerald-500/30 text-emerald-400' },
            { range: '55–74',  label: 'Moderate Value', color: 'border-blue-500/30 text-blue-400' },
            { range: '35–54',  label: 'Fair',           color: 'border-yellow-500/30 text-yellow-400' },
            { range: '0–34',   label: 'Expensive',      color: 'border-red-500/30 text-red-400' },
          ].map(s => (
            <div key={s.range} className={`border px-2.5 py-1 ${s.color}`}>
              <span className="font-bold">{s.range}</span>
              <span className="opacity-70 ml-1.5">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

export function OptionsMethodology() {
  return (
    <Section title="How are Options Ideas selected?">
      <p className="text-xs text-gray-500 mt-3 mb-4 leading-relaxed">
        Three strategies filtered by trend, momentum, and volatility signals — iteratively refined
        through backtesting across 500+ stocks. BUY CALL reached a <strong className="text-gray-300">64% win rate</strong> and{' '}
        <strong className="text-gray-300">1.56 profit factor</strong> after applying the criteria below.
        No value score filter on calls — backtest confirmed momentum names outperform.
      </p>

      <div className="space-y-3 text-xs mb-4">
        {[
          {
            action: 'BUY CALL',
            color: 'border-emerald-500/40 bg-emerald-500/5',
            badge: 'text-emerald-400',
            criteria: [
              'Market regime gate: SPY must be above its 50MA — no calls in bear market conditions',
              'Full uptrend alignment: price above 50MA and 200MA, with 50MA > 200MA (golden cross)',
              'RSI 38–60: mild pullback within the uptrend — room to run, not oversold',
              'Positive 1-month momentum: confirms trend has real velocity behind it',
              'IV/HV ratio < 1.8: implied vol must be reasonable relative to actual realized vol — avoids overpaying for premium',
              'Strike 0–6% OTM, 25–65 DTE: higher delta requires a smaller move to profit',
              'Open interest ≥ 500 and bid-ask spread < 20% of mid: liquidity and fill quality',
              'No earnings within the expiry window: avoids IV crush and binary event risk',
            ],
            profit: 'Target exit: 50% gain on premium OR when 21 DTE remain — whichever comes first. This locks in directional moves before theta decay accelerates.',
            loss: 'Max loss = premium paid × 100 per contract if held to expiry.',
          },
          {
            action: 'SELL PUT (Income)',
            color: 'border-orange-500/40 bg-orange-500/5',
            badge: 'text-orange-400',
            criteria: [
              'Stock is above its 200-day MA (stable uptrend — less risk of sudden drop)',
              'RSI between 40–65 (neutral — not showing signs of breakdown)',
              'Value score ≥ 60: you would genuinely want to own this stock at a lower price',
              'Strike 5–12% below current price (OTM), 21–45 days to expiry',
              'Annualized yield must be meaningful (bid / strike × 365 / DTE)',
            ],
            profit: 'Target exit: buy back at 50% of premium collected OR at 21 DTE. Full premium kept if stock stays above strike at expiry.',
            loss: 'If stock falls below strike, you buy shares at strike price (offset by premium received). This is the intended outcome for a value investor.',
          },
          {
            action: 'BUY PUT (Bearish)',
            color: 'border-red-500/40 bg-red-500/5',
            badge: 'text-red-400',
            criteria: [
              'Stock is below its 200-day MA (long-term downtrend confirmed)',
              'RSI between 55–75: a bounce inside a downtrend — elevated and likely to fail',
              'Value score ≤ 45: overvalued fundamentals reinforce the bearish thesis',
              'Strike 3–8% below current price, 30–60 days to expiry',
              'IV < 55% (avoid overpaying into a spike)',
            ],
            profit: 'Target exit: 50% gain on premium OR at 21 DTE. Full profit if stock falls below break-even (strike − premium) before expiry.',
            loss: 'Max loss = premium paid × 100 per contract.',
          },
        ].map(s => (
          <div key={s.action} className={`border rounded p-3 ${s.color}`}>
            <div className={`font-bold mb-2 ${s.badge}`}>{s.action}</div>
            <ul className="text-gray-500 space-y-0.5 mb-2">
              {s.criteria.map((c, i) => <li key={i} className="flex gap-2"><span>·</span><span>{c}</span></li>)}
            </ul>
            <p className="text-gray-400"><strong>Exit:</strong> {s.profit}</p>
            <p className="text-gray-500"><strong>Risk:</strong> {s.loss}</p>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 border-t border-gray-800 pt-3 space-y-1">
        <div>
          <strong className="text-gray-500">RSI color coding:</strong>
          <span className="ml-2 text-emerald-400">≤35 oversold</span>
          <span className="ml-2 text-blue-400">35–55 neutral-low</span>
          <span className="ml-2 text-yellow-400">55–65 neutral-high</span>
          <span className="ml-2 text-red-400">≥65 overbought</span>
        </div>
        <div className="text-gray-700">
          Backtest uses Black-Scholes with 21-day realized vol as IV proxy. No slippage or commissions.
          Win rates reflect simulated exits at profit target or 21 DTE — not hold-to-expiry.
        </div>
      </div>
    </Section>
  )
}
