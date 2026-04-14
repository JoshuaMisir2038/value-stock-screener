#!/usr/bin/env python3
"""Fetch bond yields and commodity prices."""

import yfinance as yf
import json
import os
from datetime import datetime

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')

# US Treasury yield tickers — price value IS the yield in %
US_BONDS = [
    {'ticker': '^IRX', 'name': '3-Month T-Bill',  'maturity': '3M'},
    {'ticker': '^FVX', 'name': '5-Year T-Note',   'maturity': '5Y'},
    {'ticker': '^TNX', 'name': '10-Year T-Note',  'maturity': '10Y'},
    {'ticker': '^TYX', 'name': '30-Year T-Bond',  'maturity': '30Y'},
]

# International bond ETFs — NAV prices (Yahoo Finance doesn't support direct foreign govt yield quotes)
# IGOV = iShares Intl Treasury (dev markets), BWX = SPDR Intl Treasury,
# BNDX = Vanguard Total Intl Bond, EMB = EM USD sovereign, EMLC = EM local currency
INTL_BONDS = [
    {'ticker': 'IGOV',  'name': 'Developed Markets Govt Bonds',  'region': 'Global DM'},
    {'ticker': 'BWX',   'name': 'Intl Treasury Bond',            'region': 'Global DM'},
    {'ticker': 'BNDX',  'name': 'Total Intl Bond (Hedged)',      'region': 'Global'},
    {'ticker': 'EMB',   'name': 'EM USD Sovereign Debt',         'region': 'Emerging Markets'},
    {'ticker': 'EMLC',  'name': 'EM Local Currency Bonds',       'region': 'Emerging Markets'},
]

# US credit spread / corporate bond ETFs
CORP_BONDS = [
    {'ticker': 'LQD',  'name': 'US Investment Grade Corp',  'type': 'IG Corp'},
    {'ticker': 'HYG',  'name': 'US High Yield Corp',        'type': 'HY Corp'},
    {'ticker': 'JNK',  'name': 'US High Yield (alt)',       'type': 'HY Corp'},
    {'ticker': 'VCIT', 'name': 'Vanguard Corp Bond Interm', 'type': 'IG Corp'},
]

COMMODITIES = {
    'energy': [
        {'ticker': 'CL=F', 'name': 'WTI Crude Oil',   'unit': '$/bbl'},
        {'ticker': 'BZ=F', 'name': 'Brent Crude',     'unit': '$/bbl'},
        {'ticker': 'NG=F', 'name': 'Natural Gas',     'unit': '$/MMBtu'},
        {'ticker': 'RB=F', 'name': 'RBOB Gasoline',  'unit': '$/gal'},
    ],
    'metals': [
        {'ticker': 'GC=F', 'name': 'Gold',      'unit': '$/oz'},
        {'ticker': 'SI=F', 'name': 'Silver',    'unit': '$/oz'},
        {'ticker': 'HG=F', 'name': 'Copper',    'unit': '$/lb'},
        {'ticker': 'PL=F', 'name': 'Platinum',  'unit': '$/oz'},
        {'ticker': 'PA=F', 'name': 'Palladium', 'unit': '$/oz'},
    ],
    'grains': [
        {'ticker': 'ZW=F', 'name': 'Wheat',     'unit': '¢/bu'},
        {'ticker': 'ZC=F', 'name': 'Corn',      'unit': '¢/bu'},
        {'ticker': 'ZS=F', 'name': 'Soybeans',  'unit': '¢/bu'},
    ],
    'softs': [
        {'ticker': 'KC=F', 'name': 'Coffee',  'unit': '¢/lb'},
        {'ticker': 'SB=F', 'name': 'Sugar',   'unit': '¢/lb'},
        {'ticker': 'CT=F', 'name': 'Cotton',  'unit': '¢/lb'},
        {'ticker': 'CC=F', 'name': 'Cocoa',   'unit': '$/MT'},
    ],
}


def fetch_ticker_data(ticker_str):
    """Return price stats for a single ticker."""
    try:
        hist = yf.Ticker(ticker_str).history(period='1y')
        if hist.empty or len(hist) < 2:
            return None
        close = hist['Close']
        latest   = float(close.iloc[-1])
        prev     = float(close.iloc[-2])
        week_ago = float(close.iloc[-6]) if len(close) >= 6 else None
        high52   = float(hist['High'].max())
        low52    = float(hist['Low'].min())

        def pct(a, b):
            return round((a - b) / b * 100, 2) if b else None

        return {
            'price':    round(latest, 4),
            'change1d': pct(latest, prev),
            'change1w': pct(latest, week_ago),
            'high52':   round(high52, 4),
            'low52':    round(low52, 4),
        }
    except Exception as e:
        print(f"  Error {ticker_str}: {e}")
        return None


def empty_row(meta):
    return {**meta, 'price': None, 'change1d': None, 'change1w': None, 'high52': None, 'low52': None}


EMPTY = {'price': None, 'change1d': None, 'change1w': None, 'high52': None, 'low52': None}

def fetch_bonds():
    print("Fetching bond yields...")
    us, intl, corp = [], [], []

    for group, dest in [(US_BONDS, us), (INTL_BONDS, intl), (CORP_BONDS, corp)]:
        for item in group:
            print(f"  {item['ticker']}")
            d = fetch_ticker_data(item['ticker'])
            dest.append({**item, **(d or EMPTY)})

    return {'us': us, 'international': intl, 'corporate': corp}


def fetch_commodities():
    print("Fetching commodities...")
    result = {}
    for category, items in COMMODITIES.items():
        rows = []
        for item in items:
            print(f"  {item['ticker']}")
            d = fetch_ticker_data(item['ticker'])
            rows.append({**item, **(d or {'price': None, 'change1d': None, 'change1w': None, 'high52': None, 'low52': None})})
        result[category] = rows
    return result


if __name__ == '__main__':
    as_of = datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')

    bonds = fetch_bonds()
    commodities = fetch_commodities()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    bonds_path = os.path.join(OUTPUT_DIR, 'bonds.json')
    with open(bonds_path, 'w') as f:
        json.dump({'asOf': as_of, **bonds}, f, indent=2)
    print(f"Saved {bonds_path}")

    commodities_path = os.path.join(OUTPUT_DIR, 'commodities.json')
    with open(commodities_path, 'w') as f:
        json.dump({'asOf': as_of, **commodities}, f, indent=2)
    print(f"Saved {commodities_path}")
