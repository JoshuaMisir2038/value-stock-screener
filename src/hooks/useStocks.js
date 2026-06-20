import { useState, useEffect, useRef } from 'react'

const CACHE_KEY = 'aletheia_stocks_v1'
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours — matches 4x/day update cadence

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    // Expire stale cache so users always get fresh data within the TTL window
    if (Date.now() - cached.cachedAt > CACHE_TTL) return null
    return cached
  } catch {
    return null
  }
}

function writeCache(payload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() }))
  } catch {
    // localStorage full or unavailable — fail silently
  }
}

function parseStocks(json) {
  const seen   = new Set()
  const unique = json.stocks.filter(s => {
    if (seen.has(s.symbol)) return false
    seen.add(s.symbol)
    return true
  })
  return {
    stocks:      unique,
    lastUpdated: json.lastUpdated,
    benchmark:   json.benchmark ?? null,
  }
}

export function useStocks() {
  const cached = useRef(readCache())

  const [rawStocks,    setRawStocks]    = useState(cached.current?.stocks      ?? [])
  const [benchmark,    setBenchmark]    = useState(cached.current?.benchmark    ?? null)
  const [lastUpdated,  setLastUpdated]  = useState(cached.current?.lastUpdated  ?? null)
  // loading = true only when there is nothing to show yet (first ever visit)
  const [loading,      setLoading]      = useState(!cached.current)
  // refreshing = true during a background re-fetch when stale cache is being shown
  const [refreshing,   setRefreshing]   = useState(!!cached.current)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`./data/stocks.json?v=${Date.now()}`)
        if (!res.ok) throw new Error('Data not found')
        const json  = await res.json()
        const parsed = parseStocks(json)

        setRawStocks(parsed.stocks)
        setLastUpdated(parsed.lastUpdated)
        setBenchmark(parsed.benchmark)
        writeCache(parsed)
      } catch (err) {
        // Only surface the error if we have nothing to show
        if (!cached.current) setError(err.message)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    }
    load()
  }, [])

  return { rawStocks, loading, refreshing, error, lastUpdated, benchmark }
}
