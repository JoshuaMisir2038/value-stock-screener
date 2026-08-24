"""
Fetches value metrics (Finnhub) + price history/technicals (yfinance) for
US-listed stocks.

Price history comes from yfinance rather than Finnhub because Finnhub's free
tier stopped serving /stock/candle (historical OHLC) — it now 403s on every
symbol, silently, which is why this pipeline could report "success" while
stocks.json sat un-refreshed. yfinance's own default requests/urllib3 session
gets an instant 429 from Yahoo regardless of IP or volume (a TLS-fingerprint
block, not rate limiting) — routing it through curl_cffi's Chrome-impersonating
session bypasses that, which is yfinance's own documented workaround. A single
bulk yf.download() covers the whole ~1,500-ticker universe (plus SPY) in well
under a minute.

Finnhub remains the source for fundamentals (profile2 + metric), which are
unaffected by the candle restriction and still work fine on the free tier.

Free tier: 60 calls/min. With fundamentals caching (profile cached 30 days,
metrics 7 days), a cold run needs 2 Finnhub calls/stock (profile + metric) —
covering all ~1,500 tickers in ~50 min worst case, far less once cached.

Output: stocks.json (unchanged schema, adds country: 'US' field).
"""

import io
import json
import os
import time
import warnings
from datetime import datetime, timezone, date

import pandas as pd
import requests
import yfinance as yf

warnings.filterwarnings('ignore')

FINNHUB_KEY = os.environ.get('FINNHUB_API_KEY')
if not FINNHUB_KEY:
    raise SystemExit(
        "ERROR: FINNHUB_API_KEY environment variable not set. "
        "Add it as a GitHub Actions repository secret."
    )

FINNHUB_BASE = 'https://finnhub.io/api/v1'
_HTTP = requests.Session()

# ── Fundamentals cache — avoids re-fetching profile/metrics every run ─────────
_CACHE_PATH = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'fundamentals_cache.json')
PROFILE_TTL_DAYS = 30
METRICS_TTL_DAYS = 7


def _load_fundamentals_cache():
    try:
        if os.path.exists(_CACHE_PATH):
            with open(_CACHE_PATH) as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_fundamentals_cache(cache):
    try:
        with open(_CACHE_PATH, 'w') as f:
            json.dump(cache, f, separators=(',', ':'))
    except Exception as e:
        print(f"Warning: could not save fundamentals cache: {e}")


def _cache_fresh(entry, key, ttl_days):
    fetched_str = entry.get(f'{key}Fetched')
    if not fetched_str:
        return False
    try:
        fetched = datetime.fromisoformat(fetched_str.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - fetched).days < ttl_days
    except Exception:
        return False

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
]

# ── Rate limiter — 60 calls/min = 1/sec. Use 1.15s for safety margin. ────────
_LAST_CALL = [0.0]

def _rate_limited():
    delta = time.time() - _LAST_CALL[0]
    if delta < 1.15:
        time.sleep(1.15 - delta)
    _LAST_CALL[0] = time.time()


def _finnhub_get(path, params=None, retries=3, silent=False):
    """GET a Finnhub endpoint. Handles 429 with backoff. Returns dict or None."""
    q = dict(params or {})
    q['token'] = FINNHUB_KEY
    for attempt in range(retries):
        _rate_limited()
        try:
            r = _HTTP.get(f'{FINNHUB_BASE}{path}', params=q, timeout=15)
            if r.status_code == 429:
                wait = 30 * (attempt + 1)
                if not silent:
                    print(f"    429 rate limit — waiting {wait}s")
                time.sleep(wait)
                continue
            if r.status_code == 403:
                if not silent:
                    print(f"    403 forbidden on {path} — endpoint may need paid tier")
                return None
            if r.status_code >= 500:
                time.sleep(3 * (attempt + 1))
                continue
            r.raise_for_status()
            return r.json()
        except requests.exceptions.RequestException:
            if attempt == retries - 1:
                return None
            time.sleep(3 * (attempt + 1))
    return None


# ── Ticker universe ──────────────────────────────────────────────────────────

def _wiki_tickers(url, col):
    html = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=15, verify=False).text
    return pd.read_html(io.StringIO(html))[0][col].tolist()


