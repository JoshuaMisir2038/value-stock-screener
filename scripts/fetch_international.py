"""
Fetches price + fundamental data for major international index stocks via yfinance.
Appends to the existing public/data/stocks.json (written by fetch_data.py).

Covers: FTSE 100 (UK), DAX 40 (Germany), CAC 40 (France), Nikkei 225 top-50 (Japan),
Hang Seng top-40 (Hong Kong), ASX 200 top-40 (Australia), TSX 60 (Canada),
BSE Sensex (India).

Fundamentals are cached in public/data/intl_cache.json (profile 30d, metrics 7d)
to stay within the workflow time budget after the first full run.

Value scores are recomputed globally (US + international) after merging.
"""

import json
import os
import time
import warnings
from datetime import datetime, timezone, date

import pandas as pd
import yfinance as yf

warnings.filterwarnings('ignore')

STOCKS_JSON   = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'stocks.json')
INTL_CACHE    = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'intl_cache.json')
PROFILE_TTL   = 30   # days
METRICS_TTL   = 7    # days
INFO_BUDGET_S = 600  # max seconds to spend fetching .info (10 min)
BATCH_SIZE    = 50   # tickers per yf.download batch
DELAY_S       = 1.5  # seconds between .info calls

# ── International ticker universe ─────────────────────────────────────────────
# (yf_symbol, country_code, exchange_label)

FTSE100 = [
    ('AZN.L',   'GB', 'LSE'), ('SHEL.L',  'GB', 'LSE'), ('HSBA.L',  'GB', 'LSE'),
    ('ULVR.L',  'GB', 'LSE'), ('BP.L',    'GB', 'LSE'), ('BATS.L',  'GB', 'LSE'),
    ('RIO.L',   'GB', 'LSE'), ('GLEN.L',  'GB', 'LSE'), ('REL.L',   'GB', 'LSE'),
    ('DGE.L',   'GB', 'LSE'), ('GSK.L',   'GB', 'LSE'), ('LSEG.L',  'GB', 'LSE'),
    ('NG.L',    'GB', 'LSE'), ('BARC.L',  'GB', 'LSE'), ('LLOY.L',  'GB', 'LSE'),
    ('NWG.L',   'GB', 'LSE'), ('PRU.L',   'GB', 'LSE'), ('IMB.L',   'GB', 'LSE'),
    ('LGEN.L',  'GB', 'LSE'), ('BRBY.L',  'GB', 'LSE'), ('BAE.L',   'GB', 'LSE'),
    ('VOD.L',   'GB', 'LSE'), ('MKS.L',   'GB', 'LSE'), ('WPP.L',   'GB', 'LSE'),
    ('HLMA.L',  'GB', 'LSE'), ('AV.L',    'GB', 'LSE'), ('HLN.L',   'GB', 'LSE'),
    ('FLTR.L',  'GB', 'LSE'), ('SSE.L',   'GB', 'LSE'), ('STAN.L',  'GB', 'LSE'),
    ('IHG.L',   'GB', 'LSE'), ('IAG.L',   'GB', 'LSE'), ('EXPN.L',  'GB', 'LSE'),
    ('SGE.L',   'GB', 'LSE'), ('SN.L',    'GB', 'LSE'), ('CRH.L',   'GB', 'LSE'),
    ('ANTO.L',  'GB', 'LSE'), ('ABF.L',   'GB', 'LSE'), ('JD.L',    'GB', 'LSE'),
    ('CPG.L',   'GB', 'LSE'), ('DPLM.L',  'GB', 'LSE'), ('FRES.L',  'GB', 'LSE'),
    ('RKT.L',   'GB', 'LSE'), ('AUTO.L',  'GB', 'LSE'), ('LAND.L',  'GB', 'LSE'),
    ('BT-A.L',  'GB', 'LSE'), ('MNDI.L',  'GB', 'LSE'), ('SMT.L',   'GB', 'LSE'),
    ('INF.L',   'GB', 'LSE'), ('AAL.L',   'GB', 'LSE'),
]

