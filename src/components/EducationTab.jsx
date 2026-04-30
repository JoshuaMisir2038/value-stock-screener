import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

const CATEGORIES = ['All', 'Valuation', 'Profitability', 'Balance Sheet', 'Technical', 'Options']

const TOPICS = [
  // ── VALUATION ────────────────────────────────────────────────────────────────
  {
    category: 'Valuation',
    title: 'Price to Earnings (P/E)',
    subtitle: 'The most widely quoted valuation ratio',
    body: `P/E = Market Price per Share / Earnings per Share (EPS)

The P/E ratio tells you how much investors are willing to pay per dollar of current earnings. A P/E of 20 means the market is paying $20 for every $1 of annual profit.

Two variants:
  Trailing P/E (TTM) — uses the last 12 months of actual earnings. Backward-looking but reliable.
  Forward P/E — uses next year's consensus analyst earnings estimate. More relevant for growing businesses, but relies on forecasts that are routinely wrong.

How to read it:
  Low P/E (< 15)  → cheap vs history, or growth is slow/declining, or the business is cyclical
  Market P/E (~20–22 for S&P 500 historically) → fair value range
  High P/E (> 30) → market expects strong earnings growth ahead; disappointed growth = painful de-rating

The P/E trap: a low P/E can be a "value trap" if earnings are about to collapse. A high P/E can be justified if the business grows into the multiple. P/E works best when earnings are stable and predictable — it breaks down for:
  · Companies with volatile or cyclical earnings (use EV/EBITDA instead)
  · Companies with no earnings (use P/S or EV/Revenue)
  · Companies with heavy depreciation distorting net income (use P/FCF or EV/EBITDA)
  · Highly leveraged companies (use EV-based metrics)

Normalised P/E: For cyclical businesses (energy, mining, autos), use average earnings over a full economic cycle (typically 7–10 years) to avoid buying near peak earnings at what looks like a low P/E.

The PEG ratio: P/E divided by expected earnings growth rate. A PEG of 1.0 suggests the P/E is "fair" given growth. PEG < 1.0 is often considered undervalued relative to growth — a useful supplement to raw P/E when comparing growth businesses.`,
  },
  {
    category: 'Valuation',
    title: 'Price to Free Cash Flow (P/FCF)',
    subtitle: 'Buffett\'s preferred lens — cash is harder to fake than earnings',
    body: `P/FCF = Market Capitalisation / Free Cash Flow
FCF = Operating Cash Flow − Capital Expenditures

Free Cash Flow is the actual cash a business generates after paying for what it needs to maintain and grow operations. It is the cash that could theoretically be handed to shareholders right now — through dividends, buybacks, or debt payoff.

Why FCF over earnings?
Earnings (net income) are an accounting construct. Companies can legally inflate earnings through:
  · Aggressive revenue recognition (booking sales before cash is received)
  · Under-depreciation of assets
  · Capitalising operating costs as long-lived assets
  · One-time gains masking operating weakness

FCF bypasses most of this. You cannot fake cash in the bank.

Warren Buffett refers to "owner earnings" as a close cousin — operating earnings plus depreciation minus the maintenance capex needed to sustain the business.

Interpretation:
  P/FCF < 15  → potentially cheap; strong FCF yield relative to price
  P/FCF 15–25 → fair range for quality businesses
  P/FCF > 30  → growth premium being paid; FCF must grow into the valuation

Caveats:
  · FCF is lumpy. A business with a major capex year (new factory, new store build-out) will show depressed FCF temporarily — look at 3-year average FCF when assessing capital-intensive businesses.
  · Some businesses legitimately have near-zero FCF because they are reinvesting every dollar back at high returns — early Amazon being the canonical example. For these, EV/Revenue or EV/EBITDA may be more useful.
  · SaaS and software businesses often have high P/FCF because their FCF margins expand dramatically with scale. The market pays for this operating leverage.

FCF Yield = FCF / Market Cap. A company with a 7% FCF yield is generating $7 of free cash for every $100 of market value — directly comparable to a bond yield.`,
  },
  {
    category: 'Valuation',
    title: 'Price to Sales (P/S) — Why It Beats P/E for Loss-Making Startups',
    subtitle: 'The only reliable multiple when there are no profits yet',
    body: `P/S = Market Capitalisation / Annual Revenue

For companies with negative or near-zero earnings — early-stage SaaS, biotech pre-revenue, high-growth consumer brands reinvesting everything — P/E and P/FCF are meaningless. You cannot divide by zero or a negative number and get a useful valuation signal.

P/S solves this: revenue exists before profits do, is harder to manipulate than earnings, and scales smoothly across growth stages.

Why P/S works for young companies:
  1. Revenue is the top of the income statement — it exists before any cost deductions, so even a company burning cash has a P/S ratio.
  2. Revenue growth is predictable earlier than earnings growth. Investors price future profitability by anchoring to revenue and applying a margin assumption.
  3. It enables cross-company comparison within a cohort of unprofitable peers.

The P/S → margin bridge:
  A company with a 10x P/S and 20% operating margins is effectively trading at 50x operating income (if you assume today's margins persist). That is the implicit P/E embedded in the P/S multiple.

  Formula: Implied P/E = P/S ÷ Net Margin

  Example: P/S = 8x, expected long-run net margin = 25% → implied P/E = 32x.
  If that 32x is justified by growth, the 8x P/S is reasonable.

When P/S is dangerously misleading:
  · Low-margin businesses (grocery, distribution) legitimately trade at 0.2–0.8x P/S — a 10x P/S for a company with 2% margins implies a 500x P/E on current margins. Catastrophic.
  · Revenue quality matters. One-time contracts, channel stuffing, or non-recurring revenue inflates the denominator. Look at ARR/NRR for SaaS businesses.
  · P/S ignores the path to profitability. A company at 15x P/S burning 30% of revenue annually may never reach profitability before running out of cash.

P/S benchmarks by industry (rough):
  Software / SaaS:          4–15x (high-growth), 2–6x (mature)
  Consumer tech / platform: 3–10x
  Biotech (pre-revenue):    based on pipeline value, not P/S
  Healthcare services:      0.5–2x
  Retail / distribution:    0.2–0.8x
  Industrials:              0.5–2x
  Financial services:       1–4x

The Rule of 40 crossover point: Once a software company crosses 40% on Rule of 40 (revenue growth % + FCF margin %), the market typically re-rates from P/S toward EV/EBITDA as profitability becomes predictable.

Bottom line: Use P/S for pre-profit and early-profit growth businesses. Always pair it with gross margin, burn rate, and an estimate of what margins will look like at scale.`,
  },
  {
    category: 'Valuation',
    title: 'EV/EBITDA',
    subtitle: 'The go-to M&A and cross-sector valuation metric',
    body: `EV/EBITDA = Enterprise Value / EBITDA

Enterprise Value (EV) = Market Cap + Total Debt − Cash
EBITDA = Earnings Before Interest, Taxes, Depreciation, and Amortisation

Why EV instead of market cap?
Market cap only represents equity holders. EV represents the total cost to acquire the business — you inherit both the equity and the debt, and the cash partially offsets that cost.

Why EBITDA instead of net income?
EBITDA strips out:
  · Interest expense: makes companies with different debt loads comparable
  · Taxes: removes jurisdiction effects
  · D&A: removes the distortion of varying depreciation policies and capex intensity

This makes EV/EBITDA the most apples-to-apples comparison across companies with different capital structures and tax situations — which is exactly why investment bankers and PE firms use it as the primary deal-pricing multiple.

How to read it:
  EV/EBITDA < 8x  → typically cheap; mature/slow-growth industries often trade here
  EV/EBITDA 8–15x → fair range for established businesses
  EV/EBITDA 15–25x → growth premium or asset-light business with high margins
  EV/EBITDA > 25x → aggressive growth pricing

Industry norms vary significantly:
  Utilities / telecom:     5–10x (capital-heavy, regulated)
  Industrials:             8–14x
  Healthcare:              10–18x
  Consumer staples:        12–18x
  Software / tech:         15–30x+ (asset-light, scalable)
  Retail:                  5–12x

Limitation: EBITDA ignores capex. Two businesses with identical EBITDA but one spending 30% of EBITDA on capex (to maintain the business) and one spending 5% are very different. EV/EBITDA overstates value for capital-intensive businesses. Use EV/EBIT or EV/FCF for capex-heavy industries.`,
  },
  {
    category: 'Valuation',
    title: 'Price to Book (P/B)',
    subtitle: 'Ben Graham\'s original margin of safety anchor — best for financials',
    body: `P/B = Market Price / Book Value per Share
Book Value = Total Assets − Total Liabilities (i.e., shareholders' equity on the balance sheet)

P/B measures what the market pays relative to the accounting net worth of the business. Benjamin Graham popularised buying stocks below book value as a hard margin of safety — at P/B < 1, you are theoretically buying $1 of net assets for less than $1.

When P/B is most useful:
  · Banks and financials — their assets (loans, securities) are marked to market, so book value reflects economic reality closely. A bank trading at P/B of 0.7 may genuinely be cheap.
  · Insurance companies — reserves and invested assets dominate the balance sheet
  · Asset-heavy industrials — book value reflects real tangible assets

When P/B is misleading:
  · Software and IP-heavy businesses — their most valuable assets (code, brand, talent) don't appear on the balance sheet because GAAP doesn't allow internally-generated intangibles to be capitalised. Amazon, Google, and Microsoft can have P/B ratios of 5–30x not because they're overpriced, but because their true economic value is almost entirely off-balance-sheet.
  · Businesses with heavy share buybacks — buybacks reduce book value (treasury stock reduces equity), so a company that has bought back a lot of stock can show a low or negative book value despite being extremely profitable.

A low P/B does not guarantee safety — a business destroying capital (earning below its cost of equity) will see book value erode over time, making the apparent discount a value trap.

Tangible book value: For businesses with significant goodwill and acquired intangibles (from past acquisitions), subtract those from book value to get a more conservative "tangible book value" — sometimes called Price/TBV.`,
  },
  {
    category: 'Valuation',
    title: 'EV/Revenue and Forward Multiples',
    subtitle: 'Revenue-based enterprise value — capital-structure-neutral top-line comparison',
    body: `EV/Revenue = Enterprise Value / Annual Revenue

Like P/S but using EV instead of market cap, making it capital-structure-neutral. A company with a lot of debt will show a higher EV/Revenue than P/S — which is the honest picture, because the debt-holders also have a claim on the revenue.

Best used for:
  · Pre-profit growth companies where EBITDA is negative
  · Comparing businesses within a sector that have different leverage profiles
  · SaaS and software where revenue is the primary value driver

Forward multiples: When analysts write "NVDA trades at 25x forward revenue" or "18x forward EBITDA," the denominator is next fiscal year's consensus estimate rather than trailing figures. Forward multiples capture the market's expectation that the business is growing — they are almost always lower than trailing multiples for growing companies.

Example: A company with $1B trailing revenue growing 30% YoY will generate ~$1.3B next year. If market cap is $15B:
  Trailing EV/Revenue = 15x
  Forward EV/Revenue  = ~11.5x

Using trailing multiples for fast growers overstates the apparent valuation. Always check which basis you're using.

PEG ratio for revenue: Some analysts compute Revenue Growth-Adjusted multiples — dividing P/S by the revenue growth rate to get a "P/S-G" ratio, analogous to the PEG ratio. This normalises the premium high-growth companies command: a company at 20x P/S growing 50% YoY may be cheaper than a company at 10x P/S growing 10%.`,
  },

  // ── PROFITABILITY ────────────────────────────────────────────────────────────
  {
    category: 'Profitability',
    title: 'OpEx vs CapEx — The Most Misunderstood Distinction in Finance',
    subtitle: 'How a company spends money fundamentally shapes how it should be valued',
    body: `Operating Expenditure (OpEx): Costs incurred in the normal course of running the business that are expensed immediately on the income statement in the period they occur.
  Examples: salaries, rent, marketing, R&D, cloud hosting, raw materials, utilities.

Capital Expenditure (CapEx): Spending on long-lived assets — property, plant, equipment, or acquired intangibles — that is capitalised on the balance sheet and depreciated over time.
  Examples: buying a factory, purchasing servers, acquiring a building, investing in tooling.

Why the distinction matters enormously for investors:

1. EARNINGS vs CASH FLOW divergence
   A company spending $100M on CapEx records only the current year's depreciation (say $10M/year over 10 years) on its income statement. So reported earnings look better than actual cash outflow. This is why heavy capex businesses (manufacturers, utilities, retailers building stores) can show decent P/E ratios while burning cash — you must look at FCF.

   Conversely, high-OpEx businesses (salaries, marketing) expense everything immediately — their earnings are after all costs, making P/E more reliable.

2. THE CAPEX-LITE ADVANTAGE (why tech commands premiums)
   Software businesses have near-zero hardware capex. Their spending is OpEx (engineers, data centers on cloud/opex contracts). This means:
   · Revenue growth drops almost directly to FCF — operating leverage is extreme
   · The business can scale revenue without proportional capital reinvestment
   · FCF margins often reach 30–40% at scale (Visa, Mastercard, Google, Meta)

   A factory owner must spend $1B of capex to double production capacity. A software company can double users with incremental opex. This is why software multiples are structurally higher.

3. MAINTENANCE vs GROWTH CapEx
   Not all capex is equal:
   · Maintenance capex: what must be spent to keep existing assets running (replacing worn machinery, maintaining retail locations). This is an ongoing cost that reduces "true" earnings.
   · Growth capex: investing in new capacity to grow future revenue. This is forward-looking and should not be penalised the same way.

   Warren Buffett's critique of EBITDA: "Does management think the tooth fairy pays for capex?" EBITDA adds back D&A without deducting the capex that generated it — giving a misleading picture for capital-heavy businesses. Always check capex relative to depreciation.

4. R&D: THE OPEX THAT BUILDS MOATS
   Under GAAP, R&D is expensed as OpEx — it reduces current earnings even though it is building future competitive advantage. This means companies that invest heavily in R&D (pharma, semiconductors, software) look less profitable than they economically are. Some analysts "capitalise" R&D to get a truer picture of invested capital and return on investment.

Rule of thumb: CapEx/Revenue > 15% = capital-intensive, examine maintenance vs growth split carefully. CapEx/Revenue < 5% = capital-light, FCF should closely track earnings.`,
  },
  {
    category: 'Profitability',
    title: 'Gross Margin, Operating Margin, and FCF Margin',
    subtitle: 'The profitability waterfall — each layer reveals a different story',
    body: `Revenue
  − Cost of Goods Sold (COGS)
= GROSS PROFIT → Gross Margin = Gross Profit / Revenue

  − Operating Expenses (SG&A, R&D, marketing)
= OPERATING INCOME (EBIT) → Operating Margin = EBIT / Revenue

  − Interest, taxes
= NET INCOME → Net Margin = Net Income / Revenue

  ± Working capital changes − CapEx
= FREE CASH FLOW → FCF Margin = FCF / Revenue

GROSS MARGIN: Pricing power and the cost of delivering the product
  What it reveals: How much of every dollar of revenue survives after paying for what you directly sold. High gross margin = strong pricing power, low commodity input costs, or a software/IP model.

  Benchmarks:
    Software / SaaS:     70–85%
    Pharma / biotech:    60–80%
    Consumer brands:     40–60%
    Healthcare services: 30–50%
    Manufacturing:       20–40%
    Retail / wholesale:  10–30%
    Groceries:           2–5%

  Gross margin is the most durable indicator of competitive moat. It is very hard to structurally improve gross margin — you either have pricing power or you don't.

OPERATING MARGIN: The efficiency of running the whole business
  What it reveals: How much falls through after paying for R&D, sales, marketing, and administration. This is the core business profitability before financing effects.

  Operating leverage: If gross margin is 70% and operating expenses are mostly fixed (salaries, rent), then incremental revenue drops through at the gross margin rate — operating margin expands rapidly with scale. This is why software companies can go from 0% to 30%+ operating margins as they grow.

  Warning sign: Operating margin that is much lower than gross margin suggests bloated overhead, heavy R&D spend (which may or may not be justified), or aggressive sales spending.

FCF MARGIN: The real-world money the business generates
  What it reveals: After all expenses AND capital reinvestment, how much actual cash does the business produce? This is the ultimate profitability test.

  FCF margin < net margin: the business requires significant working capital or capex to grow — inventory-heavy retailers, manufacturers.
  FCF margin ≈ net margin: capital-light business with efficient working capital management.
  FCF margin > net margin: strong working capital dynamics (e.g., businesses paid before they deliver, like subscription SaaS or insurance) or heavy non-cash charges (D&A from past acquisitions exceeding current capex).

  A business that converts 35%+ of revenue to FCF (Visa, Microsoft, Google) is among the most valuable in the world. Protect that margin.`,
  },
  {
    category: 'Profitability',
    title: 'Rule of 40',
    subtitle: 'The benchmark metric for SaaS and growth-stage software companies',
    body: `Rule of 40 = Revenue Growth Rate (%) + FCF Margin (%) ≥ 40

Developed by venture capitalists as a quick health check for SaaS businesses: a company is "healthy" if the combined score of growth and profitability is 40 or above. The idea is that growth and profitability trade off against each other — a company can sacrifice margin to invest in growth, or be highly profitable with slower growth.

Examples:
  40% revenue growth + 0% FCF margin = 40 ✓ (fast growth, breakeven — acceptable)
  20% revenue growth + 20% FCF margin = 40 ✓ (balanced — good)
  10% revenue growth + 35% FCF margin = 45 ✓ (mature, highly profitable — great)
   5% revenue growth +  5% FCF margin = 10 ✗ (neither growing fast nor profitable — trouble)
  60% revenue growth − 10% FCF margin = 50 ✓ (hyper-growth burning cash — acceptable if sustainable)

Why it matters:
  The Rule of 40 identifies which growth companies are spending efficiently vs. burning capital for growth that won't materialise. A company at 15 Rule of 40 at 50% revenue growth is a red flag — it's spending massively without sufficient growth to justify it.

Elite territory: Rule of 40 > 60 puts a company in "elite" territory — strong growth AND strong profitability. Historically, companies sustaining > 60 Rule of 40 have delivered exceptional shareholder returns (think Salesforce in its prime, Datadog, MongoDB at peak).

Limitations:
  · Works best for pure SaaS / subscription businesses with predictable recurring revenue
  · Less useful for hardware, marketplaces, or businesses with lumpy revenue recognition
  · Revenue growth rate should use ARR (Annual Recurring Revenue) or normalized recurring revenue for SaaS, not total GAAP revenue which can be lumpy
  · Some practitioners use EBITDA margin instead of FCF margin — be consistent when comparing across companies`,
  },
  {
    category: 'Profitability',
    title: 'Return on Equity (ROE) and Return on Invested Capital (ROIC)',
    subtitle: 'How efficiently is management deploying capital?',
    body: `ROE = Net Income / Shareholders' Equity

ROE measures how much profit is generated for every dollar of equity capital that shareholders have invested. A company earning $20 on $100 of equity has a 20% ROE.

High ROE (> 15–20%) suggests a business with:
  · Strong competitive advantages (pricing power, switching costs, network effects)
  · Capital efficiency — the business does not need to reinvest heavily to grow
  · Examples: Apple (~150% ROE), Visa (~45% ROE), Coca-Cola (~40% ROE)

The DuPont decomposition of ROE:
  ROE = Net Margin × Asset Turnover × Financial Leverage
        (profitability) × (efficiency) × (leverage)

This is critical: two companies can have the same ROE via very different routes:
  · High ROE via high margins (Apple) = quality
  · High ROE via financial leverage / debt (a leveraged retailer) = fragile and risky
  Always check whether ROE is driven by genuine business quality or debt.

ROIC: A superior metric
  ROIC = NOPAT / Invested Capital
  where NOPAT = Net Operating Profit After Tax, Invested Capital = Equity + Debt − Cash

  ROIC is capital-structure-neutral — it measures returns on ALL capital deployed, regardless of whether it came from debt or equity. A company that can consistently earn ROIC > its cost of capital (WACC) is creating economic value and deserves to trade at a premium to book value.

  ROIC > WACC → value creation → stock should trade above book value
  ROIC < WACC → value destruction → stock should trade below book value

  Warren Buffett's ideal business: one that earns high ROIC and can reinvest large amounts of capital at that same high rate — which is what compounds wealth over time. Sees's Candies, Coca-Cola, and American Express all fit this profile.`,
  },

  // ── BALANCE SHEET ────────────────────────────────────────────────────────────
  {
    category: 'Balance Sheet',
    title: 'Debt/Equity and Net Debt/EBITDA',
    subtitle: 'Measuring financial leverage and the risk it introduces',
    body: `DEBT/EQUITY (D/E) = Total Debt / Shareholders' Equity

The D/E ratio tells you how much of the company's assets are financed by debt vs. equity. A D/E of 2.0 means $2 of debt for every $1 of equity.

Context matters enormously:
  · Utilities and REITs routinely carry D/E of 1.0–3.0 because their cash flows are stable and predictable — lenders are comfortable.
  · Banks have very high D/E by design (they are in the business of borrowing and lending).
  · Technology companies typically carry very low debt (D/E < 0.5) because their assets are intangible and lenders want predictable collateral.
  · Cyclical businesses (mining, airlines, retail) with high D/E are dangerous — cash flows can collapse in a downturn while debt is fixed, leading to bankruptcy.

NET DEBT / EBITDA = (Total Debt − Cash) / EBITDA

This is the preferred leverage measure for most investment analysis because:
  · Net debt accounts for cash on hand — a company with $5B debt and $3B cash has $2B net debt
  · EBITDA is a rough proxy for cash generation capacity
  · The ratio tells you: "How many years of current earnings would it take to pay off the debt?"

Benchmarks:
  Net Debt/EBITDA < 1x  → conservative, plenty of headroom
  1x–2x                  → moderate leverage, manageable
  2x–3x                  → elevated; acceptable in stable industries
  3x–4x                  → high; appropriate only for very stable cash flows
  > 4x                   → very high; distressed territory for cyclical businesses

Negative Net Debt: Companies with more cash than debt have "net cash" — shown as negative Net Debt/EBITDA. This is a financial fortress — Apple, Microsoft, and Alphabet all have massive net cash positions. Net cash companies can weather downturns, fund acquisitions, and buy back stock.

Interest coverage ratio: Another useful check — EBIT / Interest Expense. Coverage < 2x signals risk of being unable to service debt from operations.`,
  },
  {
    category: 'Balance Sheet',
    title: 'Current Ratio and Working Capital',
    subtitle: 'Can the business pay its near-term bills?',
    body: `CURRENT RATIO = Current Assets / Current Liabilities

Current assets: cash, receivables, inventory — assets expected to convert to cash within 12 months.
Current liabilities: accounts payable, short-term debt, accrued expenses — obligations due within 12 months.

A current ratio above 1.0 means the company can cover its near-term obligations with near-term assets.

Guidelines:
  Current ratio < 1.0  → potential short-term liquidity stress
  Current ratio 1.0–2.0 → generally healthy
  Current ratio > 2.0  → very conservative; may signal inefficient use of working capital

Quick ratio (acid test): (Cash + Receivables) / Current Liabilities — excludes inventory (which may not be easily liquidated). More conservative measure of liquidity.

Working capital = Current Assets − Current Liabilities

Working capital cycle: Understanding how the business converts inputs to cash reveals operational quality:
  · Days Sales Outstanding (DSO): how long it takes to collect from customers. High DSO can signal weak customer relationships or revenue recognition issues.
  · Days Inventory Outstanding (DIO): how long inventory sits before it's sold. High DIO in a fast-changing industry (fashion, tech) is a risk.
  · Days Payable Outstanding (DPO): how long the company takes to pay suppliers. High DPO = company is using supplier credit as a source of financing (Amazon, Walmart have massively negative cash conversion cycles — they collect cash before paying suppliers).

Cash conversion cycle = DSO + DIO − DPO. Negative = the company generates cash before spending it — a significant competitive advantage.`,
  },

  // ── TECHNICAL ───────────────────────────────────────────────────────────────
  {
    category: 'Technical',
    title: 'RSI — Relative Strength Index',
    subtitle: 'Momentum oscillator for identifying overbought and oversold conditions',
    body: `RSI = 100 − [100 / (1 + RS)]   where RS = Average Gain / Average Loss over 14 periods

RSI oscillates between 0 and 100. It measures the speed and magnitude of recent price changes to evaluate whether a security is overbought (too expensive relative to recent moves) or oversold (too beaten down).

Zones:
  RSI ≥ 70  → Overbought: strong recent upward momentum; price may be extended, risk of pullback
  RSI 55–70 → Neutral-High: uptrend momentum, not extreme
  RSI 45–55 → Neutral: balanced, no clear directional signal
  RSI 35–45 → Neutral-Low: mild weakness, potentially digesting gains
  RSI ≤ 35  → Oversold: strong recent downward momentum; price may be extended to the downside

How this screener uses RSI:
  BUY CALL: RSI 38–60 — mild pullback within uptrend. Not so oversold that the stock is broken; not so overbought that you're chasing.
  SELL PUT: RSI 40–65 — neutral, not showing breakdown signals.
  BUY PUT: RSI 55–75 — a bounce within a downtrend (elevated RSI during a long downtrend often fails).

Important nuances:
  · RSI is a relative measure — in a strong bull market, stocks can remain "overbought" (RSI > 70) for extended periods. RSI works better as a pullback signal within a trend than as a standalone reversal signal.
  · Divergence is the most powerful RSI signal: if price makes a new high but RSI does not, the trend is weakening (bearish divergence). If price makes a new low but RSI does not, the trend is exhausting (bullish divergence).
  · 14-period RSI is standard; shorter periods (7-period) are more sensitive and volatile; longer periods (21-period) are smoother.

RSI was developed by J. Welles Wilder Jr. in 1978. Despite being nearly 50 years old, it remains one of the most used technical indicators in professional and retail trading.`,
  },
  {
    category: 'Technical',
    title: 'Moving Averages and the Golden Cross',
    subtitle: 'Trend identification tools — the market\'s most widely followed signals',
    body: `A moving average smooths out price data by averaging closing prices over a set number of days.

SIMPLE MOVING AVERAGE (SMA):
  50-day SMA (MA50): Average closing price over the last 50 trading days. Reflects intermediate-term trend.
  200-day SMA (MA200): Average over the last 200 trading days (~10 months). Reflects long-term trend.

EXPONENTIAL MOVING AVERAGE (EMA): Gives more weight to recent prices. More responsive than SMA but more sensitive to noise.

THE GOLDEN CROSS:
  Occurs when the 50-day MA crosses above the 200-day MA.
  Widely interpreted as a long-term bullish signal — short-term momentum is outpacing long-term trend.
  Historically associated with the beginning of meaningful uptrends.

THE DEATH CROSS:
  Occurs when the 50-day MA crosses below the 200-day MA.
  Widely interpreted as a long-term bearish signal.
  Note: death crosses often occur during or after a significant decline — the signal is often "late" but useful for trend confirmation.

HOW TO USE THEM IN COMBINATION:
  Price > MA200, MA50 > MA200 (golden cross)
  → Full uptrend alignment; the strongest configuration for bullish trades

  Price < MA200, MA50 < MA200
  → Full downtrend; the appropriate configuration for bearish trades or avoiding longs

  Price > MA200 but no golden cross
  → Recovering from a downtrend; intermediate setup

  Price < MA200 but RSI bouncing
  → Dead-cat bounce potential (BUY PUT setup in this screener)

Support and resistance:
  Moving averages act as dynamic support and resistance levels. A stock that has been above its 200MA for years and then touches it often bounces — the MA has become a well-known support level that many traders act on simultaneously, making it self-reinforcing.

The 200MA as the regime signal:
  Many professional allocators use whether the S&P 500 is above or below its 200MA as a market regime gate. Above = bull market, risk-on. Below = bear market, risk-off. This screener uses the SPY/200MA regime gate to control BUY CALL candidates.`,
  },
  {
    category: 'Technical',
    title: 'Historical Volatility (HV) and Implied Volatility (IV)',
    subtitle: 'Measuring what has happened vs what the market expects to happen',
    body: `HISTORICAL VOLATILITY (HV):
  The annualised standard deviation of daily log returns over a trailing window.
  This screener uses 21-day HV (roughly one trading month).
  HV measures what has actually happened to price — the realised choppiness of the stock.

  Calculation: σ_daily = std_dev(daily log returns) over 21 days
               HV_annualised = σ_daily × √252

IMPLIED VOLATILITY (IV):
  The market's forward-looking estimate of future volatility, derived from current options prices.
  If a straddle costs $5 on a $100 stock, the market is pricing in an expected move of approximately ±5% over the life of the option.

  IV is not directly observable like price — it must be solved for by working backwards through the Black-Scholes formula (or similar model) given the observed option price.

IV vs HV — THE KEY RELATIONSHIP:
  IV > HV: Options are "expensive" — the market expects more volatility than has recently occurred. You are paying a premium for uncertainty. Selling options in this environment captures the "volatility risk premium" — the excess IV tends to revert toward HV.

  IV < HV: Options are "cheap" — the market expects less volatility than has recently occurred. Buying options here can offer better risk/reward.

IV/HV RATIO — used in this screener:
  IV/HV ratio < 1.8 is required for BUY CALL setups.
  Rationale: When IV/HV > 1.8, you are overpaying for the option relative to actual realized volatility. The theoretical edge disappears. At 1.8×, you need the stock to move significantly more than average just to overcome the premium decay (theta).

VIX — THE MARKET'S FEAR GAUGE:
  The CBOE VIX measures the 30-day implied volatility of the S&P 500 index, derived from SPX options.
  VIX < 15  → Low fear, complacency, calm markets
  VIX 15–25 → Normal market environment
  VIX 25–35 → Elevated fear, increased uncertainty
  VIX > 35  → Extreme fear; historically coincides with market bottoms or acute crises
  VIX > 50  → Panic (March 2020 COVID crash, October 2008 financial crisis peak)`,
  },

  // ── OPTIONS ─────────────────────────────────────────────────────────────────
  {
    category: 'Options',
    title: 'Options Fundamentals — What Are They and Why Do They Exist?',
    subtitle: 'The vocabulary and mechanics every investor should understand',
    body: `An option is a contract that gives the buyer the RIGHT (but not the obligation) to buy or sell 100 shares of an underlying stock at a specified price before a specified date. The seller (writer) of the option takes on the corresponding obligation in exchange for receiving the premium upfront.

Every option contract specifies:
  Underlying: the stock or ETF it refers to (e.g., AAPL)
  Strike Price (K): the price at which the option can be exercised
  Expiration Date: the last day the option can be exercised
  Type: CALL or PUT
  Premium: the price paid for the option (per share; multiply by 100 for total cost per contract)

CALL OPTION — the right to BUY
  You buy a call when you expect the stock to rise.
  If AAPL is at $200 and you buy a $210 call for $3, you have the right to buy AAPL at $210 any time before expiration.
  If AAPL rises to $230: your option is worth at least $20 → you paid $3, profit = $17 per share ($1,700 per contract)
  If AAPL stays at $200: your option expires worthless → you lose the $300 premium

PUT OPTION — the right to SELL
  You buy a put when you expect the stock to fall.
  If AAPL is at $200 and you buy a $190 put for $3, you have the right to sell AAPL at $190 any time before expiration.
  If AAPL falls to $170: your put is worth at least $20 → profit = $17 per share ($1,700 per contract)
  If AAPL stays above $190: put expires worthless → you lose the $300 premium

Why do options exist?
  · Hedging: portfolio managers buy puts to protect holdings against downside without selling
  · Income: shareholders sell covered calls to collect premium on stock they already own
  · Leverage: control $20,000 of stock exposure for $500 in premium
  · Speculation: express directional views with defined maximum loss (premium paid)
  · Market making: banks and institutions use options to manage risk in their books

One contract = 100 shares. Always multiply the per-share premium by 100 to get the total dollar cost.`,
  },
  {
    category: 'Options',
    title: 'Moneyness — ITM, ATM, and OTM',
    subtitle: 'Understanding where the strike is relative to current price',
    body: `Moneyness describes the relationship between the option's strike price and the current stock price. It is fundamental to understanding option pricing and strategy selection.

IN THE MONEY (ITM):
  For a CALL: Strike < Current Price (the option has intrinsic value — you could exercise and immediately profit)
  For a PUT:  Strike > Current Price

  Example: AAPL at $200, $190 call is $10 in the money. $210 put is $10 in the money.
  ITM options are more expensive (higher premium), move more like the underlying (high delta), and have more intrinsic value but less leverage.

AT THE MONEY (ATM):
  Strike ≈ Current Price
  ATM options have the highest time value and the highest gamma (rate of delta change). Most sensitive to volatility.

OUT OF THE MONEY (OTM):
  For a CALL: Strike > Current Price (the option has no intrinsic value yet — the stock must move to make it profitable)
  For a PUT:  Strike < Current Price

  Example: AAPL at $200, a $220 call is $20 OTM. A $180 put is $20 OTM.
  OTM options are cheaper, offer more leverage (bigger % gain on a given move), but have a lower probability of expiring in the money.

WHY OTM OPTIONS FOR DIRECTIONAL TRADES?
  This screener targets OTM calls (0–6% OTM) for BUY CALL setups. The rationale:
  · OTM options cost less premium → defined and limited risk
  · OTM calls have positive delta that grows as the stock moves up (gamma)
  · A 0–6% OTM strike means the stock needs only a modest move to become profitable
  · Deeper OTM options (10%+ OTM) require very large moves and have very low probability of profit — they are lottery tickets, not trading tools

INTRINSIC VALUE vs TIME VALUE (EXTRINSIC VALUE):
  Option Premium = Intrinsic Value + Time Value

  Intrinsic value: the amount the option is currently in the money (never negative)
    Call intrinsic = max(Stock Price − Strike, 0)
    Put intrinsic  = max(Strike − Stock Price, 0)

  Time value (extrinsic): everything else — the premium the market pays for the possibility that the option moves further into the money before expiration. This decays to zero by expiration (see Theta).`,
  },
  {
    category: 'Options',
    title: 'The Greeks — Delta, Gamma, Theta, Vega',
    subtitle: 'How options prices change as market conditions change — the essential toolkit',
    body: `The Greeks measure an option's sensitivity to various factors. They are partial derivatives of the option pricing formula — each one isolates a single variable.

DELTA (Δ) — Sensitivity to stock price movement
  Definition: How much the option price moves for a $1 move in the underlying stock.
  Call delta: 0 to +1. Deep ITM calls → delta ≈ 1 (move dollar for dollar with stock). Deep OTM calls → delta ≈ 0.
  Put delta: −1 to 0.

  Practical use:
  · A $5 call with delta = 0.40 gains ~$0.40 for every $1 the stock rises.
  · Delta also approximates the probability of expiring in the money. A 0.40 delta ≈ 40% chance of expiry ITM.
  · ATM options typically have delta ≈ 0.50.
  · Delta hedging: market makers who sell you options immediately buy δ shares of the underlying to offset their directional exposure — they don't care which way the stock moves, they profit from the bid-ask spread.

GAMMA (Γ) — Rate of change of delta
  Definition: How much delta changes for a $1 move in the underlying.
  Gamma is highest for ATM options and near expiration. It is always positive for option buyers.

  Practical use:
  · If you own an ATM call with delta = 0.50 and gamma = 0.08, a $1 rise in stock → delta becomes 0.58.
  · Gamma accelerates gains as options move into the money — and accelerates losses as they move out of the money.
  · "Long gamma" means you benefit from large moves in either direction (long straddle).
  · "Short gamma" means you profit from calm markets but are exposed to large moves (short straddle, sell put).

THETA (Θ) — Time decay — the option buyer's enemy, the seller's friend
  Definition: How much option value is lost per day, all else equal.
  Theta is always negative for option buyers (value erodes with time). Always positive for sellers.

  Time decay is not linear — it accelerates dramatically in the last 21–30 days before expiration. This is why this screener exits at 21 DTE: after that point, theta decay becomes the dominant force.

  Practical rule: If you buy an option with 60 DTE and the stock doesn't move, you are losing money every day. Theta is your "carrying cost." Always be aware of how many days your trade has to work.

VEGA (V) — Sensitivity to implied volatility
  Definition: How much the option price changes for a 1% change in implied volatility.
  Vega is always positive for option buyers (higher IV → more expensive options).

  Practical use:
  · If you buy a call with vega = 0.15 and IV rises by 5%, the option gains $0.75 in value from vega alone — even if the stock doesn't move.
  · IV crush: after earnings announcements, IV collapses (from inflated pre-earnings levels back to normal). If you bought options before earnings and the stock moved in your direction, but IV crushed, you can still lose money. This is why this screener avoids options with earnings within the expiry window.
  · Selling options after an IV spike (e.g., after a market shock) lets you collect elevated premium that tends to revert.

RHO (ρ) — Sensitivity to interest rates. Less important for short-dated equity options in most environments. Higher interest rates increase call values slightly and decrease put values.`,
  },
  {
    category: 'Options',
    title: 'Selling Options for Income — Covered Calls and Cash-Secured Puts',
    subtitle: 'How income investors use options to generate yield on portfolios',
    body: `Options can be sold (written) to collect premium income. The seller receives the premium upfront and takes on the obligation to buy or sell stock if the option is exercised.

COVERED CALL:
  You own 100 shares of stock AND sell a call option against those shares.
  You collect the premium. If the stock rises above the strike, your shares get called away (sold at strike), capping your upside. If the stock stays below the strike, you keep the premium and still own the shares.

  When to use: when you are willing to sell your stock at the strike price (i.e., you think it's fairly valued or slightly expensive) and want to earn income while holding.

  Example: Own AAPL at $200. Sell $215 call for $4 premium, 30 DTE.
  · AAPL stays below $215: keep $400 premium. Annualised yield ≈ 24% on top of any dividends.
  · AAPL rises to $230: shares sold at $215 (you miss $15 of upside above $215, but kept $4 premium).
  · AAPL falls to $180: you keep the $400 premium, which partially offsets the $2,000 paper loss on the shares.

CASH-SECURED PUT (the SELL PUT strategy in this screener):
  You sell a put option and hold enough cash to buy the shares if the put is exercised.
  You collect premium. If the stock falls below the strike, you are obligated to buy shares at the strike price (offset by the premium received).

  The philosophy: sell puts on stocks you would GENUINELY WANT TO OWN at the strike price. You either collect premium and the stock stays above strike, or you acquire shares at an effective cost below market (strike minus premium).

  Example: XYZ trades at $100. Sell $90 put for $3 premium, 30 DTE. Reserve $9,000.
  · XYZ stays above $90: keep $300 (annualised yield ≈ 12% on cash reserved).
  · XYZ falls to $80: you buy 100 shares at $90, effective cost = $87. The shares are now worth $80 — a $700 paper loss, partially offset by the $300 premium.

  This is Buffett's actual approach: he has sold puts on companies he wants to own (he sold puts on Coca-Cola in the 1990s) to either collect premium or acquire the stock at a lower effective price.

KEY RISK: Options selling has limited upside (the premium) but can have large downside (if the stock collapses). Never sell puts on stocks you wouldn't want to own at the strike price.`,
  },
  {
    category: 'Options',
    title: 'Black-Scholes and Option Pricing Intuition',
    subtitle: 'The model behind every option price — how to think about it without the math',
    body: `The Black-Scholes model (Fischer Black, Myron Scholes, 1973) is the foundational framework for option pricing. It won the Nobel Prize in Economics in 1997 (Scholes and Merton; Black had died).

THE CORE INPUTS:
  S = Current stock price
  K = Strike price
  T = Time to expiration (in years)
  σ = Volatility (annualised standard deviation of returns — in practice, IV is backed out from market prices)
  r = Risk-free interest rate

THE FORMULA (Call):
  d1 = [ln(S/K) + (r + 0.5σ²)T] / (σ√T)
  d2 = d1 − σ√T
  Call = S·N(d1) − K·e^(−rT)·N(d2)
  Put  = K·e^(−rT)·N(−d2) − S·N(−d1)

where N() is the cumulative normal distribution function.

INTUITION WITHOUT THE MATH:
  The option price is primarily driven by five factors — in rough order of importance for short-dated equity options:

  1. HOW MUCH can the stock move? (Volatility)
     The more volatile the stock, the more likely the option will end up in the money. Higher σ → higher premium for both calls AND puts.

  2. HOW LONG until expiration? (Time)
     More time = more opportunity for the stock to move. Longer T → higher premium. This is why time value exists and decays (Theta).

  3. HOW FAR is the strike from current price? (Moneyness)
     An ATM option has more time value than a deep OTM option. A deep ITM option has high intrinsic value but less time value.

  4. INTEREST RATES (minor for most equity options)
     Higher rates increase call values marginally (the cost of carrying the underlying is higher).

WHAT BLACK-SCHOLES GETS WRONG:
  · It assumes constant volatility — reality: volatility is stochastic and mean-reverting. This produces the "volatility smile" (OTM options trade at higher implied vol than ATM options).
  · It assumes normally distributed returns — reality: fat tails (extreme moves are more common than the model predicts). This is why OTM puts (protection against crashes) are systematically expensive — the market pays more for tail protection than the normal distribution implies.
  · No dividends in the basic formula (easily extended).
  · No early exercise (the model is for European options; American options can be exercised early).

Despite its flaws, Black-Scholes remains the universal language of options trading. Traders quote implied volatility rather than option prices — which means they're saying "here's the σ that makes Black-Scholes give you this price." IV is the market's way of expressing option expensiveness in a single number.`,
  },
  {
    category: 'Options',
    title: 'DTE, Bid-Ask Spread, and Open Interest — Practical Considerations',
    subtitle: 'The real-world execution factors that determine whether a trade actually works',
    body: `DAYS TO EXPIRATION (DTE):
  DTE = number of calendar days until the option expires.

  The sweet spot for directional trades: 25–65 DTE
  · Too short (< 21 DTE): Theta decay is at its fastest and most punishing. Even correct directional bets can be eaten by time decay.
  · Too long (> 90 DTE): Expensive premium, slower delta response, capital tied up for longer.

  The 21 DTE exit rule: Used throughout this screener for both buy and sell strategies. At 21 DTE, theta acceleration makes it mathematically unfavourable to hold. Exiting at 21 DTE regardless of profit/loss on SELL strategies captures ~80–90% of the available premium while avoiding the tail-risk of a sharp move in the final weeks.

BID-ASK SPREAD:
  Every option has a bid (the price a market maker will pay you to buy the option from you) and an ask (the price you pay to buy the option).

  The spread = Ask − Bid. You lose this amount on every round-trip (buy and then sell).

  Wide spreads are a hidden cost that decimates theoretical edge:
  · A spread of $0.50 on a $2.00 option = 25% of the option's value lost immediately on entry.
  · This screener filters bid-ask spread < 20% of mid-price. This keeps execution cost tolerable.

  Tight spreads (< 5%) → highly liquid, actively traded options (AAPL, SPY, TSLA, NVDA)
  Wide spreads (> 15%) → illiquid options; theoretical value on paper rarely translates to executable profits

OPEN INTEREST (OI):
  The total number of outstanding option contracts that have not been settled or closed.
  High OI = liquid market = tighter bid-ask spreads = easier to enter and exit.

  This screener requires OI ≥ 100. Options with OI < 50 are often untradeable at reasonable prices — market makers quote very wide spreads when there is little interest.

  Volume vs OI: Volume = contracts traded today. OI = total open contracts. Rising volume on an option with high OI = active, liquid market. Rising volume on an option with low OI = might just be a single large trade.

EARNINGS RISK:
  IV spikes dramatically before earnings announcements as the market prices in the binary event. After earnings, IV crushes — often by 30–50% — regardless of the direction of the stock move.

  If you are long an option through earnings: the IV crush can mean you lose money even if the stock moves your direction. A stock moving +5% while IV drops from 60% to 35% can result in a flat or losing option position.

  This is why this screener explicitly excludes stocks with earnings within the option's expiry window.`,
  },
]

