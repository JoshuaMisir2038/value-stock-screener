// Value score = weighted percentile rank vs the entire market (market-relative)
// Sector rank = percentile rank within sector only (shown as a secondary column)
// Lower is better for valuation multiples; higher is better for quality metrics

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
export const SCORE_METRICS = DEFAULT_SCORE_METRICS

// Binary search: count elements strictly less than value in a sorted array.
// O(log n) vs O(n) linear scan — key to making scoring fast at 1500 stocks.
function countLessThan(sortedArr, value) {
  let lo = 0, hi = sortedArr.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (sortedArr[mid] < value) lo = mid + 1
    else hi = mid
  }
  return lo
}

// Build sorted pool arrays once per metric, reused across all stocks.
function buildPools(stocks, metrics) {
  const pools = {}
  for (const { key, enabled, weight } of metrics) {
    if (enabled === false || weight <= 0) continue
    pools[key] = stocks
      .map(s => s[key])
      .filter(v => v != null && !isNaN(v))
      .sort((a, b) => a - b)
  }
  return pools
}

function scoreWithPools(stock, pools, metrics) {
  let totalWeight = 0
  let weightedScore = 0

  for (const { key, weight, lowerIsBetter, enabled } of metrics) {
    if (enabled === false || weight <= 0) continue
    const value = stock[key]
    if (value == null || isNaN(value)) continue
    const pool = pools[key]
    if (!pool || pool.length < 2) continue

    let pct = countLessThan(pool, value) / (pool.length - 1)
    if (lowerIsBetter) pct = 1 - pct

    weightedScore += pct * weight
    totalWeight   += weight
  }

  return totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : null
}

export function computeScores(stocks) {
  return computeScoresWithMetrics(stocks, DEFAULT_SCORE_METRICS)
}

export function computeScoresWithMetrics(stocks, metrics) {
  if (!stocks.length) return stocks

  // Build market-wide pools once — O(n log n) total instead of O(n² × metrics)
  const marketPools = buildPools(stocks, metrics)

  // Build per-sector pools once
  const sectorMap = {}
  for (const s of stocks) {
    if (!sectorMap[s.sector]) sectorMap[s.sector] = []
    sectorMap[s.sector].push(s)
  }
  const sectorPools = {}
  for (const [sector, sStocks] of Object.entries(sectorMap)) {
    sectorPools[sector] = buildPools(sStocks, metrics)
  }

  return stocks.map(stock => ({
    ...stock,
    valueScore:  scoreWithPools(stock, marketPools,                         metrics),
    sectorScore: scoreWithPools(stock, sectorPools[stock.sector] ?? marketPools, metrics),
  }))
}
