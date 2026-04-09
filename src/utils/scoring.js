// Lower is better for valuation multiples, higher is better for quality metrics
const METRICS = [
  { key: 'evEbitda',    weight: 0.25, lowerIsBetter: true  },
  { key: 'pFcf',        weight: 0.20, lowerIsBetter: true  },
  { key: 'peRatio',     weight: 0.20, lowerIsBetter: true  },
  { key: 'psRatio',     weight: 0.15, lowerIsBetter: true  },
  { key: 'pbRatio',     weight: 0.10, lowerIsBetter: true  },
  { key: 'debtEquity',  weight: 0.10, lowerIsBetter: true  },
]

function percentileRank(value, values) {
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.filter(v => v < value).length
  return rank / (sorted.length - 1 || 1)
}

export function computeScores(stocks) {
  // Group by sector for sector-relative scoring
  const sectors = {}
  for (const s of stocks) {
    if (!sectors[s.sector]) sectors[s.sector] = []
    sectors[s.sector].push(s)
  }

  return stocks.map(stock => {
    const peers = sectors[stock.sector] || stocks
    let totalWeight = 0
    let weightedScore = 0

    for (const { key, weight, lowerIsBetter } of METRICS) {
      const value = stock[key]
      if (value == null || isNaN(value) || value <= 0) continue

      const peerValues = peers
        .map(p => p[key])
        .filter(v => v != null && !isNaN(v) && v > 0)

      if (peerValues.length < 2) continue

      // Percentile rank 0-1 (lower = cheaper relative to peers)
      let pct = percentileRank(value, peerValues)
      // For "lower is better" metrics, invert so higher score = better value
      if (lowerIsBetter) pct = 1 - pct

      weightedScore += pct * weight
      totalWeight += weight
    }

    const score = totalWeight > 0
      ? Math.round((weightedScore / totalWeight) * 100)
      : null

    return { ...stock, valueScore: score }
  })
}
