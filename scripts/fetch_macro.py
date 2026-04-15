#!/usr/bin/env python3
"""
Fetch macro indicators: VIX, CBOE Put/Call Ratio, and FRED economic series.
Outputs public/data/macro.json.

FRED data pulled via public CSV endpoint — no API key required.
VIX pulled via yfinance (^VIX).
PCR pulled from CBOE CDN; falls back to computing from SPY/QQQ options chains.
"""

import io
import json
import os
import ssl
import time
from datetime import datetime

import pandas as pd
import yfinance as yf

# macOS Python ships without system root certs — bypass for data-fetch scripts
ssl._create_default_https_context = ssl._create_unverified_context

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# ── FRED series config ────────────────────────────────────────────────────────

FRED_SERIES = [
    {
        'id':        'FEDFUNDS',
        'label':     'Fed Funds Rate',
        'unit':      '%',
        'yoy':       False,
        'desc':      'Federal Reserve target interest rate',
        'good_low':  True,    # lower = generally easier financial conditions
    },
    {
        'id':        'CPIAUCSL',
        'label':     'CPI (YoY)',
        'unit':      '%',
        'yoy':       True,    # compute YoY % change from index
        'desc':      'Consumer Price Index, all urban consumers — year-over-year change',
        'good_low':  True,
    },
    {
        'id':        'CPILFESL',
        'label':     'Core CPI (YoY)',
        'unit':      '%',
        'yoy':       True,
        'desc':      'CPI excluding food and energy — year-over-year change',
        'good_low':  True,
    },
    {
        'id':        'UNRATE',
        'label':     'Unemployment Rate',
        'unit':      '%',
        'yoy':       False,
        'desc':      'Civilian unemployment rate (U-3)',
        'good_low':  True,
    },
    {
        'id':        'MORTGAGE30US',
        'label':     '30Y Mortgage Rate',
        'unit':      '%',
        'yoy':       False,
        'desc':      '30-year fixed-rate mortgage average (Freddie Mac)',
        'good_low':  True,
    },
    {
        'id':        'T10Y2Y',
        'label':     '10Y − 2Y Spread',
        'unit':      '%',
        'yoy':       False,
        'desc':      'Yield curve spread — negative = inverted (recession signal)',
        'good_low':  False,   # higher is better (normal curve)
    },
    {
        'id':        'UMCSENT',
        'label':     'Consumer Sentiment',
        'unit':      '',
        'yoy':       False,
        'desc':      'University of Michigan Consumer Sentiment Index',
        'good_low':  False,   # higher is better
    },
]


def fetch_fred(series_cfg):
    sid = series_cfg['id']
    print(f"  FRED {sid}...")
    try:
        url = f'https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}'
        df  = pd.read_csv(url)
        # FRED returns 'observation_date' and series ID as columns
        df.columns = ['date', 'value']
        df['date']  = pd.to_datetime(df['date'], errors='coerce')
        df['value'] = pd.to_numeric(df['value'], errors='coerce')
        df = df.dropna().reset_index(drop=True)

        if series_cfg['yoy']:
            # Compute year-over-year % change from index level
            df['value'] = df['value'].pct_change(12) * 100
            df = df.dropna().reset_index(drop=True)

        if df.empty:
            return None

        latest  = df.iloc[-1]
        prev    = df.iloc[-2] if len(df) >= 2  else None
        prev12  = df.iloc[-13] if len(df) >= 13 else None

        result = {
            'label':    series_cfg['label'],
            'unit':     series_cfg['unit'],
            'desc':     series_cfg['desc'],
            'goodLow':  series_cfg['good_low'],
            'value':    round(float(latest['value']), 2),
            'date':     latest['date'].strftime('%Y-%m-%d'),
        }
        if prev is not None:
            result['prev']   = round(float(prev['value']), 2)
            result['change'] = round(float(latest['value']) - float(prev['value']), 2)
        if prev12 is not None:
            result['changeYoY'] = round(float(latest['value']) - float(prev12['value']), 2)

        # 24-month sparkline history
        history_df = df.tail(24)
        result['history'] = [
            {'date': row['date'].strftime('%Y-%m'), 'value': round(float(row['value']), 2)}
            for _, row in history_df.iterrows()
        ]
        return result

    except Exception as e:
        print(f"    Error: {e}")
        return None


# ── VIX ───────────────────────────────────────────────────────────────────────

def fetch_vix():
    print("  VIX (^VIX)...")
    try:
        hist = yf.Ticker('^VIX').history(period='1y')
        if hist.empty:
            return None
        close = hist['Close'].dropna()
        latest   = float(close.iloc[-1])
        prev     = float(close.iloc[-2]) if len(close) >= 2 else None
        week_ago = float(close.iloc[-6]) if len(close) >= 6 else None

        # Weekly history for sparkline (last 52 weeks → resample)
        weekly = close.resample('W').last().dropna().tail(52)
        history = [
            {'date': idx.strftime('%Y-%m-%d'), 'value': round(float(v), 2)}
            for idx, v in weekly.items()
        ]

        return {
            'current':  round(latest, 2),
            'prev':     round(prev, 2) if prev else None,
            'change1d': round(latest - prev, 2) if prev else None,
            'change1w': round(latest - week_ago, 2) if week_ago else None,
            'high52':   round(float(close.max()), 2),
            'low52':    round(float(close.min()), 2),
            'history':  history,
        }
    except Exception as e:
        print(f"    Error: {e}")
        return None


# ── Put/Call Ratio ────────────────────────────────────────────────────────────

def fetch_pcr():
    """
    Compute put/call ratio from live SPY, QQQ, IWM options chains (nearest 2 expiries).
    CBOE blocks automated CSV access, so we derive equity PCR from the most liquid ETFs.
    Also returns an index PCR proxy using SPX-equivalent volume.
    """
    print("  Put/Call Ratio (via yfinance options chains)...")
    try:
        symbols = ['SPY', 'QQQ', 'IWM']
        equity_puts = equity_calls = 0
        today = pd.Timestamp.today().normalize()

        for sym in symbols:
            t    = yf.Ticker(sym)
            exps = t.options or []
            for exp in exps[:2]:
                try:
                    chain = t.option_chain(exp)
                    equity_calls += chain.calls['volume'].fillna(0).sum()
                    equity_puts  += chain.puts['volume'].fillna(0).sum()
                except Exception:
                    pass
            time.sleep(0.2)

        if equity_calls <= 0:
            return None

        equity_pcr = round(equity_puts / equity_calls, 2)
        print(f"    Equity PCR (SPY/QQQ/IWM): {equity_pcr}")

        return {
            'equity': {
                'value':   equity_pcr,
                'date':    today.strftime('%Y-%m-%d'),
                'source':  'SPY + QQQ + IWM options volume',
                'history': [],   # live-only; no history without CBOE access
            },
        }
    except Exception as e:
        print(f"    PCR error: {e}")
        return None


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    as_of = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')
    print("Fetching macro data...")

    print("\nVIX:")
    vix = fetch_vix()

    print("\nPut/Call Ratio:")
    pcr = fetch_pcr()

    print("\nFRED indicators:")
    indicators = {}
    for cfg in FRED_SERIES:
        data = fetch_fred(cfg)
        if data:
            indicators[cfg['id']] = data
        time.sleep(0.3)   # be polite to FRED

    output = {
        'asOf':       as_of,
        'vix':        vix,
        'pcr':        pcr,
        'indicators': indicators,
    }

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    path = os.path.join(OUTPUT_DIR, 'macro.json')
    with open(path, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved {path}")