DAX40 = [
    ('SAP.DE',  'DE', 'XETRA'), ('SIE.DE',  'DE', 'XETRA'), ('BMW.DE',  'DE', 'XETRA'),
    ('DTE.DE',  'DE', 'XETRA'), ('BAYN.DE', 'DE', 'XETRA'), ('MUV2.DE', 'DE', 'XETRA'),
    ('MBG.DE',  'DE', 'XETRA'), ('ALV.DE',  'DE', 'XETRA'), ('EOAN.DE', 'DE', 'XETRA'),
    ('BAS.DE',  'DE', 'XETRA'), ('RWE.DE',  'DE', 'XETRA'), ('ADS.DE',  'DE', 'XETRA'),
    ('DBK.DE',  'DE', 'XETRA'), ('DHL.DE',  'DE', 'XETRA'), ('HEI.DE',  'DE', 'XETRA'),
    ('BEI.DE',  'DE', 'XETRA'), ('FRE.DE',  'DE', 'XETRA'), ('FME.DE',  'DE', 'XETRA'),
    ('HEN3.DE', 'DE', 'XETRA'), ('IFX.DE',  'DE', 'XETRA'), ('LIN.DE',  'DE', 'XETRA'),
    ('MRK.DE',  'DE', 'XETRA'), ('MTX.DE',  'DE', 'XETRA'), ('P911.DE', 'DE', 'XETRA'),
    ('PAH3.DE', 'DE', 'XETRA'), ('QIA.DE',  'DE', 'XETRA'), ('RHM.DE',  'DE', 'XETRA'),
    ('SHL.DE',  'DE', 'XETRA'), ('SY1.DE',  'DE', 'XETRA'), ('TKA.DE',  'DE', 'XETRA'),
    ('VNA.DE',  'DE', 'XETRA'), ('VOW3.DE', 'DE', 'XETRA'), ('ZAL.DE',  'DE', 'XETRA'),
    ('CON.DE',  'DE', 'XETRA'), ('CBK.DE',  'DE', 'XETRA'), ('ENR.DE',  'DE', 'XETRA'),
    ('BNR.DE',  'DE', 'XETRA'), ('1COV.DE', 'DE', 'XETRA'), ('PUM.DE',  'DE', 'XETRA'),
    ('SRT3.DE', 'DE', 'XETRA'),
]

CAC40 = [
    ('MC.PA',   'FR', 'EPA'), ('TTE.PA',  'FR', 'EPA'), ('SAN.PA',  'FR', 'EPA'),
    ('OR.PA',   'FR', 'EPA'), ('AIR.PA',  'FR', 'EPA'), ('BNP.PA',  'FR', 'EPA'),
    ('RI.PA',   'FR', 'EPA'), ('EL.PA',   'FR', 'EPA'), ('SGO.PA',  'FR', 'EPA'),
    ('STM.PA',  'FR', 'EPA'), ('ACA.PA',  'FR', 'EPA'), ('RMS.PA',  'FR', 'EPA'),
    ('AI.PA',   'FR', 'EPA'), ('DG.PA',   'FR', 'EPA'), ('KER.PA',  'FR', 'EPA'),
    ('VIE.PA',  'FR', 'EPA'), ('ENGI.PA', 'FR', 'EPA'), ('SU.PA',   'FR', 'EPA'),
    ('ORA.PA',  'FR', 'EPA'), ('CS.PA',   'FR', 'EPA'), ('DSY.PA',  'FR', 'EPA'),
    ('CAP.PA',  'FR', 'EPA'), ('GLE.PA',  'FR', 'EPA'), ('LR.PA',   'FR', 'EPA'),
    ('ML.PA',   'FR', 'EPA'), ('PUB.PA',  'FR', 'EPA'), ('RNO.PA',  'FR', 'EPA'),
    ('SAF.PA',  'FR', 'EPA'), ('STLA.PA', 'FR', 'EPA'), ('WLN.PA',  'FR', 'EPA'),
    ('HO.PA',   'FR', 'EPA'), ('MT.AS',   'NL', 'AMS'), ('URW.AS',  'NL', 'AMS'),
    ('SOLB.BR', 'BE', 'EBR'), ('ERF.PA',  'FR', 'EPA'), ('VK.PA',   'FR', 'EPA'),
    ('TEP.PA',  'FR', 'EPA'), ('RCO.PA',  'FR', 'EPA'), ('STMN.SW', 'CH', 'SWX'),
    ('LONN.SW', 'CH', 'SWX'),
]