def get_tickers():
    """
    Ordered ticker universe. S&P 500 first (highest priority), then 400, then 600.
    We DO NOT include the full NASDAQ FTP list here because at 3 calls/stock and
    60 calls/min, ~1500 S&P tickers alone take ~75 min — over the workflow deadline.
    """
    try:
        sp500 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', 'Symbol')
        sp400 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_400_companies', 'Symbol')
        sp600 = _wiki_tickers('https://en.wikipedia.org/wiki/List_of_S%26P_600_companies', 'Symbol')
    except Exception as e:
        print(f"Wikipedia fetch failed ({e}) — using fallback list")
        return _FALLBACK_TICKERS

    seen, ordered = set(), []
    for t in sp500 + sp400 + sp600:
        if not isinstance(t, str):
            continue
        clean = t.replace('.', '-')
        if clean not in seen:
            seen.add(clean)
            ordered.append(clean)

    print(f"Ticker universe: {len(ordered)} (S&P 500 first, then 400, then 600)")
    return ordered


# ── Technical indicators (pure math — no external calls) ─────────────────────

def compute_returns(series):
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


# ── yfinance-backed price history ─────────────────────────────────────────────

def fetch_price_histories(tickers, years=5):
    """
    Bulk daily-close history for every ticker in one shot via yfinance, routed
    through a Chrome-impersonating TLS session so Yahoo's fingerprint block
    doesn't 429 it (see module docstring). Returns {symbol: pd.Series of closes}.
    """
    try:
        from curl_cffi import requests as cffi_requests
        session = cffi_requests.Session(impersonate='chrome')
    except ImportError:
        print("WARNING: curl_cffi not installed — falling back to a plain "
              "session, which Yahoo is likely to 429.")
        session = None

    data = yf.download(
        tickers, period=f'{years}y', interval='1d', group_by='ticker',
        progress=False, session=session, threads=True, auto_adjust=True,
    )

    out = {}
    for sym in dict.fromkeys(tickers):
        try:
            closes = data[sym]['Close'].dropna()
        except (KeyError, TypeError):
            continue
        if len(closes) < 30:
            continue
        out[sym] = closes.astype(float)
    return out


# ── Finnhub-backed data fetch ────────────────────────────────────────────────

def fetch_profile(symbol):
    data = _finnhub_get('/stock/profile2', {'symbol': symbol}, silent=True)
    if not data or not data.get('name'):
        return None
    # Finnhub returns marketCapitalization + shareOutstanding in MILLIONS
    return {
        'name':               data.get('name') or symbol,
        'sector':             data.get('finnhubIndustry') or 'Unknown',
        'marketCap':          (data.get('marketCapitalization') or 0) * 1_000_000,
        'sharesOutstanding':  (data.get('shareOutstanding')     or 0) * 1_000_000,
    }


def _pct(v):
    """Finnhub returns percents as-is (25.3 = 25.3%). Convert to decimal for frontend."""
    return round(v / 100, 4) if v is not None else None


def fetch_metrics(symbol):
    data = _finnhub_get('/stock/metric', {'symbol': symbol, 'metric': 'all'}, silent=True)
    if not data or 'metric' not in data:
        return None
    m = data['metric']

    return {
        # Valuation
        'peRatio':          m.get('peBasicExclExtraTTM') or m.get('peTTM')       or m.get('peInclExtraTTM'),
        'forwardPE':        m.get('forwardPE')                                   or None,
        'psRatio':          m.get('psTTM')                                       or m.get('psAnnual'),
        'pbRatio':          m.get('pbAnnual')                                    or m.get('pbQuarterly'),
        'evEbitda':         m.get('currentEv/freeCashFlowTTM')                   or None,
        'pFcf':             m.get('priceToCashFlowRatioTTM')                     or None,
        'evRevenue':        m.get('enterpriseValueRevenueAnnual')                or m.get('enterpriseValueRevenueTTM'),
        # Margins (Finnhub returns percent → convert to decimal)
        'grossMargin':      _pct(m.get('grossMarginTTM')                        or m.get('grossMarginAnnual')),
        'operatingMargin':  _pct(m.get('operatingMarginTTM')                    or m.get('operatingMarginAnnual')),
        'fcfMargin':        None,   # Not directly available; leave null
        # Growth (Finnhub returns percent → convert to decimal for consistency)
        'revenueGrowth':    _pct(m.get('revenueGrowthTTMYoy')                   or m.get('revenueGrowth5Y')),
        'earningsGrowth':   _pct(m.get('epsGrowthTTMYoy')                       or m.get('epsGrowth5Y')),
        # Quality / Safety
        'roe':              _pct(m.get('roeTTM')                                or m.get('roeRfy')),
        'debtEquity':       m.get('totalDebt/totalEquityQuarterly')             or m.get('totalDebt/totalEquityAnnual'),
        'currentRatio':     m.get('currentRatioQuarterly')                      or m.get('currentRatioAnnual'),
        # Income (percent → decimal)
        'dividendYield':    _pct(m.get('dividendYieldIndicatedAnnual')          or m.get('currentDividendYieldTTM')),
    }


