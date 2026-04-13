// Value score = weighted percentile rank within sector
// Lower is better for valuation multiples; higher is better for quality metrics
export const SCORE_METRICS = [
  { key: 'evEbitda',        weight: 0.20, lowerIsBetter: true,  label: 'EV/EBITDA',        desc: 'Enterprise value relative to earnings before interest, taxes, depreciation & amortization. Best cross-sector valuation metric.' },
  { key: 'pFcf',            weight: 0.18, lowerIsBetter: true,  label: 'P/FCF',            desc: 'Price to free cash flow. Harder to manipulate than earnings — a Warren Buffett favourite.' },
  { key: 'peRatio',         weight: 0.15, lowerIsBetter: true,  label: 'P/E (TTM)',        desc: 'Trailing price-to-earnings. Most widely watched valuation metric.' },
  { key: 'psRatio',         weight: 0.12, lowerIsBetter: true,  label: 'P/S',              desc: 'Price-to-sales. Useful when earnings are negative or distorted.' },
  { key: 'pbRatio',         weight: 0.08, lowerIsBetter: true,  label: 'P/B',              desc: 'Price-to-book. Classic Ben Graham metric — especially relevant for financials.' },
  { key: 'evRevenue',       weight: 0.07, lowerIsBetter: true,  label: 'EV/Revenue',       desc: 'Enterprise value to total revenue. Useful for capital-structure-neutral revenue comparison.' },
  { key: 'debtEquity',      weight: 0.08, lowerIsBetter: true,  label: 'Debt/Equity',      desc: 'Safety filter. Highly leveraged companies can be value traps.' },
  { key: 'grossMargin',     weight: 0.06, lowerIsBetter: false, label: 'Gross Margin',     desc: 'Pricing power and competitive moat indicator. Higher = better business.' },
  { key: 'fcfMargin',       weight: 0.06, lowerIsBetter: false, label: 'FCF Margin',       desc: 'Free cash flow as a % of revenue. Measures how efficiently revenue converts to cash.' },
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

    for (const { key, weight, lowerIsBetter } of SCORE_METRICS) {
      const value = stock[key]
      if (value == null || isNaN(value) || value <= 0) continue

      const peerValues = peers
        .map(p => p[key])
        .filter(v => v != null && !isNaN(v) && v > 0)

      if (peerValues.length < 2) continue

      let pct = percentileRank(value, peerValues)
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
