import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import ScoreBadge from './ScoreBadge'

function TradingViewChart({ symbol }) {
  const containerRef = useRef()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Unique ID per mount so re-opening same stock works
    const id = `tv_${symbol}_${Date.now()}`
    el.id = id

    const createWidget = () => {
      if (!containerRef.current || !window.TradingView) return
      new window.TradingView.widget({
        container_id:     id,
        autosize:         true,
        symbol:           symbol,
        interval:         'W',           // weekly default — gives 10Y+ in view
        timezone:         'America/New_York',
        theme:            'dark',
        style:            '1',           // candlestick
        locale:           'en',
        withdateranges:   true,          // shows 1M/3M/6M/1Y/5Y/ALL selector
        range:            '10Y',         // load 10Y by default
        hide_volume:      false,
        backgroundColor:  '#030712',     // gray-950 to match site
        gridColor:        '#111827',
        enable_publishing: false,
        save_image:       false,
      })
    }

    if (window.TradingView) {
      createWidget()
    } else {
      const script = document.createElement('script')
      script.src   = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = createWidget
      document.head.appendChild(script)
    }
  }, [symbol])

  return <div ref={containerRef} className="w-full" style={{ height: 520 }} />
}

export default function StockDetailModal({ stock, onClose }) {
  // Close on Escape
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const pctMa200 = stock.ma200 && stock.price
    ? ((stock.price - stock.ma200) / stock.ma200 * 100).toFixed(1)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80" />
      <div
        className="relative bg-gray-950 border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-bold text-white text-xl tracking-wide">{stock.symbol}</span>
            <ScoreBadge score={stock.valueScore} />
            <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-800 rounded-full whitespace-nowrap">
              {stock.sector}
            </span>
          </div>

          <div className="flex items-center gap-5">
            {/* Quick stats */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
              {stock.price   != null && <span className="tabular-nums text-white font-semibold">${stock.price.toFixed(2)}</span>}
              {stock.peRatio != null && <span>P/E <span className="text-gray-300">{stock.peRatio}</span></span>}
              {stock.rsi     != null && <span>RSI <span className={
                stock.rsi <= 35 ? 'text-emerald-400' : stock.rsi <= 55 ? 'text-blue-400' : stock.rsi <= 65 ? 'text-yellow-400' : 'text-red-400'
              }>{stock.rsi}</span></span>}
              {pctMa200 != null && (
                <span>vs 200MA <span className={stock.aboveMa200 ? 'text-emerald-400' : 'text-red-400'}>
                  {stock.aboveMa200 ? '▲' : '▼'}{Math.abs(pctMa200)}%
                </span></span>
              )}
            </div>

            <div className="text-right hidden sm:block">
              <div className="text-xs text-gray-500 max-w-[200px] truncate">{stock.name}</div>
            </div>

            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* TradingView Chart */}
        <TradingViewChart symbol={stock.symbol} />

        <div className="px-5 py-2 border-t border-gray-900 text-[10px] text-gray-700">
          Chart powered by TradingView · Click any timeframe button in the chart to change range · Use scroll to zoom
        </div>
      </div>
    </div>
  )
}
