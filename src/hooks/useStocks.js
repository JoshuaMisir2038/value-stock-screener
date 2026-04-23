import { useState, useEffect } from 'react'

export function useStocks() {
  const [rawStocks, setRawStocks] = useState([])
  const [benchmark, setBenchmark] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/stocks.json')
        if (!res.ok) throw new Error('Data not found')
        const json = await res.json()
        const seen = new Set()
        const unique = json.stocks.filter(s => {
          if (seen.has(s.symbol)) return false
          seen.add(s.symbol)
          return true
        })
        setRawStocks(unique)
        setLastUpdated(json.lastUpdated)
        setBenchmark(json.benchmark || null)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { rawStocks, loading, error, lastUpdated, benchmark }
}
