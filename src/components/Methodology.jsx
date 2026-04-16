import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SCORE_METRICS } from '../utils/scoring'

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
      <p className="text-xs text-gray-500 mt-3 mb-4 leading-relaxed">
        Each stock receives a score from <strong className="text-gray-300">0–100</strong> representing how cheap it is
        relative to its sector peers — not the entire market. This makes a bank with a P/E of 10
        comparable to other banks, not to tech stocks. Here's how it works:
      </p>

      <div className="text-xs text-gray-500 mb-4 leading-relaxed space-y-1">
        <p><strong className="text-gray-300">Mkt Score</strong> — ranked against all 600+ stocks in the universe regardless of sector. A score of 80 means the stock is genuinely cheap vs the entire market. Use this to compare across sectors and allocate capital.</p>
        <p><strong className="text-gray-300">Sec Score</strong> — ranked only against companies in the same sector. A score of 80 means it's cheap relative to its peers. Use this to find the best names within a sector you've already decided to invest in.</p>
        <p className="pt-1"><strong className="text-gray-300">How it works:</strong> For each metric below, the stock is percentile-ranked (0–100%) within the comparison pool. Each percentile is multiplied by its weight, summed, then normalized to 0–100.</p>
      </div>

      <table className="w-full text-xs border-collapse mb-4">
        <thead>
          <tr className="border-b border-gray-800 text-gray-600 uppercase tracking-wider">
            <th className="py-2 text-left pr-4">Metric</th>
            <th className="py-2 text-left pr-4">Weight</th>
            <th className="py-2 text-left pr-4">Direction</th>
            <th className="py-2 text-left">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          {SCORE_METRICS.map(m => (
            <tr key={m.key} className="border-b border-gray-900">
              <td className="py-2 pr-4 font-medium text-gray-300 whitespace-nowrap">{m.label}</td>
              <td className="py-2 pr-4 text-blue-400 font-medium">{(m.weight * 100).toFixed(0)}%</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                <span className={m.lowerIsBetter ? 'text-emerald-400' : 'text-purple-400'}>
                  {m.lowerIsBetter ? '↓ Lower = better' : '↑ Higher = better'}
                </span>
              </td>
              <td className="py-2 text-gray-500">{m.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-4 gap-2 text-xs">
        {[
          { range: '75–100', label: 'Strong Value',    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' },
          { range: '55–74',  label: 'Moderate Value',  color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
          { range: '35–54',  label: 'Fair',            color: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' },
          { range: '0–34',   label: 'Expensive',       color: 'bg-red-500/10 border-red-500/30 text-red-400' },
        ].map(s => (
          <div key={s.range} className={`border rounded px-3 py-2 ${s.color}`}>
            <div className="font-bold">{s.range}</div>
            <div className="opacity-80">{s.label}</div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function OptionsMethodology() {
  return (
    <Section title="How are Options Ideas selected?">
      <p className="text-xs text-gray-500 mt-3 mb-4 leading-relaxed">
        Three distinct strategies, each filtered by a different combination of trend, momentum,
        and volatility signals. Criteria were refined through backtesting across 500+ stocks —
        BUY CALL intentionally omits a value score requirement since backtest showed
        momentum names (often "expensive" on fundamentals) produce the best call outcomes.
      </p>

      <div className="space-y-3 text-xs mb-4">
        {[
          {
            action: 'BUY CALL',
            color: 'border-emerald-500/40 bg-emerald-500/5',
            badge: 'text-emerald-400',
            criteria: [
              'Full uptrend alignment: price above both 50MA and 200MA, and 50MA > 200MA (golden cross)',
              'RSI 40–55: stock has pulled back within the uptrend — room to run without being oversold',
              'Positive 3-month momentum (return3m > 0): confirms trend is still active',
              'IV < 35%: avoids buying expensive premium (low IV rank proxy)',
              'Strike 0–4% OTM, 30–60 DTE: higher delta (~0.45) needs smaller move to profit',
              'Open interest ≥ 500 and bid-ask spread < 20% of mid: liquidity check',
              'No earnings within expiry window: avoids IV crush and binary event risk',
            ],
            profit: 'Profit if stock rises above break-even (strike + premium) before expiry.',
            loss: 'Max loss = premium paid × 100 per contract.',
          },
          {
            action: 'SELL PUT (Income)',
            color: 'border-orange-500/40 bg-orange-500/5',
            badge: 'text-orange-400',
            criteria: [
              'Stock is above its 200-day MA (stable uptrend — less risk of sudden drop)',
              'RSI between 40–65 (neutral — not about to crash)',
              'Value score ≥ 60 (you\'d genuinely want to own this stock at a lower price)',
              'Strike 5–12% below current price (OTM), 21–45 days to expiry',
              'Annualized yield must be meaningful (bid / strike × 365 / DTE)',
            ],
            profit: 'Profit = full premium collected if stock stays above strike at expiry.',
            loss: 'If stock falls below strike, you buy shares at strike price (reduced by premium). This is the intended outcome for a value investor.',
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
              'IV < 55% (avoid overpaying)',
            ],
            profit: 'Profit if stock falls below break-even (strike − premium) before expiry.',
            loss: 'Max loss = premium paid × 100 per contract.',
          },
        ].map(s => (
          <div key={s.action} className={`border rounded p-3 ${s.color}`}>
            <div className={`font-bold mb-2 ${s.badge}`}>{s.action}</div>
            <ul className="text-gray-500 space-y-0.5 mb-2">
              {s.criteria.map((c, i) => <li key={i} className="flex gap-2"><span>·</span><span>{c}</span></li>)}
            </ul>
            <p className="text-gray-400"><strong>Profit:</strong> {s.profit}</p>
            <p className="text-gray-500"><strong>Risk:</strong> {s.loss}</p>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-600 border-t border-gray-800 pt-3">
        <strong className="text-gray-500">RSI color coding:</strong>
        <span className="ml-2 text-emerald-400">≤35 oversold</span>
        <span className="ml-2 text-blue-400">35–55 neutral-low</span>
        <span className="ml-2 text-yellow-400">55–65 neutral-high</span>
        <span className="ml-2 text-red-400">≥65 overbought</span>
      </div>
    </Section>
  )
}