NIKKEI_TOP = [
    ('7203.T', 'JP', 'TSE'), ('6758.T', 'JP', 'TSE'), ('9984.T', 'JP', 'TSE'),
    ('8306.T', 'JP', 'TSE'), ('6861.T', 'JP', 'TSE'), ('6954.T', 'JP', 'TSE'),
    ('9432.T', 'JP', 'TSE'), ('8316.T', 'JP', 'TSE'), ('7741.T', 'JP', 'TSE'),
    ('6367.T', 'JP', 'TSE'), ('7267.T', 'JP', 'TSE'), ('8766.T', 'JP', 'TSE'),
    ('9433.T', 'JP', 'TSE'), ('4063.T', 'JP', 'TSE'), ('6501.T', 'JP', 'TSE'),
    ('8035.T', 'JP', 'TSE'), ('7751.T', 'JP', 'TSE'), ('4502.T', 'JP', 'TSE'),
    ('9022.T', 'JP', 'TSE'), ('6098.T', 'JP', 'TSE'), ('4568.T', 'JP', 'TSE'),
    ('4523.T', 'JP', 'TSE'), ('2802.T', 'JP', 'TSE'), ('9020.T', 'JP', 'TSE'),
    ('3382.T', 'JP', 'TSE'), ('6594.T', 'JP', 'TSE'), ('4901.T', 'JP', 'TSE'),
    ('7974.T', 'JP', 'TSE'), ('9613.T', 'JP', 'TSE'), ('8801.T', 'JP', 'TSE'),
    ('6702.T', 'JP', 'TSE'), ('5108.T', 'JP', 'TSE'), ('7270.T', 'JP', 'TSE'),
    ('8031.T', 'JP', 'TSE'), ('8002.T', 'JP', 'TSE'), ('4543.T', 'JP', 'TSE'),
    ('6762.T', 'JP', 'TSE'), ('5401.T', 'JP', 'TSE'), ('4661.T', 'JP', 'TSE'),
    ('8001.T', 'JP', 'TSE'), ('6503.T', 'JP', 'TSE'), ('9735.T', 'JP', 'TSE'),
    ('4755.T', 'JP', 'TSE'), ('9766.T', 'JP', 'TSE'), ('7733.T', 'JP', 'TSE'),
    ('8802.T', 'JP', 'TSE'), ('2413.T', 'JP', 'TSE'), ('4704.T', 'JP', 'TSE'),
    ('1925.T', 'JP', 'TSE'), ('4519.T', 'JP', 'TSE'),
]

HANG_SENG = [
    ('0700.HK', 'HK', 'HKEX'), ('0939.HK', 'HK', 'HKEX'), ('1299.HK', 'HK', 'HKEX'),
    ('0005.HK', 'HK', 'HKEX'), ('3690.HK', 'HK', 'HKEX'), ('9988.HK', 'HK', 'HKEX'),
    ('1398.HK', 'HK', 'HKEX'), ('0388.HK', 'HK', 'HKEX'), ('2318.HK', 'HK', 'HKEX'),
    ('0941.HK', 'HK', 'HKEX'), ('1810.HK', 'HK', 'HKEX'), ('0883.HK', 'HK', 'HKEX'),
    ('2382.HK', 'HK', 'HKEX'), ('0016.HK', 'HK', 'HKEX'), ('1211.HK', 'HK', 'HKEX'),
    ('2628.HK', 'HK', 'HKEX'), ('0003.HK', 'HK', 'HKEX'), ('0011.HK', 'HK', 'HKEX'),
    ('0688.HK', 'HK', 'HKEX'), ('0823.HK', 'HK', 'HKEX'), ('1038.HK', 'HK', 'HKEX'),
    ('0066.HK', 'HK', 'HKEX'), ('0002.HK', 'HK', 'HKEX'), ('0027.HK', 'HK', 'HKEX'),
    ('0175.HK', 'HK', 'HKEX'), ('9618.HK', 'HK', 'HKEX'), ('0762.HK', 'HK', 'HKEX'),
    ('1109.HK', 'HK', 'HKEX'), ('0960.HK', 'HK', 'HKEX'), ('2020.HK', 'HK', 'HKEX'),
    ('9999.HK', 'HK', 'HKEX'), ('3988.HK', 'HK', 'HKEX'), ('0001.HK', 'HK', 'HKEX'),
    ('0006.HK', 'HK', 'HKEX'), ('0012.HK', 'HK', 'HKEX'), ('0267.HK', 'HK', 'HKEX'),
    ('0019.HK', 'HK', 'HKEX'), ('0101.HK', 'HK', 'HKEX'), ('1177.HK', 'HK', 'HKEX'),
    ('6098.HK', 'HK', 'HKEX'),
]

