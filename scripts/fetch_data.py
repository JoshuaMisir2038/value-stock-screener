"""
Fetches value metrics + technical indicators (RSI, 200MA) for US-listed stocks.
Uses Friday market close data. Outputs stocks.json and options.json.
"""

import json
import time
import os
import warnings
from datetime import datetime, timezone, date, timedelta

import io
import requests
import yfinance as yf
import pandas as pd

warnings.filterwarnings('ignore')

# Fallback hardcoded list used if Wikipedia fetch fails
_FALLBACK_TICKERS = [
    "A","AAL","AAP","AAPL","ABBV","ABC","ABT","ACN","ADBE","ADI","ADM",
    "ADP","ADSK","AEE","AEP","AES","AFL","AIG","AIZ","AJG","AKAM","ALB","ALGN",
    "ALK","ALL","ALLE","AMAT","AMCR","AMD","AME","AMGN","AMP","AMT","AMZN","ANET",
    "AON","AOS","APA","APD","APH","APTV","ARE","ATO","AVB","AVGO","AVY",
    "AWK","AXP","AZO","BA","BAC","BALL","BAX","BBY","BDX","BEN","BIO",
    "BIIB","BK","BKNG","BKR","BLK","BMY","BR","BSX","BWA","BXP","C",
    "CAG","CAH","CARR","CAT","CB","CBOE","CBRE","CCI","CCL","CDNS","CDW","CE",
    "CF","CFG","CHD","CHRW","CHTR","CI","CINF","CL","CLX","CMA","CMCSA","CME",
    "CMG","CMI","CMS","CNC","CNP","COF","COO","COP","COST","CPB","CPRT","CRL",
    "CRM","CSCO","CSX","CTAS","CTRA","CTSH","CTVA","CVS","CVX","D",
    "DAL","DD","DE","DFS","DG","DGX","DHI","DHR","DIS","DLR","DLTR",
    "DOV","DOW","DPZ","DRI","DTE","DUK","DVA","DVN","DXC","DXCM","EA",
    "EBAY","ECL","ED","EFX","EIX","EL","EMN","EMR","EOG","EQIX","EQR",
    "EQT","ES","ESS","ETN","ETR","ETSY","EVRG","EW","EXC","EXPD","EXPE","EXR",
    "F","FAST","FCX","FDS","FDX","FE","FFIV","FIS","FISV",
    "FITB","FLT","FMC","FOX","FOXA","FRT","FTNT","FTV","GD","GE","GILD",
    "GIS","GL","GLW","GM","GNRC","GOOGL","GPC","GPN","GRMN","GS","GWW",
    "HAL","HAS","HBAN","HCA","HD","HES","HIG","HII","HLT","HOLX","HON","HPE",
    "HPQ","HRL","HSIC","HST","HSY","HUM","HWM","IBM","ICE","IDXX","IEX","IFF",
    "ILMN","INCY","INTC","INTU","IP","IPG","IQV","IR","IRM","ISRG","IT",
    "ITW","IVZ","J","JBHT","JCI","JKHY","JNJ","JPM","K","KEY","KEYS",
    "KHC","KIM","KLAC","KMB","KMI","KMX","KO","KR","L","LDOS","LEN","LH","LHX",
    "LIN","LKQ","LLY","LMT","LNC","LNT","LOW","LRCX","LUV","LVS","LW",
    "LYB","LYV","MA","MAA","MAR","MAS","MCD","MCHP","MCK","MCO","MDLZ","MDT",
    "MET","META","MGM","MHK","MKC","MLM","MMC","MMM","MNST","MO","MOS",
    "MPC","MPWR","MRK","MRNA","MRO","MS","MSCI","MSFT","MTB","MTD","MU",
    "NCLH","NEE","NEM","NFLX","NI","NKE","NOC","NOW","NRG","NSC","NTAP",
    "NTRS","NUE","NVDA","NVR","NWL","O","ODFL","OKE",
    "OMC","ORCL","ORLY","OTIS","OXY","PAYC","PAYX","PCAR","PEG",
    "PEP","PFE","PFG","PG","PGR","PH","PHM","PKG","PLD","PM","PNC","PNR",
    "PNW","POOL","PPG","PPL","PRU","PSA","PSX","PTC","PWR","PYPL",
    "QCOM","RCL","RE","REG","REGN","RF","RHI","RJF","RL","RMD","ROK",
    "ROL","ROP","ROST","RSG","RTX","SBAC","SBUX","SEE","SHW",
    "SJM","SLB","SNA","SNPS","SO","SPG","SPGI","SRE","STE","STT","STX","STZ",
    "SWK","SWKS","SYF","SYK","SYY","T","TAP","TDG","TDY","TEL","TER",
    "TFC","TFX","TGT","TJX","TMO","TMUS","TPR","TROW","TRV","TSCO","TSLA",
    "TSN","TT","TTWO","TXN","TXT","UDR","UHS","ULTA",
    "UNH","UNM","UNP","UPS","URI","USB","V","VLO","VMC","VNO","VRSK",
    "VRSN","VRTX","VTR","VZ","WAB","WAT","WBA","WDC","WEC","WELL","WFC","WHR",
    "WM","WMB","WMT","WRB","WST","WU","WY","WYNN","XEL","XOM",
    "XRAY","XYL","YUM","ZBH","ZBRA","ZION","ZTS",
    "AGCO","ANF","ARW","ASH","ATR","BECN","BJ","BOOT",
    "CABO","CDAY","CHE","CPT","CRI","CW","DAN","DKNG","DLX",
    "EAT","ENPH","ENS","EXP","FLO","FLS","FNB","FR","FULT","GFF","GGG",
    "GPI","GXO","HAE","HBI","HCC","HGV","HIW","HNI","HP","HRC","HRI","HRB",
    "HUBB","JBL","JEF","JHG","JLL","KBH","KFY","KMT","KNX","KRC","KSS",
    "LGIH","LSTR","MASI","MCY","MHO","MIDD","MSA","NBR","NDSN","OII","OLN",
    "OLLI","ORI","OZK","PII","PIPR","PLNT","POWI","PRGO","RPM",
    "SCI","SEIC","SF","SFM","SKT","SLGN","SLM","SM","SMCI","SMG",
    "SNDR","SPSC","STEP","STRA","SUM","TGNA","THG","TREX","TRN",
    "URBN","USFD","VIRT","VLY","WAFD","WBS","WEN","WERN","WGO","WOR","WPC",
    "WRLD","WTFC","WWD",
]

