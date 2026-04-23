import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Calculator, BookOpen, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

// ─── Education content ──────────────────────────────────────────────────────

const EDU_ITEMS = [
  {
    title: 'What is a DCF? — The Big Picture',
    body: `A Discounted Cash Flow (DCF) model values a business by forecasting all the free cash flow it will generate in the future, then "discounting" those cash flows back to what they're worth in today's dollars.

The core premise: a dollar today is worth more than a dollar five years from now, because you could invest that dollar today and earn a return. The rate you use to discount future cash flows reflects the risk of the investment — riskier businesses get discounted more aggressively.

Formula:  Intrinsic Value = Σ [FCF_t / (1 + WACC)^t]  +  Terminal Value / (1 + WACC)^n

This is the gold standard of fundamental valuation — used by investment banks, private equity firms, and value investors worldwide. Warren Buffett has described it as "the only correct way to value a business."

Limitation: DCF models are extremely sensitive to your inputs, especially the growth rate and discount rate. Small changes produce big swings in intrinsic value. Always treat the output as a range, not a precise number.`,
  },
  {
    title: 'Free Cash Flow (FCF) — The Foundation',
    body: `Free Cash Flow is the cash a company generates after paying for capital expenditures needed to maintain or grow the business. Unlike earnings (net income), FCF is much harder to manipulate with accounting choices.

Formula:  FCF = Operating Cash Flow − Capital Expenditures

Why FCF and not earnings? Earnings include non-cash charges (depreciation, stock comp) and can be inflated by accounting decisions. FCF represents actual dollars that could be returned to shareholders, paid as dividends, used for buybacks, or reinvested.

In this model, the "Base FCF" field is auto-estimated from your data (Revenue × FCF Margin). You should sanity-check this against the company's actual cash flow statement. For capital-light businesses (software, financial services), FCF margin is often 20–40%. For capital-heavy businesses (manufacturing, utilities), it may be 5–15%.

Rule of thumb: Be conservative. If a company's FCF has been volatile, use a normalized average, not the peak year.`,
  },
  {
    title: 'Growth Rate — Stage 1 & Stage 2',
    body: `Most serious DCF models use a two-stage growth structure:

Stage 1 (Years 1–5): The near-term growth you can reasonably forecast based on industry trends, competitive position, and analyst consensus.

Stage 2 (Years 6–10): A fade toward a more sustainable long-run rate as the business matures. High-growth companies rarely sustain 20%+ growth for a decade.

How to estimate Stage 1 growth:
  • Historical FCF/revenue CAGR over the past 3–5 years
  • Wall Street consensus revenue growth (available on Bloomberg, FactSet)
  • Industry growth rate + market share assumptions
  • Management guidance (with appropriate skepticism)

Common pitfalls:
  • Anchoring to recent peak growth (pandemic-era SaaS, for example)
  • Ignoring that growth and capital expenditures are linked — faster growth usually requires more reinvestment
  • Assuming a small company can sustain large-company growth forever

The "sustainable growth rate" concept: a company can only grow as fast as its reinvestment rate × return on invested capital (ROIC) without taking on debt.`,
  },
  {
    title: 'WACC — Weighted Average Cost of Capital',
    body: `WACC is the blended rate of return that a company must earn to satisfy both its equity holders and debt holders. It's the discount rate you apply to all future cash flows.

Formula:  WACC = (E/V) × Re  +  (D/V) × Rd × (1 − Tax Rate)

Where:
  E = market value of equity (market cap)
  D = market value of debt
  V = E + D (total enterprise value)
  Re = cost of equity
  Rd = cost of debt (pre-tax)

Cost of Equity (Re) is typically calculated using the Capital Asset Pricing Model (CAPM):
  Re = Risk-Free Rate + Beta × Equity Risk Premium

Practical guidance for WACC by risk level:
  • Large-cap, stable (e.g., JNJ, PG):     7–9%
  • Mid-cap, established growth:            9–11%
  • Small-cap / cyclical:                   11–14%
  • Speculative / early-stage:              15–20%+

A higher WACC means you're discounting future cash flows more aggressively — this shrinks intrinsic value. Most DCF errors are made by using a WACC that's too low (optimistic) for a risky company.`,
  },
  {
    title: 'Risk-Free Rate — The Baseline',
    body: `The risk-free rate is the return you can earn with zero credit risk — the floor on any investment return. In practice, this is the yield on US Treasury bonds.

The 10-Year US Treasury yield is the most commonly used risk-free rate for US equity DCFs. It represents the opportunity cost of tying up capital: if Treasuries yield 4.5%, any investment must offer a higher expected return to justify the additional risk.

Current convention: Most practitioners use the current 10-Year Treasury yield (approximately 4.2–4.5% as of 2025). During periods of near-zero rates (2010–2021), the appropriate risk-free rate was debated — using 0.5% mechanically inflated every DCF valuation significantly.

Philosophical dimension: Some value investors (Damodaran, Buffett to a degree) argue for using a normalized risk-free rate (e.g., 4%) that reflects long-run averages rather than the current yield, to avoid building models that swing wildly with Fed policy.

In this calculator, the risk-free rate feeds into WACC via the CAPM formula. You can also set it and then manually adjust WACC to whatever discount rate you believe is appropriate for this specific business's risk profile.`,
  },
  {
    title: 'Equity Risk Premium (ERP)',
    body: `The Equity Risk Premium is the extra return investors demand above the risk-free rate in exchange for taking on equity risk. It's the compensation for volatility, business risk, and uncertainty.

ERP enters the WACC via CAPM:  Cost of Equity = Rf + Beta × ERP

Historical ERP (geometric, 1928–present):  ~4.5–5.0%
Current implied ERP (Damodaran, 2025):     ~4.5–5.5%
Common practitioner default:               5.0–5.5%

Aswath Damodaran (NYU Stern) publishes updated ERP estimates monthly at his website and is the most widely cited academic source on this topic.

In practice, many analysts skip computing WACC from components and instead benchmark it directly:
  "This company is similar to peers trading at 10–12x EBITDA, so I'll use a 10% WACC."
Both approaches are valid — what matters is internal consistency.`,
  },
  {
    title: 'Terminal Value — The Biggest Driver',
    body: `Terminal Value (TV) represents the value of all cash flows beyond your projection period. For most DCFs, terminal value accounts for 60–80% of total calculated value. This is both important and dangerous — it means your entire valuation is dominated by an assumption about what happens after year 10.

Two methods:

1. PERPETUITY GROWTH MODEL (Gordon Growth):
   TV = FCF_n × (1 + g_terminal) / (WACC − g_terminal)

   The terminal growth rate g should reflect the long-run nominal GDP growth rate — typically 2–3% for a US company. Using anything above 3% implies the company eventually becomes larger than the economy, which is impossible.

2. EXIT MULTIPLE METHOD:
   TV = FCF_n × Exit Multiple  (or EBITDA_n × EV/EBITDA multiple)

   This anchors your terminal value to how comparable businesses are actually bought and sold. If the sector currently trades at 15x EV/EBITDA, applying that multiple to year-10 EBITDA gives a market-grounded terminal value.

Best practice: Run both methods. If they give dramatically different answers, the divergence itself is informative about the quality of your assumptions.

The perpetuity growth method is more theoretically pure; the exit multiple method is more practically grounded. Most buy-side analysts use exit multiples.`,
  },
  {
    title: 'Margin of Safety — The Value Investor\'s Buffer',
    body: `Margin of Safety is the gap between your estimated intrinsic value and the current market price. It was introduced by Benjamin Graham in "The Intelligent Investor" and is the core risk management concept in value investing.

Formula:  Margin of Safety = (Intrinsic Value − Current Price) / Intrinsic Value × 100

Why it matters: Your DCF inputs are estimates. The growth rate might be wrong. The WACC might be slightly off. A 50% margin of safety means the stock could be 50% overvalued on your model and you'd still break even — you've built in room for error.

Buffett's summary: "The three most important words in investing are margin of safety."

Common thresholds practitioners use:
  > 30%  — Attractively priced for a quality business
  > 40%  — Deep value territory
  > 50%  — Either a screaming buy or your model is wrong
  < 0%   — Overvalued vs your assumptions (not necessarily a sell — could mean growth assumptions need revisiting)

Important nuance: A high margin of safety on a DCF that uses optimistic growth assumptions is illusory. The buffer is only real if your inputs are conservative.`,
  },
  {
    title: 'Sensitivity Analysis — Why You Need a Range',
    body: `A DCF produces one number, but that number is far less important than understanding how sensitive it is to your key assumptions.

The two most impactful variables are almost always:
  1. Stage 1 growth rate
  2. WACC (discount rate)

A sensitivity table shows intrinsic value across a grid of growth rates and WACCs. If the stock looks cheap across the entire grid, confidence is high. If it only looks cheap in the most optimistic corner of the grid, be skeptical.

Example sensitivity for a stock at $50 current price:
            WACC
Growth    8%    10%    12%
  10%    $82    $64    $52
  15%   $105    $81    $65
  20%   $138   $105    $83

In this example, the stock looks undervalued at 8–10% WACC with 15%+ growth, but roughly fairly valued at 12% WACC with 10% growth. This is the honest picture.

Tip: The assumptions that matter most deserve the most scrutiny. Spend your research time understanding whether the growth rate is sustainable, not perfecting your spreadsheet formulas.`,
  },
]

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtB(v) {
  if (v == null || isNaN(v)) return '—'
  const abs = Math.abs(v)
  if (abs >= 1000) return `$${(v / 1000).toFixed(1)}T`
  if (abs >= 1)    return `$${v.toFixed(1)}B`
  return `$${(v * 1000).toFixed(0)}M`   // sub-billion shown as M for readability
}

