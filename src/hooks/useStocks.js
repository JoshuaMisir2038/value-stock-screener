import { useState, useEffect } from 'react'
import { computeScores } from '../utils/scoring'

export function useStocks() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('./data/stocks.json')
        if (!res.ok) throw new Error('Data not found')
        const json = await res.json()
        const scored = computeScores(json.stocks)
        setStocks(scored)
        setLastUpdated(json.lastUpdated)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { stocks, loading, error, lastUpdated }
}