def _nasdaq_ftp_tickers():
    """
    Primary source: NASDAQ FTP symbol directory — all US-listed common stocks.
    nasdaqlisted.txt  cols: Symbol | Name | Market | TestIssue | FinStatus | LotSize | ETF | NextShares
    otherlisted.txt   cols: ACTSymbol | Name | Exchange | CQSSymbol | ETF | LotSize | TestIssue | NASDAQSymbol
    """
    tickers = set()
    sources = [
        ('https://ftp.nasdaqtrader.com/SymbolDirectory/nasdaqlisted.txt',
         dict(sym=0, etf=6, test=3, fin=4)),
        ('https://ftp.nasdaqtrader.com/SymbolDirectory/otherlisted.txt',
         dict(sym=0, etf=4, test=6, fin=None)),
    ]
    for url, idx in sources:
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=30)
        r.raise_for_status()
        for line in r.text.splitlines()[1:]:
            if line.startswith('File Creation') or not line.strip():
                continue
            parts = line.split('|')
            if len(parts) < 5:
                continue
            sym  = parts[idx['sym']].strip()
            etf  = parts[idx['etf']].strip()  if idx['etf']  < len(parts) else 'N'
            test = parts[idx['test']].strip() if idx['test'] < len(parts) else 'N'
            fin  = parts[idx['fin']].strip()  if idx['fin'] is not None and idx['fin'] < len(parts) else 'N'
            # Skip ETFs, test issues, financially distressed, warrants/preferred (non-alpha symbols)
            if etf == 'Y' or test == 'Y':
                continue
            if idx['fin'] is not None and fin not in ('N', ''):
                continue
            # Keep only clean alphabetic symbols (allow one hyphen for share classes like BRK-B)
            clean = sym.replace('-', '')
            if not clean.isalpha() or len(sym) > 5:
                continue
            tickers.add(sym)
    return list(tickers)


def _wiki_tickers(url, col):
    html = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15, verify=False).text
    return pd.read_html(io.StringIO(html))[0][col].tolist()