ASX_TOP = [
    ('CBA.AX', 'AU', 'ASX'), ('BHP.AX', 'AU', 'ASX'), ('CSL.AX',  'AU', 'ASX'),
    ('NAB.AX', 'AU', 'ASX'), ('WBC.AX', 'AU', 'ASX'), ('ANZ.AX',  'AU', 'ASX'),
    ('WES.AX', 'AU', 'ASX'), ('MQG.AX', 'AU', 'ASX'), ('WOW.AX',  'AU', 'ASX'),
    ('FMG.AX', 'AU', 'ASX'), ('RIO.AX', 'AU', 'ASX'), ('TLS.AX',  'AU', 'ASX'),
    ('RMD.AX', 'AU', 'ASX'), ('ALL.AX', 'AU', 'ASX'), ('GMG.AX',  'AU', 'ASX'),
    ('XRO.AX', 'AU', 'ASX'), ('STO.AX', 'AU', 'ASX'), ('SHL.AX',  'AU', 'ASX'),
    ('QBE.AX', 'AU', 'ASX'), ('AZJ.AX', 'AU', 'ASX'), ('COL.AX',  'AU', 'ASX'),
    ('IAG.AX', 'AU', 'ASX'), ('REA.AX', 'AU', 'ASX'), ('SUN.AX',  'AU', 'ASX'),
    ('TCL.AX', 'AU', 'ASX'), ('NST.AX', 'AU', 'ASX'), ('ORI.AX',  'AU', 'ASX'),
    ('BXB.AX', 'AU', 'ASX'), ('APA.AX', 'AU', 'ASX'), ('CPU.AX',  'AU', 'ASX'),
    ('IEL.AX', 'AU', 'ASX'), ('IGO.AX', 'AU', 'ASX'), ('MIN.AX',  'AU', 'ASX'),
    ('NXT.AX', 'AU', 'ASX'), ('ORG.AX', 'AU', 'ASX'), ('SGP.AX',  'AU', 'ASX'),
    ('SEK.AX', 'AU', 'ASX'), ('ASX.AX', 'AU', 'ASX'), ('NEM.AX',  'AU', 'ASX'),
    ('WDS.AX', 'AU', 'ASX'),
]

TSX60 = [
    ('RY.TO',    'CA', 'TSX'), ('TD.TO',    'CA', 'TSX'), ('ENB.TO',   'CA', 'TSX'),
    ('CNR.TO',   'CA', 'TSX'), ('CP.TO',    'CA', 'TSX'), ('BMO.TO',   'CA', 'TSX'),
    ('BNS.TO',   'CA', 'TSX'), ('BCE.TO',   'CA', 'TSX'), ('TRI.TO',   'CA', 'TSX'),
    ('SU.TO',    'CA', 'TSX'), ('MFC.TO',   'CA', 'TSX'), ('ABX.TO',   'CA', 'TSX'),
    ('CNQ.TO',   'CA', 'TSX'), ('CM.TO',    'CA', 'TSX'), ('NTR.TO',   'CA', 'TSX'),
    ('DOL.TO',   'CA', 'TSX'), ('ATD.TO',   'CA', 'TSX'), ('TRP.TO',   'CA', 'TSX'),
    ('SLF.TO',   'CA', 'TSX'), ('FFH.TO',   'CA', 'TSX'), ('BAM.TO',   'CA', 'TSX'),
    ('T.TO',     'CA', 'TSX'), ('QSR.TO',   'CA', 'TSX'), ('MRU.TO',   'CA', 'TSX'),
    ('GIB-A.TO', 'CA', 'TSX'), ('POW.TO',   'CA', 'TSX'), ('FTS.TO',   'CA', 'TSX'),
    ('L.TO',     'CA', 'TSX'), ('AEM.TO',   'CA', 'TSX'), ('IFC.TO',   'CA', 'TSX'),
    ('EMA.TO',   'CA', 'TSX'), ('WPM.TO',   'CA', 'TSX'), ('SAP.TO',   'CA', 'TSX'),
    ('H.TO',     'CA', 'TSX'), ('WN.TO',    'CA', 'TSX'), ('RCI-B.TO', 'CA', 'TSX'),
    ('CCA.TO',   'CA', 'TSX'), ('IAG.TO',   'CA', 'TSX'), ('CCL-B.TO', 'CA', 'TSX'),
    ('FSV.TO',   'CA', 'TSX'),
]

