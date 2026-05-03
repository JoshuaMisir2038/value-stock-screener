import { useState, useCallback } from 'react'

const KEY = 'vf_watchlist'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(data) {
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState(load)

  const toggle = useCallback(symbol => {
    setWatchlist(prev => {
      const next = { ...prev }
      if (next[symbol]) {
        delete next[symbol]
      } else {
        next[symbol] = { addedAt: new Date().toISOString(), note: '' }
      }
      save(next)
      return next
    })
  }, [])

  const setNote = useCallback((symbol, note) => {
    setWatchlist(prev => {
      if (!prev[symbol]) return prev
      const next = { ...prev, [symbol]: { ...prev[symbol], note } }
      save(next)
      return next
    })
  }, [])

  const remove = useCallback(symbol => {
    setWatchlist(prev => {
      const next = { ...prev }
      delete next[symbol]
      save(next)
      return next
    })
  }, [])

  return { watchlist, toggle, setNote, remove }
}
