// Value score = weighted percentile rank vs the entire market (market-relative)
// Sector rank = percentile rank within sector only (shown as a secondary column)
// Lower is better for valuation multiples; higher is better for quality metrics

// Default metrics — weights sum to 1.0 but scoreAgainst normalises automatically
export const DEFAULT_SCORE_METRICS = [
  { key: 'evEbitda',        weight: 20, lowerIsBetter: true,  label: 'EV/EBITDA',        group: 'Valuation',    desc: 'Enterprise value relative to EBITDA. Best cross-sector valuation metric.' },
  { key: 'pFcf',            weight: 18, lowerIsBetter: true,  label: 'P/FCF',            group: 'Valuation',    desc: 'Price to free cash flow. Harder to manipulate than earnings — a Buffett favourite.' },
  { key: 'peRatio',         weight: 15, lowerIsBetter: true,  label: 'P/E (TTM)',        group: 'Valuation',    desc: 'Trailing price-to-earnings. Most widely watched valuation metric.' },
  { key: 'psRatio',         weight: 12, lowerIsBetter: true,  label: 'P/S',              group: 'Valuation',    desc: 'Price-to-sales. Useful when earnings are negative or distorted.' },
  { key: 'pbRatio',         weight:  8, lowerIsBetter: true,  label: 'P/B',              group: 'Valuation',    desc: 'Price-to-book. Classic Ben Graham metric — especially relevant for financials.' },
  { key: 'evRevenue',       weight:  7, lowerIsBetter: true,  label: 'EV/Revenue',       group: 'Valuation',    desc: 'EV to total revenue. Capital-structure-neutral revenue comparison.' },
  { key: 'debtEquity',      weight:  8, lowerIsBetter: true,  label: 'Debt/Equity',      group: 'Safety',       desc: 'Safety filter. Highly leveraged companies can be value traps.' },
  { key: 'grossMargin',     weight:  6, lowerIsBetter: false, label: 'Gross Margin',     group: 'Quality',      desc: 'Pricing power and competitive moat indicator. Higher = better business.' },
  { key: 'fcfMargin',       weight:  6, lowerIsBetter: false, label: 'FCF Margin',       group: 'Quality',      desc: 'Free cash flow as % of revenue. How efficiently revenue converts to cash.' },
]

// Additional metrics users can add to the score
export const EXTRA_SCORE_METRICS = [
  { key: 'forwardPE',       weight:  0, lowerIsBetter: true,  label: 'Fwd P/E',          group: 'Valuation',    desc: 'Forward price-to-earnings based on next year\'s consensus EPS estimate.' },
  { key: 'operatingMargin', weight:  0, lowerIsBetter: false, label: 'Op Margin',         group: 'Quality',      desc: 'Operating income as % of revenue. Core business profitability.' },
  { key: 'roe',             weight:  0, lowerIsBetter: false, label: 'ROE',               group: 'Quality',      desc: 'Return on equity. Measures how efficiently equity capital generates profit.' },
  { key: 'revenueGrowth',   weight:  0, lowerIsBetter: false, label: 'Revenue Growth',    group: 'Growth',       desc: 'YoY revenue growth. Adds a growth dimension to the value score.' },
  { key: 'earningsGrowth',  weight:  0, lowerIsBetter: false, label: 'EPS Growth',        group: 'Growth',       desc: 'YoY earnings-per-share growth.' },
  { key: 'ruleOf40',        weight:  0, lowerIsBetter: false, label: 'Rule of 40',        group: 'Growth',       desc: 'Revenue growth + FCF margin. Quality growth filter for tech companies.' },
  { key: 'dividendYield',   weight:  0, lowerIsBetter: false, label: 'Div Yield',         group: 'Income',       desc: 'Annual dividend as % of price. Relevant for income-oriented screens.' },
  { key: 'currentRatio',    weight:  0, lowerIsBetter: false, label: 'Current Ratio',     group: 'Safety',       desc: 'Current assets / current liabilities. Short-term liquidity measure.' },
  { key: 'netDebtEbitda',   weight:  0, lowerIsBetter: true,  label: 'Net Debt/EBITDA',   group: 'Safety',       desc: 'Leverage ratio. Negative = net cash position (best).' },
  { key: 'rsi',             weight:  0, lowerIsBetter: true,  label: 'RSI',               group: 'Technical',    desc: 'RSI < 35 = oversold. Adding this tilts the score toward recent losers.' },
]

export const ALL_SCORE_METRICS = [...DEFAULT_SCORE_METRICS, ...EXTRA_SCORE_METRICS]

// Legacy alias used by useStocks (default weights, unchanged behaviour)
export const SCORE_METRICS = DEFAULT_SCORE_METRICS

function percentileRank(value, values) {
  const sorted = [...values].sort((a, b) => a - b)
  const rank = sorted.filter(v => v < value).length
  return rank / (sorted.length - 1 || 1)
}

function scoreAgainst(stock, pool, metrics) {
  let totalWeight = 0
  let weightedScore = 0

  for (const { key, weight, lowerIsBetter, enabled } of metrics) {
    if (enabled === false || weight <= 0) continue
    const value = stock[key]
    if (value == null || isNaN(value)) continue

    const poolValues = pool
      .map(p => p[key])
      .filter(v => v != null && !isNaN(v))

    if (poolValues.length < 2) continue

    let pct = percentileRank(value, poolValues)
    if (lowerIsBetter) pct = 1 - pct

    weightedScore += pct * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null
}

// computeScores uses default metrics (called by useStocks for the raw load)
export function computeScores(stocks) {
  return computeScoresWithMetrics(stocks, DEFAULT_SCORE_METRICS)
}

// computeScoresWithMetrics accepts a custom metrics array (weight in 0-100 range, auto-normalises)
export function computeScoresWithMetrics(stocks, metrics) {
  const sectors = {}
  for (const s of stocks) {
    if (!sectors[s.sector]) sectors[s.sector] = []
    sectors[s.sector].push(s)
  }

  return stocks.map(stock => ({
    ...stock,
    valueScore:  scoreAgainst(stock, stocks,                            metrics),
    sectorScore: scoreAgainst(stock, sectors[stock.sector] || stocks,   metrics),
  }))
}