BSE_SENSEX = [
    ('RELIANCE.NS',   'IN', 'NSE'), ('TCS.NS',        'IN', 'NSE'),
    ('HDFCBANK.NS',   'IN', 'NSE'), ('INFY.NS',        'IN', 'NSE'),
    ('HINDUNILVR.NS', 'IN', 'NSE'), ('ICICIBANK.NS',   'IN', 'NSE'),
    ('BHARTIARTL.NS', 'IN', 'NSE'), ('KOTAKBANK.NS',   'IN', 'NSE'),
    ('SBIN.NS',       'IN', 'NSE'), ('AXISBANK.NS',    'IN', 'NSE'),
    ('LT.NS',         'IN', 'NSE'), ('MARUTI.NS',      'IN', 'NSE'),
    ('BAJFINANCE.NS', 'IN', 'NSE'), ('HCLTECH.NS',     'IN', 'NSE'),
    ('ASIANPAINT.NS', 'IN', 'NSE'), ('TITAN.NS',       'IN', 'NSE'),
    ('ULTRACEMCO.NS', 'IN', 'NSE'), ('BAJAJFINSV.NS',  'IN', 'NSE'),
    ('ITC.NS',        'IN', 'NSE'), ('NESTLEIND.NS',   'IN', 'NSE'),
    ('SUNPHARMA.NS',  'IN', 'NSE'), ('WIPRO.NS',       'IN', 'NSE'),
    ('ONGC.NS',       'IN', 'NSE'), ('POWERGRID.NS',   'IN', 'NSE'),
    ('NTPC.NS',       'IN', 'NSE'), ('JSWSTEEL.NS',    'IN', 'NSE'),
    ('TATAMOTORS.NS', 'IN', 'NSE'), ('TATACONSUM.NS',  'IN', 'NSE'),
    ('INDUSINDBK.NS', 'IN', 'NSE'), ('M&M.NS',         'IN', 'NSE'),
]

# Combine all international tickers
INTL_TICKERS = FTSE100 + DAX40 + CAC40 + NIKKEI_TOP + HANG_SENG + ASX_TOP + TSX60 + BSE_SENSEX

# Deduplicate while preserving order
_seen = set()
INTL_TICKERS = [(sym, cc, ex) for sym, cc, ex in INTL_TICKERS if not (sym in _seen or _seen.add(sym))]


# ── Cache helpers ────────────────────────────────────────────────────────────

def _load_cache():
    try:
        if os.path.exists(INTL_CACHE):
            with open(INTL_CACHE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}


def _save_cache(cache):
    try:
        with open(INTL_CACHE, 'w') as f:
            json.dump(cache, f, separators=(',', ':'))
    except Exception as e:
        print(f"Warning: could not save intl cache: {e}")


def _cache_fresh(entry, key, ttl_days):
    fetched_str = entry.get(f'{key}Fetched')
    if not fetched_str:
        return False
    try:
        fetched = datetime.fromisoformat(fetched_str.replace('Z', '+00:00'))
        return (datetime.now(timezone.utc) - fetched).days < ttl_days
    except Exception:
        return False


# ── Forex rates ───────────────────────────────────────────────────────────────