function fmtPct(v) {
  if (v == null || isNaN(v)) return '—'
  return `${(v * 100).toFixed(1)}%`
}

function fmtShare(v) {
  if (v == null || isNaN(v)) return '—'
  return `$${v.toFixed(2)}`
}

function fmtPctRaw(v) {
  if (v == null || isNaN(v)) return '—'
  return `${v.toFixed(1)}%`
}

// ─── Edu accordion item ─────────────────────────────────────────────────────

function EduItem({ item }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-800">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-900 transition-colors"
      >
        <span className="text-[11px] font-bold tracking-wider text-gray-300 uppercase">{item.title}</span>
        {open ? <ChevronUp size={13} className="text-gray-500 shrink-0" /> : <ChevronDown size={13} className="text-gray-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-800 bg-gray-900/40">
          <pre className="text-[11px] text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">{item.body}</pre>
        </div>
      )}
    </div>
  )
}

// ─── Stock autocomplete ──────────────────────────────────────────────────────

function StockSearch({ stocks, value, onChange }) {
  const [query, setQuery] = useState(value?.symbol ? `${value.symbol} — ${value.name}` : '')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const results = useMemo(() => {
    if (!query || query.length < 1) return []
    const q = query.toLowerCase()
    return stocks
      .filter(s => s.symbol?.toLowerCase().startsWith(q) || s.name?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, stocks])

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = stock => {
    setQuery(`${stock.symbol} — ${stock.name}`)
    setOpen(false)
    onChange(stock)
  }

  return (
    <div className="relative" ref={ref}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(null) }}
        onFocus={() => setOpen(true)}
        placeholder="Search ticker or company name..."
        className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs px-3 py-2 focus:outline-none focus:border-blue-500"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 bg-gray-900 border border-gray-700 border-t-0 max-h-48 overflow-y-auto">
          {results.map(s => (
            <button
              key={s.symbol}
              onMouseDown={() => select(s)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-gray-800 flex items-center gap-3"
            >
              <span className="font-bold text-blue-400 w-12 shrink-0">{s.symbol}</span>
              <span className="text-gray-400 truncate">{s.name}</span>
              <span className="text-gray-600 text-[10px] ml-auto shrink-0">{s.sector}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Input row ───────────────────────────────────────────────────────────────

function InputRow({ label, hint, value, onChange, suffix = '', step = 0.1, min }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</div>
        {hint && <div className="text-[9px] text-gray-700 mt-0.5">{hint}</div>}
      </div>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="w-24 bg-gray-900 border border-gray-700 text-gray-200 text-xs px-2 py-1.5 focus:outline-none focus:border-blue-500 tabular-nums"
        />
        {suffix && <span className="text-[10px] text-gray-600">{suffix}</span>}
      </div>
    </div>
  )
}

// ─── DCF engine ──────────────────────────────────────────────────────────────

function runDCF({ baseFCF, g1, g2, wacc, terminalMethod, terminalGrowth, exitMultiple, years, netDebt, shares }) {
  if (!baseFCF || !wacc || wacc <= 0) return null
  const w = wacc / 100
  const rows = []
  let fcf = baseFCF
  let pvSum = 0

  for (let t = 1; t <= years; t++) {
    const g = t <= 5 ? g1 / 100 : g2 / 100
    fcf = fcf * (1 + g)
    const discount = Math.pow(1 + w, t)
    const pv = fcf / discount
    pvSum += pv
    rows.push({ year: t, fcf, pv, discount })
  }

  const lastFCF = rows[rows.length - 1].fcf
  const lastDiscount = Math.pow(1 + w, years)

  let tv
  if (terminalMethod === 'perpetuity') {
    const tg = terminalGrowth / 100
    if (w <= tg) return null // invalid
    tv = lastFCF * (1 + tg) / (w - tg)
  } else {
    tv = lastFCF * exitMultiple
  }

  const pvTV = tv / lastDiscount
  const enterpriseValue = pvSum + pvTV
  const equityValue = enterpriseValue - netDebt
  // inputs in $B, shares in M → ($B × 1e9) / (M × 1e6) = value × 1000 / shares = $/share
  const intrinsicValue = shares > 0 ? (equityValue * 1000) / shares : null

  return { rows, pvSum, tv, pvTV, enterpriseValue, equityValue, intrinsicValue }
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function DCFTab({ stocks = [] }) {
  const [selectedStock, setSelectedStock] = useState(null)
  const [showEdu, setShowEdu] = useState(false)

  // Model inputs — monetary values in $B, shares in millions
  const [baseFCF,        setBaseFCF]        = useState(0)    // $B
  const [g1,             setG1]             = useState(10)   // %
  const [g2,             setG2]             = useState(5)    // %
  const [wacc,           setWacc]           = useState(10)   // %
  const [rfRate,         setRfRate]         = useState(4.3)  // %
  const [terminalMethod, setTerminalMethod] = useState('perpetuity')
  const [terminalGrowth, setTerminalGrowth] = useState(2.5)  // %
  const [exitMultiple,   setExitMultiple]   = useState(15)   // x
  const [years,          setYears]          = useState(10)
  const [netDebt,        setNetDebt]        = useState(0)    // $B
  const [shares,         setShares]         = useState(0)    // M shares

  // Auto-populate when stock selected
  const handleSelectStock = stock => {
    setSelectedStock(stock)
    if (!stock) return

    // Base FCF: revenue × FCF margin (revY1 in raw $, fcfMargin as decimal) → convert to $B
    let fcfEst = 0
    if (stock.revY1 && stock.fcfMargin) {
      fcfEst = (stock.revY1 * stock.fcfMargin) / 1e9
    } else if (stock.marketCap && stock.pFcf && stock.pFcf > 0) {
      fcfEst = (stock.marketCap / stock.pFcf) / 1e9
    }
    setBaseFCF(parseFloat(fcfEst.toFixed(2)))

    // Growth: use revenue growth as starting point
    const gEst = stock.revenueGrowth ? Math.round(stock.revenueGrowth * 100) : 10
    setG1(Math.min(Math.max(gEst, 2), 40))
    setG2(Math.round(Math.min(Math.max(gEst * 0.6, 2), 20)))

    // Shares outstanding: marketCap / price (in millions)
    if (stock.marketCap && stock.price) {
      setShares(Math.round(stock.marketCap / stock.price / 1e6))
    }

    // Net debt: estimate from netDebtEbitda × estimated EBITDA
    // EBITDA ~ operating income / operating margin * (1 + D&A/rev approx)
    // Simpler: if evEbitda and marketCap, EV = evEbitda × (marketCap × operatingMargin / evEbitda)
    // Best simple estimate: (EV - marketCap), EV ≈ marketCap × evEbitda / peRatio × peRatio
    // Actually: Net Debt = EV - Equity; we can set a rough number
    // For simplicity: just set 0 and let user input — flag it
    setNetDebt(0)
  }

  const result = useMemo(() => {
    if (!baseFCF || baseFCF <= 0) return null
    return runDCF({ baseFCF, g1, g2, wacc, terminalMethod, terminalGrowth, exitMultiple, years, netDebt, shares })
  }, [baseFCF, g1, g2, wacc, terminalMethod, terminalGrowth, exitMultiple, years, netDebt, shares])

  const currentPrice = selectedStock?.price ?? null
  const mos = result?.intrinsicValue && currentPrice
    ? ((result.intrinsicValue - currentPrice) / result.intrinsicValue) * 100
    : null

  const mosColor = mos == null ? 'text-gray-500'
    : mos >= 40 ? 'text-emerald-400'
    : mos >= 15 ? 'text-yellow-400'
    : mos >= 0  ? 'text-blue-400'
    : 'text-red-400'

  const mosLabel = mos == null ? '—'
    : mos >= 40 ? 'DEEP VALUE'
    : mos >= 15 ? 'UNDERVALUED'
    : mos >= 0  ? 'FAIRLY VALUED'
    : 'OVERVALUED'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">DCF INTRINSIC VALUE CALCULATOR</h2>
          <p className="text-[11px] text-gray-600 mt-1">Discount future free cash flows to estimate what a stock is worth today</p>
        </div>
        <button
          onClick={() => setShowEdu(o => !o)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-700 text-[11px] text-gray-400 hover:border-blue-500 hover:text-blue-400 transition-colors uppercase tracking-wider"
        >
          <BookOpen size={12} />
          {showEdu ? 'Hide' : 'Show'} Education &amp; Definitions
        </button>
      </div>

      {/* Education accordion */}
      {showEdu && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">
            CONCEPTS &amp; DEFINITIONS — CLICK TO EXPAND
          </div>
          {EDU_ITEMS.map(item => <EduItem key={item.title} item={item} />)}
        </div>
      )}

      {/* Calculator */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ── Left: Inputs ── */}
        <div className="space-y-5">
          {/* Stock selector */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">1. SELECT STOCK</div>
            <StockSearch stocks={stocks} value={selectedStock} onChange={handleSelectStock} />
            {selectedStock && (
              <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500">
                <span className="text-white font-bold">{selectedStock.symbol}</span>
                <span>{selectedStock.name}</span>
                <span className="text-blue-400">${selectedStock.price?.toFixed(2)}</span>
                <span className="text-gray-700">•</span>
                <span>{selectedStock.sector}</span>
              </div>
            )}
          </div>

          {/* Cash flow inputs */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">2. CASH FLOW &amp; CAPITAL STRUCTURE</div>
            <div className="space-y-3 bg-gray-900/40 border border-gray-800 p-4">
              <InputRow
                label="Base FCF"
                hint="Most recent year free cash flow"
                value={baseFCF}
                onChange={setBaseFCF}
                suffix="$B"
                step={0.1}
              />
              <InputRow
                label="Net Debt"
                hint="Total debt minus cash ($B). Use negative for net cash."
                value={netDebt}
                onChange={setNetDebt}
                suffix="$B"
                step={0.5}
              />
              <InputRow
                label="Shares Outstanding"
                hint="Diluted shares (millions)"
                value={shares}
                onChange={setShares}
                suffix="M shares"
                step={10}
                min={0}
              />
              <InputRow
                label="Projection Period"
                hint="Number of years to forecast"
                value={years}
                onChange={v => setYears(Math.max(5, Math.min(15, Math.round(v))))}
                suffix="years"
                step={1}
                min={5}
              />
            </div>
          </div>

          {/* Growth rates */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">3. GROWTH ASSUMPTIONS</div>
            <div className="space-y-3 bg-gray-900/40 border border-gray-800 p-4">
              <InputRow
                label="Stage 1 Growth (Yr 1–5)"
                hint="Near-term FCF growth rate"
                value={g1}
                onChange={setG1}
                suffix="%/yr"
                step={0.5}
              />
              <InputRow
                label="Stage 2 Growth (Yr 6–10)"
                hint="Fade toward sustainable rate"
                value={g2}
                onChange={setG2}
                suffix="%/yr"
                step={0.5}
              />
            </div>
          </div>

          {/* Discount rate */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">4. DISCOUNT RATE</div>
            <div className="space-y-3 bg-gray-900/40 border border-gray-800 p-4">
              <InputRow
                label="Risk-Free Rate"
                hint="10-Year US Treasury yield (~4.3% in 2025)"
                value={rfRate}
                onChange={setRfRate}
                suffix="%"
                step={0.1}
              />
              <InputRow
                label="WACC"
                hint="Your total discount rate (Rf + risk premium)"
                value={wacc}
                onChange={setWacc}
                suffix="%"
                step={0.5}
                min={0.1}
              />
              <div className="text-[9px] text-gray-700 border-t border-gray-800 pt-2 mt-1">
                IMPLIED EQUITY RISK PREMIUM: {(wacc - rfRate).toFixed(1)}% above risk-free rate
              </div>
            </div>
          </div>

          {/* Terminal value */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-3">5. TERMINAL VALUE METHOD</div>
            <div className="space-y-3 bg-gray-900/40 border border-gray-800 p-4">
              <div className="flex gap-2">
                {[['perpetuity', 'PERPETUITY GROWTH'], ['exit', 'EXIT MULTIPLE']].map(([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => setTerminalMethod(val)}
                    className={`flex-1 py-1.5 text-[10px] font-bold tracking-wider uppercase border transition-colors ${
                      terminalMethod === val
                        ? 'bg-blue-500 border-blue-500 text-black'
                        : 'border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {terminalMethod === 'perpetuity' ? (
                <InputRow
                  label="Terminal Growth Rate"
                  hint="Long-run growth rate (≤ GDP, typically 2–3%)"
                  value={terminalGrowth}
                  onChange={setTerminalGrowth}
                  suffix="%"
                  step={0.25}
                />
              ) : (
                <InputRow
                  label="FCF Exit Multiple"
                  hint="P/FCF multiple applied to final year FCF"
                  value={exitMultiple}
                  onChange={setExitMultiple}
                  suffix="x"
                  step={1}
                  min={1}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div className="space-y-5">
          {/* Verdict card */}
          {result && currentPrice ? (
            <div className={`border-2 p-5 ${mos >= 15 ? 'border-emerald-500/50 bg-emerald-500/5' : mos >= 0 ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-red-500/50 bg-red-500/5'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">
                    {selectedStock?.symbol ?? 'STOCK'} — VERDICT
                  </div>
                  <div className={`text-2xl font-bold tracking-wider ${mosColor}`}>{mosLabel}</div>
                  <div className="text-[11px] text-gray-500 mt-1">
                    {mos >= 0
                      ? `Trading ${mos.toFixed(1)}% below intrinsic value`
                      : `Trading ${Math.abs(mos).toFixed(1)}% above intrinsic value`}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold tabular-nums ${mosColor}`}>
                    {mos >= 0 ? '+' : ''}{mos.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider mt-0.5">Margin of Safety</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider">Intrinsic Value</div>
                  <div className="text-lg font-bold text-white tabular-nums">{fmtShare(result.intrinsicValue)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-600 uppercase tracking-wider">Current Price</div>
                  <div className="text-lg font-bold text-gray-300 tabular-nums">{fmtShare(currentPrice)}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-gray-800 p-8 text-center text-gray-600 text-[11px] uppercase tracking-wider">
              {!selectedStock
                ? 'Select a stock to begin'
                : baseFCF <= 0
                ? 'Enter a positive Base FCF to calculate'
                : shares <= 0
                ? 'Enter shares outstanding to calculate intrinsic value per share'
                : 'Enter valid inputs to calculate'}
            </div>
          )}

          {/* DCF waterfall table */}
          {result && (
            <div>
              <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">PROJECTED FREE CASH FLOWS</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-3 py-2 text-gray-600 font-normal uppercase tracking-wider text-[10px] w-12">YR</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-normal uppercase tracking-wider text-[10px]">FCF ($B)</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-normal uppercase tracking-wider text-[10px]">Growth</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-normal uppercase tracking-wider text-[10px]">Discount</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-normal uppercase tracking-wider text-[10px]">PV ($B)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, i) => {
                      const g = i < 5 ? g1 : g2
                      return (
                        <tr key={row.year} className={`border-b border-gray-900 ${i % 2 === 0 ? '' : 'bg-gray-950/30'}`}>
                          <td className="px-3 py-1.5 text-gray-600 tabular-nums">{row.year}</td>
                          <td className="px-3 py-1.5 text-right text-gray-300 tabular-nums">{fmtB(row.fcf)}</td>
                          <td className="px-3 py-1.5 text-right text-blue-400 tabular-nums text-[10px]">+{g}%</td>
                          <td className="px-3 py-1.5 text-right text-gray-600 tabular-nums text-[10px]">{(1 / row.discount).toFixed(3)}x</td>
                          <td className="px-3 py-1.5 text-right text-gray-400 tabular-nums">{fmtB(row.pv)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Value bridge */}
              <div className="mt-4 border border-gray-800">
                <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase px-4 py-2 border-b border-gray-800">
                  VALUATION BRIDGE
                </div>
                {[
                  { label: 'PV of FCFs (Years 1–' + years + ')',   value: fmtB(result.pvSum),          sub: true  },
                  { label: 'Terminal Value (undiscounted)',          value: fmtB(result.tv),             sub: true  },
                  { label: 'PV of Terminal Value',                   value: fmtB(result.pvTV),           sub: true  },
                  { label: 'Enterprise Value',                       value: fmtB(result.enterpriseValue),sub: false },
                  { label: `Less: Net Debt`,                         value: `(${fmtB(netDebt)})`,        sub: true, note: netDebt === 0 ? '⚠ set manually' : '' },
                  { label: 'Equity Value',                           value: fmtB(result.equityValue),    sub: false },
                  { label: `÷ Shares (${shares}M)`,                  value: null,                        sub: true  },
                  { label: 'INTRINSIC VALUE / SHARE',                value: fmtShare(result.intrinsicValue), bold: true },
                  { label: 'Current Market Price',                   value: fmtShare(currentPrice),      muted: true },
                  { label: 'MARGIN OF SAFETY',                       value: mos != null ? `${mos.toFixed(1)}%` : '—', bold: true, color: mosColor },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2 text-[11px] ${row.bold ? 'border-t-2 border-gray-700 bg-gray-900' : 'border-t border-gray-900'}`}
                  >
                    <span className={row.sub ? 'text-gray-600' : row.muted ? 'text-gray-500' : 'text-gray-300 font-bold uppercase tracking-wider'}>
                      {row.label}
                      {row.note && <span className="ml-2 text-yellow-600 text-[9px]">{row.note}</span>}
                    </span>
                    <span className={`tabular-nums font-bold ${row.color ?? (row.bold ? 'text-white' : row.muted ? 'text-gray-400' : 'text-gray-400')}`}>
                      {row.value ?? ''}
                    </span>
                  </div>
                ))}
              </div>

              {/* TV as % of enterprise value */}
              <div className="mt-3 text-[10px] text-gray-700 border border-gray-800 px-4 py-2 flex items-center gap-2">
                <AlertTriangle size={10} className="text-yellow-700 shrink-0" />
                Terminal value represents{' '}
                <span className="text-yellow-600 font-bold">
                  {((result.pvTV / result.enterpriseValue) * 100).toFixed(0)}%
                </span>{' '}
                of enterprise value — small changes in growth rate or WACC will significantly move intrinsic value.
              </div>
            </div>
          )}

          {/* Sensitivity table */}
          {result && currentPrice && (
            <div>
              <div className="text-[10px] font-bold tracking-widest text-gray-600 uppercase mb-2">
                SENSITIVITY — INTRINSIC VALUE (WACC × STAGE 1 GROWTH)
              </div>
              <div className="overflow-x-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="px-3 py-1.5 text-[9px] text-gray-600 uppercase tracking-wider text-right border border-gray-800 bg-gray-900/60">
                        Growth ↓ / WACC →
                      </th>
                      {[-2, -1, 0, 1, 2].map(dw => {
                        const w = Math.max(0.1, wacc + dw * 1)
                        return (
                          <th key={dw} className={`px-3 py-1.5 text-[9px] uppercase tracking-wider text-right border border-gray-800 ${dw === 0 ? 'bg-blue-500/10 text-blue-400' : 'text-gray-600 bg-gray-900/60'}`}>
                            {w.toFixed(1)}%
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[-5, -2.5, 0, 2.5, 5].map(dg => {
                      const g = Math.max(0, g1 + dg)
                      return (
                        <tr key={dg}>
                          <td className={`px-3 py-1.5 text-[9px] uppercase tracking-wider text-right border border-gray-800 ${dg === 0 ? 'bg-blue-500/10 text-blue-400' : 'text-gray-600 bg-gray-900/60'}`}>
                            {g.toFixed(1)}%
                          </td>
                          {[-2, -1, 0, 1, 2].map(dw => {
                            const ww = Math.max(0.1, wacc + dw * 1)
                            const r = runDCF({ baseFCF, g1: g, g2: g2, wacc: ww, terminalMethod, terminalGrowth, exitMultiple, years, netDebt, shares })
                            const iv = r?.intrinsicValue
                            const m = iv && currentPrice ? ((iv - currentPrice) / iv) * 100 : null
                            const bg = m == null ? '' : m >= 30 ? 'bg-emerald-500/20' : m >= 10 ? 'bg-emerald-500/10' : m >= 0 ? 'bg-yellow-400/10' : 'bg-red-500/10'
                            const tc = m == null ? 'text-gray-600' : m >= 30 ? 'text-emerald-400' : m >= 10 ? 'text-emerald-400' : m >= 0 ? 'text-yellow-400' : 'text-red-400'
                            const isBase = dg === 0 && dw === 0
                            return (
                              <td key={dw} className={`px-3 py-1.5 text-right tabular-nums border border-gray-800 ${bg} ${isBase ? 'ring-1 ring-blue-500 ring-inset' : ''}`}>
                                <div className={`text-[10px] font-bold ${tc}`}>{iv ? fmtShare(iv) : '—'}</div>
                                <div className={`text-[9px] ${tc}`}>{m != null ? `${m >= 0 ? '+' : ''}${m.toFixed(0)}%` : ''}</div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="text-[9px] text-gray-700 mt-1">
                  Blue border = your current inputs. Values show intrinsic value per share and margin of safety vs ${currentPrice?.toFixed(2)}.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