MAX_TICKERS = 2500  # cap that fits comfortably inside the 90-min job timeout

def get_tickers():
    """
    Build a prioritised ticker list capped at MAX_TICKERS:
      - Core: S&P 500 + 400 + 600 from Wikipedia (~1 500, best data quality)
      - Fill: remaining slots from NASDAQ FTP directory (broader coverage)
      - Fallback: hardcoded list if both network sources fail
    """
    sp_tickers = []

    # ── 1. S&P 500 / 400 / 600 from Wikipedia (core, highest priority) ────────
    try:
        sp500 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', 'Symbol')
        sp400 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_400_companies', 'Symbol')
        sp600 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_600_companies', 'Symbol')
        sp_tickers = list({t.replace('.', '-') for t in sp500 + sp400 + sp600 if isinstance(t, str)})
        print(f"S&P 500/400/600: {len(sp_tickers)} tickers from Wikipedia")
    except Exception as e:
        print(f"Wikipedia fetch failed ({e})")

    # ── 2. Fill remaining slots from NASDAQ FTP ────────────────────────────────
    extra_tickers = []
    try:
        all_nasdaq = _nasdaq_ftp_tickers()
        sp_set = set(sp_tickers)
        extra_tickers = [t for t in all_nasdaq if t not in sp_set]
        remaining = MAX_TICKERS - len(sp_tickers)
        extra_tickers = extra_tickers[:max(0, remaining)]
        print(f"NASDAQ FTP: adding {len(extra_tickers)} extra tickers (cap {MAX_TICKERS})")
    except Exception as e:
        print(f"NASDAQ FTP fetch failed ({e})")

    combined = sp_tickers + extra_tickers
    if combined:
        print(f"Total ticker universe: {len(combined)}")
        return combined

    # ── 3. Hardcoded fallback ──────────────────────────────────────────────────
    print(f"Using hardcoded fallback list ({len(_FALLBACK_TICKERS)} tickers)")
    return _FALLBACK_TICKERS

TICKERS = get_tickers()


# ── Technical indicators ─────────────────────────────────────────────────────

def compute_returns(series):
    """Compute price returns at 1M, 3M, 6M, 1Y, 2Y, 3Y, 4Y, 5Y horizons."""
    n = len(series)
    if n < 5:
        return {}
    latest = float(series.iloc[-1])

    def pct(lookback):
        idx = max(0, n - 1 - lookback)
        if idx >= n - 1:
            return None
        past = float(series.iloc[idx])
        return round((latest / past - 1) * 100, 1) if past > 0 else None

    return {
        'return1m':  pct(21),
        'return3m':  pct(63),
        'return6m':  pct(126),
        'return1y':  pct(min(251,  n - 2)),
        'return2y':  pct(min(502,  n - 2)),
        'return3y':  pct(min(756,  n - 2)),
        'return4y':  pct(min(1008, n - 2)),
        'return5y':  pct(min(1258, n - 2)),
    }


def compute_rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float('nan'))
    return 100 - (100 / (1 + rs))


def batch_download_technicals(symbols):
    """Download 1 year of closes for all symbols. Returns dict of technicals per symbol."""
    technicals = {}
    chunk_size = 100

    for i in range(0, len(symbols), chunk_size):
        chunk = symbols[i:i + chunk_size]
        try:
            raw = yf.download(
                tickers=chunk,
                period='5y',
                auto_adjust=True,
                progress=False,
                threads=True,
            )
            # yfinance returns MultiIndex columns for multiple tickers
            if isinstance(raw.columns, pd.MultiIndex):
                closes = raw['Close']
            else:
                closes = raw[['Close']].rename(columns={'Close': chunk[0]})

            for sym in chunk:
                if sym not in closes.columns:
                    continue
                series = closes[sym].dropna()
                if len(series) < 30:
                    continue

                rsi_series   = compute_rsi(series)
                ma200_series = series.rolling(200).mean()
                ma50_series  = series.rolling(50).mean()
                log_rets     = series.pct_change().dropna()
                hv21_series  = log_rets.rolling(21).std() * (252 ** 0.5)

                rsi_val   = rsi_series.iloc[-1]
                ma200_val = ma200_series.iloc[-1]
                ma50_val  = ma50_series.iloc[-1]
                hv21_val  = hv21_series.iloc[-1]
                last_close = series.iloc[-1]
                last_date  = series.index[-1].date().isoformat()

                change1d_val = log_rets.iloc[-1] * 100 if len(log_rets) >= 1 else None

                returns = compute_returns(series)
                technicals[sym] = {
                    'rsi':   round(float(rsi_val),   1) if pd.notna(rsi_val)   else None,
                    'ma200': round(float(ma200_val), 2) if pd.notna(ma200_val) else None,
                    'ma50':  round(float(ma50_val),  2) if pd.notna(ma50_val)  else None,
                    'hv21':  round(float(hv21_val),  4) if pd.notna(hv21_val)  else None,
                    'change1d': round(float(change1d_val), 2) if change1d_val is not None and pd.notna(change1d_val) else None,
                    'fridayClose': round(float(last_close), 2),
                    'asOf': last_date,
                    **returns,
                }
        except Exception as e:
            print(f"  Batch error (chunk {i//chunk_size}): {e}")

        time.sleep(0.5)

    return technicals


