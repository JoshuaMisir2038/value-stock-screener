import { useState, useEffect } from 'react'
import { Users, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function CommunityTrending({ stocks, onTickerClick }) {
  const [trending, setTrending] = useState([])

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('community_stock_stats')
      .select('symbol, watchers')
      .gt('watchers', 0)
      .order('watchers', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (!data?.length) return
        const enriched = data
          .map(row => {
            const stock = stocks.find(s => s.symbol === row.symbol)
            return { ...row, stock }
          })
          .filter(r => r.stock)
        setTrending(enriched)
      })
  }, [stocks])

  if (!trending.length) return null

  return (
    <div className="border border-gray-800 mb-5">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 bg-gray-900/30">
        <Users size={11} className="text-blue-400" />
        <span className="text-[11px] font-bold text-gray-200 uppercase tracking-widest">Trending in Community</span>
        <span className="text-[10px] text-gray-600 ml-1">— most watched by members</span>
      </div>
      <div className="flex overflow-x-auto">
        {trending.map(({ symbol, watchers, stock }, i) => {
          const chg = stock?.change1d ?? stock?.return1m ?? null
          const up  = chg != null && chg >= 0
          return (
            <button
              key={symbol}
              onClick={() => onTickerClick?.(stock)}
              className="flex flex-col items-start px-4 py-3 border-r border-gray-800 last:border-0 hover:bg-gray-900/50 transition-colors shrink-0 min-w-[100px]"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] text-gray-700 tabular-nums w-4">{i + 1}</span>
                <span className="text-sm font-extrabold text-white tracking-wide">{symbol}</span>
              </div>
              {chg != null && (
                <span className={`text-[11px] font-bold ${up ? 'text-green-400' : 'text-red-500'}`}>
                  {up ? '+' : ''}{chg.toFixed(2)}%
                </span>
              )}
              <div className="flex items-center gap-1 mt-1">
                <Users size={9} className="text-gray-700" />
                <span className="text-[10px] text-gray-600">{watchers}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