function TopicCard({ topic }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-800 hover:border-gray-700 transition-colors">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start justify-between px-5 py-4 text-left hover:bg-gray-900/40 transition-colors"
      >
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-2.5 mb-0.5">
            <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 border ${CATEGORY_STYLES[topic.category]}`}>
              {topic.category}
            </span>
          </div>
          <div className="text-[13px] font-bold text-white tracking-wide">{topic.title}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">{topic.subtitle}</div>
        </div>
        <div className="shrink-0 mt-1">
          {open
            ? <ChevronUp size={14} className="text-gray-500" />
            : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-800 px-5 py-4 bg-gray-900/30">
          <pre className="text-[12px] text-gray-400 whitespace-pre-wrap leading-relaxed font-mono">
            {topic.body}
          </pre>
        </div>
      )}
    </div>
  )
}

const CATEGORY_STYLES = {
  Valuation:    'border-blue-500/40 text-blue-400 bg-blue-500/10',
  Profitability:'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
  'Balance Sheet':'border-yellow-500/40 text-yellow-400 bg-yellow-500/10',
  Technical:    'border-cyan-500/40 text-cyan-400 bg-cyan-500/10',
  Options:      'border-purple-500/40 text-purple-400 bg-purple-500/10',
}

const CATEGORY_TAB_STYLES = {
  Valuation:    'border-blue-500 text-blue-400',
  Profitability:'border-emerald-500 text-emerald-400',
  'Balance Sheet':'border-yellow-400 text-yellow-400',
  Technical:    'border-cyan-500 text-cyan-400',
  Options:      'border-purple-500 text-purple-400',
}

export default function EducationTab() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch] = useState('')

  const visible = useMemo(() => {
    return TOPICS.filter(t => {
      const matchCat = activeCategory === 'All' || t.category === activeCategory
      const q = search.toLowerCase()
      const matchSearch = !q ||
        t.title.toLowerCase().includes(q) ||
        t.subtitle.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q)
      return matchCat && matchSearch
    })
  }, [activeCategory, search])

  const counts = useMemo(() => {
    const c = { All: TOPICS.length }
    CATEGORIES.forEach(cat => {
      if (cat !== 'All') c[cat] = TOPICS.filter(t => t.category === cat).length
    })
    return c
  }, [])

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-gray-800 pb-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={14} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Education Center</h2>
          </div>
          <p className="text-[11px] text-gray-600">
            Key concepts behind every metric in this screener — valuation multiples, profitability, balance sheet health, technical analysis, and options.
          </p>
        </div>
        <div className="text-[11px] text-gray-700 shrink-0 ml-6">
          {visible.length} topic{visible.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Category tabs + search */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex overflow-x-auto">
          {CATEGORIES.map(cat => {
            const isActive = activeCategory === cat
            const colorClass = cat !== 'All' && isActive ? CATEGORY_TAB_STYLES[cat] : ''
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? cat === 'All'
                      ? 'border-white text-white'
                      : `${colorClass} border-b-2`
                    : 'border-transparent text-gray-600 hover:text-gray-400'
                }`}
              >
                {cat}
                <span className="text-[10px] opacity-50">({counts[cat]})</span>
              </button>
            )
          })}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search topics..."
          className="ml-auto bg-gray-900 border border-gray-800 text-gray-300 text-xs px-3 py-1.5 focus:outline-none focus:border-gray-600 w-48"
        />
      </div>

      {/* Topic list */}
      {visible.length === 0 ? (
        <div className="py-24 text-center text-gray-700 text-sm">
          No topics match — try a different search or category
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map(topic => (
            <TopicCard key={topic.title} topic={topic} />
          ))}
        </div>
      )}
    </div>
  )
}