def fetch_stock(symbol, closes, cache=None):
    """Full per-symbol fetch. `closes` is the pre-fetched price Series (see
    fetch_price_histories). Uses cache for profile/metrics to reduce API calls.
    Returns dict with price + fundamentals + technicals, or None."""
    if closes is None or len(closes) < 30:
        return None

    entry = cache.get(symbol, {}) if cache is not None else {}

    if cache is not None and _cache_fresh(entry, 'p', PROFILE_TTL_DAYS):
        profile = entry['profile']
    else:
        profile = fetch_profile(symbol)
        if not profile:
            return None
        if cache is not None:
            entry['profile'] = profile
            entry['pFetched'] = datetime.now(timezone.utc).isoformat()
            cache[symbol] = entry

    if cache is not None and _cache_fresh(entry, 'm', METRICS_TTL_DAYS):
        metrics = entry.get('metrics') or {}
    else:
        metrics = fetch_metrics(symbol) or {}
        if cache is not None:
            entry['metrics'] = metrics
            entry['mFetched'] = datetime.now(timezone.utc).isoformat()
            cache[symbol] = entry

    # Technicals derived from candles
    rsi_series   = compute_rsi(closes)
    ma200_series = closes.rolling(200).mean()
    ma50_series  = closes.rolling(50).mean()
    log_rets     = closes.pct_change().dropna()
    hv21_series  = log_rets.rolling(21).std() * (252 ** 0.5)

    last_close = float(closes.iloc[-1])
    last_date  = closes.index[-1].date().isoformat()
    change1d   = float(log_rets.iloc[-1] * 100) if len(log_rets) >= 1 else None

    rsi_val   = rsi_series.iloc[-1]
    ma200_val = ma200_series.iloc[-1]
    ma50_val  = ma50_series.iloc[-1]
    hv21_val  = hv21_series.iloc[-1]

    returns = compute_returns(closes)

    result = {
        'symbol':      symbol,
        'name':        profile['name'],
        'sector':      profile['sector'],
        'marketCap':   profile['marketCap'],
        'price':       round(last_close, 2),
        'country':     'US',
        # Fundamentals
        **{k: v for k, v in metrics.items() if v is not None},
        # Technicals
        'rsi':         round(float(rsi_val),   1) if pd.notna(rsi_val)   else None,
        'ma200':       round(float(ma200_val), 2) if pd.notna(ma200_val) else None,
        'ma50':        round(float(ma50_val),  2) if pd.notna(ma50_val)  else None,
        'hv21':        round(float(hv21_val),  4) if pd.notna(hv21_val)  else None,
        'change1d':    round(change1d, 2) if change1d is not None else None,
        'asOf':        last_date,
        **returns,
    }

    # Derived flags
    if result.get('price') and result.get('ma200'):
        result['aboveMa200']    = result['price'] >= result['ma200']
        result['pctFromMa200']  = round((result['price'] - result['ma200']) / result['ma200'] * 100, 1)
    if result.get('price') and result.get('ma50'):
        result['aboveMa50']  = result['price'] >= result['ma50']
        result['goldenCross'] = ((result.get('ma50') or 0) >= (result.get('ma200') or 0))

    # Rule of 40
    if result.get('revenueGrowth') is not None and result.get('fcfMargin') is not None:
        result['ruleOf40'] = round(result['revenueGrowth'] * 100 + result['fcfMargin'] * 100, 1)

    return result