def fetch_fx_rates():
    """Returns dict: currency_code -> USD per 1 unit of that currency."""
    pairs = {
        'GBP': 'GBPUSD=X',
        'EUR': 'EURUSD=X',
        'JPY': 'JPYUSD=X',
        'HKD': 'HKDUSD=X',
        'AUD': 'AUDUSD=X',
        'CAD': 'CADUSD=X',
        'INR': 'INRUSD=X',
        'CHF': 'CHFUSD=X',
    }
    fx = {'USD': 1.0}
    for currency, ticker in pairs.items():
        try:
            hist = yf.Ticker(ticker).history(period='2d')
            if not hist.empty:
                fx[currency] = float(hist['Close'].iloc[-1])
                print(f"  FX: 1 {currency} = ${fx[currency]:.4f} USD")
        except Exception as e:
            print(f"  FX fetch failed for {currency}: {e}")
    # GBp (pence) = GBP / 100
    if 'GBP' in fx:
        fx['GBp'] = fx['GBP'] / 100
    return fx


def to_usd(value, currency, fx):
    """Convert a value in local currency to USD."""
    if value is None:
        return None
    rate = fx.get(currency, fx.get(currency.upper()))
    if rate is None:
        return None
    return value * rate


# ── Technical indicators (reused from fetch_data.py logic) ───────────────────

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
        'return3y':  pct(min(756,  n - 2)),
        'return5y':  pct(min(1258, n - 2)),
    }


def compute_rsi(series, period=14):
    delta = series.diff()
    gain  = delta.where(delta > 0, 0.0)
    loss  = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float('nan'))
    return 100 - (100 / (1 + rs))


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
        pct  = rank / (len(peer_vals) - 1)
        if lower_is_better:
            pct = 1 - pct
        weighted     += pct * weight
        total_weight += weight
    if total_weight == 0:
        return None
    return round((weighted / total_weight) * 100)


# ── Price history batch download ──────────────────────────────────────────────

def batch_download_prices(symbols):
    """Returns dict: symbol -> pd.Series of daily close prices (USD-denominated)."""
    price_data = {}
    batches = [symbols[i:i + BATCH_SIZE] for i in range(0, len(symbols), BATCH_SIZE)]
    for idx, batch in enumerate(batches):
        print(f"  Batch price download {idx+1}/{len(batches)}: {len(batch)} tickers…")
        try:
            df = yf.download(
                batch,
                period='5y',
                group_by='ticker',
                auto_adjust=True,
                progress=False,
                threads=True,
            )
            if df.empty:
                continue
            # Single ticker: df has simple column index
            if len(batch) == 1:
                sym = batch[0]
                if 'Close' in df.columns:
                    s = df['Close'].dropna()
                    if len(s) >= 30:
                        price_data[sym] = s
            else:
                for sym in batch:
                    try:
                        s = df[sym]['Close'].dropna()
                        if len(s) >= 30:
                            price_data[sym] = s
                    except (KeyError, TypeError):
                        pass
        except Exception as e:
            print(f"    Batch download error: {e}")
        time.sleep(2)
    return price_data


# ── Per-stock fundamental fetch via yfinance ──────────────────────────────────

def fetch_info(symbol):
    """Fetch yfinance .info dict. Returns {} on failure."""
    try:
        info = yf.Ticker(symbol).info
        # Validate: if we get a stub dict (no name), treat as failure
        if not info or not (info.get('longName') or info.get('shortName')):
            return {}
        return info
    except Exception:
        return {}