# ── Fundamentals ─────────────────────────────────────────────────────────────

def fetch_annual_revenue(t):
    """Fetch last 3 years of annual total revenue from income statement."""
    try:
        stmt = t.income_stmt
        if stmt is None or stmt.empty:
            return {}
        row_key = next((k for k in stmt.index if 'Total Revenue' in k or 'Revenue' in k), None)
        if not row_key:
            return {}
        rev_row = stmt.loc[row_key]
        result = {}
        for i, col in enumerate(stmt.columns[:3]):
            val = rev_row[col]
            year = str(col.year) if hasattr(col, 'year') else str(col)[:4]
            key = f'revY{i+1}'
            result[key] = float(val) if pd.notna(val) else None
            result[f'{key}Year'] = year
        return result
    except Exception:
        return {}


def fetch_fundamental(ticker, friday_close):
    try:
        t = yf.Ticker(ticker)
        info = t.info
        market_cap = info.get('marketCap') or 0
        if market_cap < 100_000_000:
            return None

        price = friday_close or info.get('currentPrice') or info.get('regularMarketPrice')
        if not price:
            return None

        free_cash_flow = info.get('freeCashflow')
        total_revenue  = info.get('totalRevenue')
        shares         = info.get('sharesOutstanding')
        annual_rev     = fetch_annual_revenue(t)
        total_debt     = info.get('totalDebt') or 0
        total_cash     = info.get('totalCash') or 0
        ebitda         = info.get('ebitda')
        rev_growth     = info.get('revenueGrowth')   # e.g. 0.12 = 12%

        # Price to Free Cash Flow
        p_fcf = None
        if free_cash_flow and shares and shares > 0 and price:
            fcf_per_share = free_cash_flow / shares
            if fcf_per_share > 0:
                p_fcf = price / fcf_per_share

        # FCF Margin
        fcf_margin = None
        if free_cash_flow and total_revenue and total_revenue > 0:
            fcf_margin = free_cash_flow / total_revenue

        # EV / Revenue
        ev = info.get('enterpriseValue')
        ev_revenue = None
        if ev and total_revenue and total_revenue > 0:
            ev_revenue = ev / total_revenue

        # Rule of 40: revenue growth % + FCF margin %
        rule_of_40 = None
        if rev_growth is not None and fcf_margin is not None:
            rule_of_40 = round(rev_growth * 100 + fcf_margin * 100, 1)

        # Net Debt / EBITDA
        net_debt_ebitda = None
        net_debt = total_debt - total_cash
        if ebitda and ebitda > 0 and net_debt is not None:
            net_debt_ebitda = round(net_debt / ebitda, 2)

        return {
            'symbol':          ticker,
            'name':            info.get('longName') or info.get('shortName') or ticker,
            'sector':          info.get('sector') or 'Unknown',
            'industry':        info.get('industry') or '',
            'marketCap':       market_cap,
            'price':           price,
            # Valuation
            'evEbitda':        info.get('enterpriseToEbitda'),
            'peRatio':         info.get('trailingPE'),
            'forwardPE':       info.get('forwardPE'),
            'pFcf':            p_fcf,
            'psRatio':         info.get('priceToSalesTrailing12Months'),
            'pbRatio':         info.get('priceToBook'),
            'evRevenue':       ev_revenue,
            # Margins
            'grossMargin':     info.get('grossMargins'),
            'operatingMargin': info.get('operatingMargins'),
            'fcfMargin':       fcf_margin,
            # Growth
            'revenueGrowth':   rev_growth,
            'earningsGrowth':  info.get('earningsGrowth'),
            'ruleOf40':        rule_of_40,
            # Quality / Safety
            'roe':             info.get('returnOnEquity'),
            'debtEquity':      (info.get('debtToEquity') or 0) / 100 if info.get('debtToEquity') else None,
            'currentRatio':    info.get('currentRatio'),
            'netDebtEbitda':   net_debt_ebitda,
            # Income
            'dividendYield':   info.get('dividendYield'),
            # Annual Revenue (last 3 fiscal years)
            **annual_rev,
        }
    except Exception as e:
        print(f"  Fundamental error {ticker}: {e}")
        return None