# ── Value scoring ────────────────────────────────────────────────────────────

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


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    import threading

    base = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
    os.makedirs(base, exist_ok=True)

    DEADLINE_MINUTES = 38
    _deadline_hit = threading.Event()

    def _on_deadline():
        print(f"\n⚠️  {DEADLINE_MINUTES}-minute deadline reached — will save partial results.")
        _deadline_hit.set()

    _timer = threading.Timer(DEADLINE_MINUTES * 60, _on_deadline)
    _timer.daemon = True
    _timer.start()

    tickers = get_tickers()

    _limit = int(os.environ.get('TICKER_LIMIT', '0') or '0')
    if _limit:
        print(f"TICKER_LIMIT set — capping universe to top {_limit} tickers for this run.")
        tickers = tickers[:_limit]

    # ── Load fundamentals cache ──────────────────────────────────────────────
    cache = _load_fundamentals_cache()
    cached_count = sum(1 for v in cache.values() if v.get('pFetched'))
    print(f"Fundamentals cache: {cached_count} / {len(tickers)} tickers pre-cached "
          f"(profile≤{PROFILE_TTL_DAYS}d, metrics≤{METRICS_TTL_DAYS}d)")

    # ── Pre-flight: confirm Finnhub is reachable ─────────────────────────────
    print("Pre-flight: testing Finnhub API…")
    test = _finnhub_get('/quote', {'symbol': 'AAPL'})
    if not test or test.get('c') is None:
        print("ERROR: Finnhub /quote failed on pre-flight. Keeping existing stocks.json.")
        _timer.cancel()
        return
    print(f"  Pre-flight OK — AAPL current price ${test.get('c')}")

    # ── Bulk price history (yfinance, one shot for the whole universe) ───────
    print("\nFetching price history for all tickers (+ SPY) via yfinance…")
    t0 = time.time()
    price_histories = fetch_price_histories(tickers + ['SPY'])
    print(f"  Got price history for {len(price_histories)}/{len(tickers)} tickers "
          f"in {time.time() - t0:.0f}s")
    if len(price_histories) < 100:
        print("ERROR: yfinance returned price history for almost nothing — "
              "likely blocked again. Keeping existing stocks.json.")
        _timer.cancel()
        return

    # ── Fetch each ticker ────────────────────────────────────────────────────
    stocks = []
    for i, sym in enumerate(tickers):
        if _deadline_hit.is_set():
            print(f"\n  Deadline hit after {i} stocks — saving partial results.")
            break
        try:
            s = fetch_stock(sym, price_histories.get(sym), cache=cache)
        except Exception as e:
            print(f"  [{i+1}/{len(tickers)}] {sym} error: {e}")
            continue
        if s:
            stocks.append(s)
            if (i + 1) % 25 == 0:
                print(f"  [{i+1}/{len(tickers)}] {sym} ✓ (total ok: {len(stocks)})")
        else:
            if (i + 1) % 50 == 0:
                print(f"  [{i+1}/{len(tickers)}] {sym} skipped")

    # Save cache immediately after fetch loop so partial results are preserved
    _save_fundamentals_cache(cache)
    print(f"Saved fundamentals cache: {len(cache)} entries.")

    print(f"\nFetched {len(stocks)} stocks total.")

    # ── Compute value scores by sector ───────────────────────────────────────
    sectors = {}
    for s in stocks:
        sectors.setdefault(s['sector'], []).append(s)
    for stock in stocks:
        peers = sectors.get(stock['sector'], stocks)
        stock['valueScore'] = compute_value_score(stock, peers)

    # ── SPY benchmark returns (from the same bulk price fetch) ───────────────
    spy_benchmark = None
    spy_closes = price_histories.get('SPY')
    if spy_closes is not None:
        spy_benchmark = compute_returns(spy_closes)
        print(f"  SPY 1Y {spy_benchmark.get('return1y')}%  "
              f"3Y {spy_benchmark.get('return3y')}%  "
              f"5Y {spy_benchmark.get('return5y')}%")

    as_of = stocks[0].get('asOf', date.today().isoformat()) if stocks else date.today().isoformat()

    # ── Save stocks.json (strip nulls, trim floats) ──────────────────────────
    def clean(s):
        out = {}
        for k, v in s.items():
            if v is None:
                continue
            if isinstance(v, float):
                out[k] = round(v, 2)
            else:
                out[k] = v
        return out

    clean_stocks = [clean(s) for s in stocks]
    stocks_path = os.path.join(base, 'stocks.json')

    if len(clean_stocks) < 100:
        print(f"\nWARNING: only {len(clean_stocks)} stocks — keeping existing stocks.json to avoid serving empty data.")
    else:
        with open(stocks_path, 'w') as f:
            json.dump({
                'lastUpdated': datetime.now(timezone.utc).isoformat(),
                'asOf':        as_of,
                'count':       len(clean_stocks),
                'benchmark':   {'spy': spy_benchmark},
                'stocks':      clean_stocks,
            }, f, separators=(',', ':'))
        print(f"\nSaved {len(clean_stocks)} stocks to {stocks_path}.")

    _timer.cancel()


if __name__ == '__main__':
    main()