def build_stock(symbol, country, exchange, closes, info, fx):
    """Build a stock dict from price series + yfinance info."""
    currency = info.get('currency', 'USD')
    fx_rate  = fx.get(currency, fx.get(currency.upper(), 1.0))
    # For GBp (pence), price is in pence; marketCap is in GBP
    price_rate = fx.get(currency, fx.get(currency.upper(), 1.0))

    last_close = float(closes.iloc[-1])
    price_usd  = last_close * price_rate
    last_date  = closes.index[-1].date().isoformat() if hasattr(closes.index[-1], 'date') else str(closes.index[-1])[:10]

    # Compute returns from local-currency price series (ratios are currency-neutral)
    log_rets     = closes.pct_change().dropna()
    rsi_series   = compute_rsi(closes)
    ma200_series = closes.rolling(200).mean()
    ma50_series  = closes.rolling(50).mean()
    hv21_series  = log_rets.rolling(21).std() * (252 ** 0.5)
    change1d     = float(log_rets.iloc[-1] * 100) if len(log_rets) >= 1 else None
    returns      = compute_returns(closes)

    rsi_val   = rsi_series.iloc[-1]
    ma200_val = ma200_series.iloc[-1]
    ma50_val  = ma50_series.iloc[-1]
    hv21_val  = hv21_series.iloc[-1]

    # MA values are in local currency — convert to USD for price-relative comparisons
    ma200_usd = float(ma200_val) * price_rate if pd.notna(ma200_val) else None
    ma50_usd  = float(ma50_val)  * price_rate if pd.notna(ma50_val)  else None

    market_cap_local = info.get('marketCap')
    # marketCap from yfinance for GBp-traded stocks is already in GBP (not pence)
    cap_rate = fx.get('GBP', 1.0) if currency == 'GBp' else fx_rate
    market_cap_usd = market_cap_local * cap_rate if market_cap_local else None

    name   = info.get('longName') or info.get('shortName') or symbol
    sector = info.get('sector') or info.get('finnhubIndustry') or 'Unknown'

    # Normalise D/E: yfinance returns it as percentage (150 = 1.5x), Finnhub as ratio (1.5)
    debt_equity_raw = info.get('debtToEquity')
    debt_equity = round(debt_equity_raw / 100, 4) if debt_equity_raw is not None else None

    result = {
        'symbol':    symbol,
        'name':      name,
        'sector':    sector,
        'country':   country,
        'exchange':  exchange,
        'currency':  currency,
        'marketCap': round(market_cap_usd) if market_cap_usd else None,
        'price':     round(price_usd, 2),
        # Valuation
        'peRatio':         _safe(info.get('trailingPE')),
        'forwardPE':       _safe(info.get('forwardPE')),
        'pbRatio':         _safe(info.get('priceToBook')),
        'psRatio':         _safe(info.get('priceToSalesTrailing12Months')),
        'evEbitda':        _safe(info.get('enterpriseToEbitda')),
        'evRevenue':       _safe(info.get('enterpriseToRevenue')),
        # Margins (yfinance already decimal)
        'grossMargin':     _safe(info.get('grossMargins')),
        'operatingMargin': _safe(info.get('operatingMargins')),
        # Growth (yfinance already decimal)
        'revenueGrowth':   _safe(info.get('revenueGrowth')),
        'earningsGrowth':  _safe(info.get('earningsGrowth')),
        # Quality
        'roe':         _safe(info.get('returnOnEquity')),
        'debtEquity':  debt_equity,
        'currentRatio': _safe(info.get('currentRatio')),
        # Income
        'dividendYield': _safe(info.get('dividendYield')),
        # Technicals
        'rsi':    round(float(rsi_val), 1)   if pd.notna(rsi_val)   else None,
        'ma200':  round(ma200_usd, 2)         if ma200_usd is not None else None,
        'ma50':   round(ma50_usd, 2)          if ma50_usd is not None  else None,
        'hv21':   round(float(hv21_val), 4)  if pd.notna(hv21_val)  else None,
        'change1d': round(change1d, 2) if change1d is not None else None,
        'asOf':   last_date,
        **returns,
    }

    if result.get('price') and result.get('ma200'):
        result['aboveMa200']   = result['price'] >= result['ma200']
        result['pctFromMa200'] = round((result['price'] - result['ma200']) / result['ma200'] * 100, 1)
    if result.get('price') and result.get('ma50'):
        result['aboveMa50']   = result['price'] >= result['ma50']
        result['goldenCross'] = (result.get('ma50', 0) >= result.get('ma200', 0))

    return result


def _safe(v):
    """Return numeric value or None if invalid."""
    if v is None:
        return None
    try:
        f = float(v)
        if f != f:  # NaN
            return None
        return f
    except (TypeError, ValueError):
        return None