# ── Value scoring ─────────────────────────────────────────────────────────────

def compute_value_score(stock, peers):
    metrics = [
        ('evEbitda',   0.25, True),
        ('pFcf',       0.20, True),
        ('peRatio',    0.20, True),
        ('psRatio',    0.15, True),
        ('pbRatio',    0.10, True),
        ('debtEquity', 0.10, True),
    ]
    total_weight = weighted = 0
    for key, weight, lower_is_better in metrics:
        value = stock.get(key)
        if not value or value <= 0:
            continue
        peer_vals = sorted([p[key] for p in peers if p.get(key) and p[key] > 0])
        if len(peer_vals) < 2:
            continue
        rank = sum(1 for v in peer_vals if v < value)
        pct = rank / (len(peer_vals) - 1)
        if lower_is_better:
            pct = 1 - pct
        weighted += pct * weight
        total_weight += weight
    if total_weight == 0:
        return None
    return round((weighted / total_weight) * 100)


# ── Options fetching ──────────────────────────────────────────────────────────

def find_best_option(stock, option_type, action):
    """
    option_type: 'call' or 'put'
    action: 'buy' or 'sell'

    For BUY CALL: strike 2-7% above price, DTE 30-60
    For BUY PUT:  strike 3-8% below price, DTE 30-60
    For SELL PUT: strike 5-12% below price, DTE 21-45
    """
    symbol = stock['symbol']
    price = stock.get('price')
    if not price or price <= 0:
        return None

    try:
        ticker = yf.Ticker(symbol)
        expirations = ticker.options
        if not expirations:
            return None

        today = date.today()
        dte_min, dte_max = (25, 65) if action == 'buy' else (21, 45)

        # Fetch earnings dates once for per-expiration check below
        earnings_dates = set()
        if option_type == 'call' and action == 'buy':
            try:
                cal = ticker.calendar
                if isinstance(cal, dict):
                    eds = cal.get('Earnings Date', [])
                    if not hasattr(eds, '__iter__') or isinstance(eds, str):
                        eds = [eds]
                    for ed in eds:
                        if hasattr(ed, 'date'):
                            ed = ed.date()
                        elif isinstance(ed, str):
                            try: ed = date.fromisoformat(ed[:10])
                            except: continue
                        earnings_dates.add(ed)
            except Exception:
                pass

        candidates = []

        for exp_str in expirations:
            exp_date = date.fromisoformat(exp_str)
            dte = (exp_date - today).days
            if dte < dte_min or dte > dte_max:
                continue

            # Skip expiration only if earnings are imminent (within 14 days)
            # — not the full DTE window, since post-earnings expirations are fine
            if option_type == 'call' and action == 'buy':
                if any(0 <= (ed - today).days <= 14 for ed in earnings_dates):
                    continue

            try:
                chain = ticker.option_chain(exp_str)
                contracts = chain.calls if option_type == 'call' else chain.puts
            except Exception:
                continue

            for _, row in contracts.iterrows():
                strike = row.get('strike', 0)
                bid    = row.get('bid', 0) or 0
                ask    = row.get('ask', 0) or 0
                oi     = row.get('openInterest', 0) or 0
                iv     = row.get('impliedVolatility', 0) or 0

                if not strike or oi < 100:
                    continue

                mid = (bid + ask) / 2 if bid and ask else bid or ask
                if mid <= 0:
                    continue

                pct_from_price = (strike - price) / price  # + means above price

                if option_type == 'call' and action == 'buy':
                    if not (0.00 <= pct_from_price <= 0.06):  # 0–6% OTM (widened from 0-4%)
                        continue
                    # IV/HV ratio: premium must not be excessively expensive vs realised vol
                    hv21 = stock.get('hv21') or 0.20
                    if hv21 > 0 and iv / hv21 > 1.8:
                        continue
                    if oi < 100:  # minimum OI — spread filter below handles real liquidity
                        continue
                    mid_price = (bid + ask) / 2 if (bid + ask) > 0 else ask
                    if mid_price > 0 and (ask - bid) / mid_price > 0.20:  # bid-ask spread < 20%
                        continue
                    # Score: prefer low IV/HV ratio + good momentum
                    tech_score = stock.get('_techScore', 50)
                    iv_hv_ratio = iv / hv21 if hv21 > 0 else 1.0
                    cost_pct = ask / price
                    score = tech_score - (cost_pct * 200) - (iv_hv_ratio * 40)

                elif option_type == 'put' and action == 'sell':
                    otm_pct = -pct_from_price  # positive = below price
                    if not (0.05 <= otm_pct <= 0.12):
                        continue
                    if bid <= 0:
                        continue
                    ann_yield = (bid / strike) * (365 / dte)
                    score = ann_yield * 100

                elif option_type == 'put' and action == 'buy':
                    otm_pct = -pct_from_price
                    if not (0.03 <= otm_pct <= 0.08):
                        continue
                    if iv > 0.55:
                        continue
                    tech_score = stock.get('_techScore', 50)
                    cost_pct = ask / price
                    score = tech_score - (cost_pct * 200) - (iv * 30)
                else:
                    continue

                entry = {
                    'symbol': symbol,
                    'name': stock['name'],
                    'sector': stock['sector'],
                    'valueScore': stock.get('valueScore'),
                    'stockPrice': round(price, 2),
                    'rsi': stock.get('rsi'),
                    'ma200': stock.get('ma200'),
                    'aboveMa200': stock.get('aboveMa200'),
                    'pctFromMa200': stock.get('pctFromMa200'),
                    'action': action.upper(),
                    'optionType': option_type.upper(),
                    'strike': strike,
                    'expiry': exp_str,
                    'dte': dte,
                    'bid': round(bid, 2),
                    'ask': round(ask, 2),
                    'mid': round(mid, 2),
                    'openInterest': int(oi),
                    'impliedVolatility': round(iv * 100, 1),
                    'pctOtm': round(abs(pct_from_price) * 100, 1),
                    'signal': stock.get('signal', ''),
                    'asOf': stock.get('asOf'),
                    '_score': score,
                }

                if option_type == 'put' and action == 'sell':
                    ann_yield = (bid / strike) * (365 / dte)
                    entry['annualizedYield'] = round(ann_yield * 100, 1)
                    entry['breakEven'] = round(strike - bid, 2)
                else:
                    entry['breakEven'] = round(
                        strike + ask if option_type == 'call' else strike - ask, 2
                    )
                    entry['maxLoss'] = round(ask * 100, 2)

                candidates.append(entry)

        if not candidates:
            return None
        best = max(candidates, key=lambda x: x['_score'])
        best.pop('_score', None)
        return best

    except Exception as e:
        print(f"  Options error {symbol}: {e}")
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    base = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
    os.makedirs(base, exist_ok=True)

    # ── Step 1: Batch download technicals ──
    print(f"Downloading price history for {len(TICKERS)} tickers...")
    technicals = batch_download_technicals(TICKERS)
    print(f"  Got technicals for {len(technicals)} tickers.")

    # ── Step 2: Fetch fundamentals ──
    # Only fetch for tickers that had price data — skips ~40% of the list immediately
    tickers_with_price = [t for t in TICKERS if t in technicals]
    tickers_no_price   = [t for t in TICKERS if t not in technicals]
    print(f"\nFetching fundamentals for {len(tickers_with_price)} tickers with price data "
          f"(skipping {len(tickers_no_price)} with no price history)")
    stocks = []
    for i, ticker in enumerate(tickers_with_price):
        friday_close = technicals.get(ticker, {}).get('fridayClose')
        # Simple retry on transient failures
        result = None
        for attempt in range(2):
            result = fetch_fundamental(ticker, friday_close)
            if result is not None:
                break
            if attempt == 0:
                time.sleep(3)
        if result:
            tech = technicals.get(ticker, {})
            result.update({
                'rsi':       tech.get('rsi'),
                'ma200':     tech.get('ma200'),
                'ma50':      tech.get('ma50'),
                'hv21':      tech.get('hv21'),
                'change1d':  tech.get('change1d'),
                'asOf':      tech.get('asOf'),
                'return1m':  tech.get('return1m'),
                'return3m':  tech.get('return3m'),
                'return6m':  tech.get('return6m'),
                'return1y':  tech.get('return1y'),
                'return2y':  tech.get('return2y'),
                'return3y':  tech.get('return3y'),
                'return4y':  tech.get('return4y'),
                'return5y':  tech.get('return5y'),
            })
            if result['price'] and result['ma200']:
                above = result['price'] >= result['ma200']
                pct = round((result['price'] - result['ma200']) / result['ma200'] * 100, 1)
                result['aboveMa200'] = above
                result['pctFromMa200'] = pct
            if result['price'] and result.get('ma50'):
                result['aboveMa50'] = result['price'] >= result['ma50']
                result['goldenCross'] = (result.get('ma50', 0) >= result.get('ma200', 0))
            stocks.append(result)
            print(f"  [{i+1}/{len(tickers_with_price)}] {ticker} ✓")
        else:
            print(f"  [{i+1}/{len(tickers_with_price)}] {ticker} skipped")

        if (i + 1) % 50 == 0:
            time.sleep(3)
        else:
            time.sleep(0.1)

    # ── Step 3: Score ──
    sectors = {}
    for s in stocks:
        sectors.setdefault(s['sector'], []).append(s)
    for stock in stocks:
        peers = sectors.get(stock['sector'], stocks)
        stock['valueScore'] = compute_value_score(stock, peers)

    as_of = technicals and next(iter(technicals.values()), {}).get('asOf', date.today().isoformat())

    # Fetch SPY benchmark returns + regime check
    print("\nFetching SPY benchmark...")
    spy_benchmark = None
    spy_above_ma50 = False
    try:
        spy_hist = yf.Ticker('SPY').history(period='5y')
        if not spy_hist.empty:
            spy_series = spy_hist['Close'].dropna()
            spy_benchmark = compute_returns(spy_series)
            spy_ma50_val = spy_series.rolling(50).mean().iloc[-1]
            spy_price_now = float(spy_series.iloc[-1])
            spy_above_ma50 = spy_price_now >= float(spy_ma50_val)
            print(f"  SPY returns — 1Y: {spy_benchmark.get('return1y')}%  "
                  f"2Y: {spy_benchmark.get('return2y')}%  "
                  f"3Y: {spy_benchmark.get('return3y')}%  "
                  f"5Y: {spy_benchmark.get('return5y')}%")
            print(f"  SPY regime: {'ABOVE' if spy_above_ma50 else 'BELOW'} 50MA — "
                  f"{'calls enabled' if spy_above_ma50 else 'calls SUPPRESSED (bear regime)'}")
    except Exception as e:
        print(f"  SPY error: {e}")

    # Save stocks.json
    with open(os.path.join(base, 'stocks.json'), 'w') as f:
        json.dump({
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'asOf': as_of,
            'count': len(stocks),
            'benchmark': {'spy': spy_benchmark},
            'stocks': stocks,
        }, f)
    print(f"\nSaved {len(stocks)} stocks.")

    # ── Step 4: Find options candidates ──
    scored = [s for s in stocks if s.get('valueScore') is not None and s.get('rsi') and s.get('ma200')]

    # CALL candidates: market regime gate + full uptrend alignment + momentum + RSI sweet spot
    call_candidates = [
        s for s in scored
        if spy_above_ma50 and              # market regime: only buy calls when SPY > 50MA
        s.get('aboveMa200') and
        s.get('aboveMa50') and
        s.get('goldenCross') and           # 50MA > 200MA
        38 <= (s.get('rsi') or 0) <= 60 and   # widened from 40-55
        (s.get('return1m') or 0) > 0           # 1M momentum (from 3M) — faster confirmation
    ]
    for s in call_candidates:
        rsi = s['rsi']
        rsi_score = 100 - abs(rsi - 49) * 2  # sweet spot ~49
        s['_techScore'] = rsi_score + (s.get('return1m') or 0) * 0.8 + (s.get('return3m') or 0) * 0.3
        s['signal'] = (f"RSI {rsi} · 1M +{s.get('return1m', 0)}% · "
                       f"+{s.get('pctFromMa200', 0)}% vs 200MA · golden cross")

    call_candidates.sort(key=lambda x: x['_techScore'], reverse=True)

    # SELL PUT candidates: high value score + above 200MA + RSI 40-65
    sell_put_candidates = [
        s for s in scored
        if s.get('aboveMa200') and
        40 <= (s.get('rsi') or 0) <= 65 and
        (s.get('valueScore') or 0) >= 60
    ]
    for s in sell_put_candidates:
        s['_techScore'] = 60
        s['signal'] = f"RSI {s['rsi']} · value score {s['valueScore']} · +{s.get('pctFromMa200', 0)}% vs 200MA"

    sell_put_candidates.sort(key=lambda x: x.get('valueScore', 0), reverse=True)

    # BUY PUT candidates: below 200MA + RSI 55-72 (overbought relative to downtrend) + low value score
    buy_put_candidates = [
        s for s in scored
        if not s.get('aboveMa200') and
        55 <= (s.get('rsi') or 0) <= 75 and
        (s.get('valueScore') or 0) <= 45
    ]
    for s in buy_put_candidates:
        rsi = s['rsi']
        s['_techScore'] = (rsi - 50) * 2 + (45 - (s.get('valueScore') or 45))
        s['signal'] = f"RSI {rsi} · below 200MA by {abs(s.get('pctFromMa200', 0))}%"

    buy_put_candidates.sort(key=lambda x: x['_techScore'], reverse=True)

    print(f"\nOptions candidates — calls: {len(call_candidates)}, sell-puts: {len(sell_put_candidates)}, buy-puts: {len(buy_put_candidates)}")

    # Fetch options for top candidates
    calls = []
    print("\nFetching CALL options...")
    for s in call_candidates[:60]:
        print(f"  {s['symbol']} (rsi={s['rsi']}, score={s['valueScore']})", end=' ')
        result = find_best_option(s, 'call', 'buy')
        if result:
            calls.append(result)
            print(f"✓ strike=${result['strike']} ask=${result['ask']} IV={result['impliedVolatility']}%")
        else:
            print("no qualifying options")
        if len(calls) >= 20:
            break
        time.sleep(0.3)

    sell_puts = []
    print("\nFetching SELL PUT options...")
    for s in sell_put_candidates[:60]:
        print(f"  {s['symbol']} (rsi={s['rsi']}, score={s['valueScore']})", end=' ')
        result = find_best_option(s, 'put', 'sell')
        if result:
            sell_puts.append(result)
            print(f"✓ strike=${result['strike']} bid=${result['bid']} yield={result.get('annualizedYield')}%")
        else:
            print("no qualifying options")
        if len(sell_puts) >= 14:
            break
        time.sleep(0.3)

    buy_puts = []
    print("\nFetching BUY PUT options...")
    for s in buy_put_candidates[:60]:
        print(f"  {s['symbol']} (rsi={s['rsi']}, score={s['valueScore']})", end=' ')
        result = find_best_option(s, 'put', 'buy')
        if result:
            buy_puts.append(result)
            print(f"✓ strike=${result['strike']} ask=${result['ask']} IV={result['impliedVolatility']}%")
        else:
            print("no qualifying options")
        if len(buy_puts) >= 6:
            break
        time.sleep(0.3)

    all_puts = sell_puts + buy_puts

    with open(os.path.join(base, 'options.json'), 'w') as f:
        json.dump({
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'asOf': as_of,
            'calls': calls,
            'puts': all_puts,
        }, f)

    print(f"\nDone. {len(calls)} calls + {len(all_puts)} puts saved.")


if __name__ == '__main__':
    main()