def _clean(s):
    out = {}
    for k, v in s.items():
        if v is None:
            continue
        if isinstance(v, float):
            out[k] = round(v, 4)
        else:
            out[k] = v
    return out


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    # Guard: only run if stocks.json already has data
    if not os.path.exists(STOCKS_JSON):
        print("stocks.json not found — skipping international fetch.")
        return

    with open(STOCKS_JSON) as f:
        existing_data = json.load(f)

    us_stocks = existing_data.get('stocks', [])
    if len(us_stocks) < 50:
        print(f"stocks.json has only {len(us_stocks)} entries — skipping international fetch.")
        return

    print(f"Loaded {len(us_stocks)} US stocks from stocks.json.")
    print(f"International universe: {len(INTL_TICKERS)} tickers across 8 markets.\n")

    cache = _load_cache()
    cached_count = sum(1 for v in cache.values() if v.get('pFetched'))
    print(f"International cache: {cached_count} / {len(INTL_TICKERS)} tickers pre-cached.\n")

    # ── Fetch forex rates ────────────────────────────────────────────────────
    print("Fetching forex rates…")
    fx = fetch_fx_rates()
    print()

    # ── Batch download price histories ───────────────────────────────────────
    all_symbols = [t[0] for t in INTL_TICKERS]
    print(f"Batch downloading price histories for {len(all_symbols)} international tickers…")
    price_data = batch_download_prices(all_symbols)
    print(f"  Got price data for {len(price_data)} / {len(all_symbols)} tickers.\n")

    # ── Fetch fundamentals (info) within time budget ─────────────────────────
    info_start = time.time()
    intl_stocks = []

    for sym, country, exchange in INTL_TICKERS:
        closes = price_data.get(sym)
        if closes is None:
            continue

        entry = cache.get(sym, {})
        need_info = not (_cache_fresh(entry, 'p', PROFILE_TTL) and _cache_fresh(entry, 'm', METRICS_TTL))

        if need_info:
            elapsed = time.time() - info_start
            if elapsed > INFO_BUDGET_S:
                # Use cached info if available, otherwise build price-only record
                info = entry.get('info', {})
                if not info:
                    continue  # no data at all, skip
            else:
                info = fetch_info(sym)
                if info:
                    entry['info']     = info
                    entry['pFetched'] = datetime.now(timezone.utc).isoformat()
                    entry['mFetched'] = datetime.now(timezone.utc).isoformat()
                    cache[sym]        = entry
                    print(f"  {sym} ✓ info ({country})")
                else:
                    print(f"  {sym} — no info (will try next run)")
                    info = entry.get('info', {})
                time.sleep(DELAY_S)
        else:
            info = entry.get('info', {})

        try:
            stock = build_stock(sym, country, exchange, closes, info, fx)
            intl_stocks.append(stock)
        except Exception as e:
            print(f"  {sym} build error: {e}")

    _save_cache(cache)
    print(f"\nBuilt {len(intl_stocks)} international stocks. Cache saved ({len(cache)} entries).")

    if not intl_stocks:
        print("No international stocks — keeping stocks.json unchanged.")
        return

    # ── Merge US + international ──────────────────────────────────────────────
    # Deduplicate: US stocks take precedence over international for overlapping symbols
    us_symbols = {s['symbol'] for s in us_stocks}
    new_intl   = [s for s in intl_stocks if s['symbol'] not in us_symbols]
    all_stocks = us_stocks + new_intl
    print(f"Combined: {len(us_stocks)} US + {len(new_intl)} international = {len(all_stocks)} total.")

    # ── Recompute value scores globally (all stocks as peer universe by sector) ─
    sectors = {}
    for s in all_stocks:
        sectors.setdefault(s.get('sector', 'Unknown'), []).append(s)
    for stock in all_stocks:
        peers = sectors.get(stock.get('sector', 'Unknown'), all_stocks)
        stock['valueScore'] = compute_value_score(stock, peers)

    # ── Save updated stocks.json ─────────────────────────────────────────────
    with open(STOCKS_JSON, 'w') as f:
        json.dump({
            'lastUpdated': existing_data.get('lastUpdated'),
            'asOf':        existing_data.get('asOf'),
            'count':       len(all_stocks),
            'benchmark':   existing_data.get('benchmark'),
            'stocks':      [_clean(s) for s in all_stocks],
        }, f, separators=(',', ':'))

    print(f"Saved {len(all_stocks)} stocks to stocks.json.")


if __name__ == '__main__':
    main()
