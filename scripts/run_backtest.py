#!/usr/bin/env python3
"""
Options strategy backtester.

Simulates BUY CALL, SELL PUT, and BUY PUT strategies on all stocks in the
universe over the past year. Uses Black-Scholes + 21-day historical volatility
to estimate option premiums (no historical options chain data required).

Caveats clearly noted in the output JSON.
"""

import json
import math
import os
import time
from datetime import datetime

import pandas as pd
import yfinance as yf

OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
STOCKS_JSON = os.path.join(OUTPUT_DIR, 'stocks.json')

RISK_FREE_RATE = 0.05  # approximate 1-year T-bill rate used in BS formula


# ── Black-Scholes ─────────────────────────────────────────────────────────────

def _ncdf(x):
    return 0.5 * (1.0 + math.erf(x / math.sqrt(2)))


def bs_price(S, K, T, r, sigma, opt_type):
    """Black-Scholes option price. Returns 0 on any error."""
    if T <= 0:
        return max(0.0, S - K) if opt_type == 'call' else max(0.0, K - S)
    if sigma <= 0 or S <= 0 or K <= 0:
        return 0.0
    try:
        d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
        d2 = d1 - sigma * math.sqrt(T)
        if opt_type == 'call':
            return S * _ncdf(d1) - K * math.exp(-r * T) * _ncdf(d2)
        else:
            return K * math.exp(-r * T) * _ncdf(-d2) - S * _ncdf(-d1)
    except (ValueError, ZeroDivisionError):
        return 0.0


# ── Rolling indicators ────────────────────────────────────────────────────────

def rolling_rsi(series, period=14):
    delta = series.diff()
    gain  = delta.where(delta > 0, 0.0)
    loss  = -delta.where(delta < 0, 0.0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss.replace(0, float('nan'))
    return 100 - (100 / (1 + rs))


# ── Strategy definitions ──────────────────────────────────────────────────────

STRATEGIES = {
    'buy_call': {
        'label':     'BUY CALL',
        'opt_type':  'call',
        'action':    'buy',
        'otm_mult':  1.02,    # 2% OTM (higher delta ~0.45)
        'dte':       45,
        'rsi_min':   40,  'rsi_max':   55,   # tighter: pulled back but not oversold
        'above_ma':  True,
        'score_min': 45,  'score_max': 100,
        'color':     '#34d399',
    },
    'sell_put': {
        'label':     'SELL PUT',
        'opt_type':  'put',
        'action':    'sell',
        'otm_mult':  0.92,    # 8% OTM
        'dte':       33,
        'rsi_min':   40,  'rsi_max':   65,
        'above_ma':  True,
        'score_min': 60,  'score_max': 100,
        'color':     '#fb923c',
    },
    'buy_put': {
        'label':     'BUY PUT',
        'opt_type':  'put',
        'action':    'buy',
        'otm_mult':  0.945,   # 5.5% OTM
        'dte':       45,
        'rsi_min':   55,  'rsi_max':   75,
        'above_ma':  False,
        'score_min': 0,   'score_max': 45,
        'color':     '#f87171',
    },
}


# ── Per-stock simulation ──────────────────────────────────────────────────────

def backtest_stock(symbol, series, value_score, strategy_id):
    """
    Simulate one strategy on one stock's 1Y price series.
    Returns a list of trade dicts.
    """
    cfg = STRATEGIES[strategy_id]
    n   = len(series)
    if n < 80:
        return []

    rsi   = rolling_rsi(series)
    ma200 = series.rolling(200).mean()
    ma50  = series.rolling(50).mean()
    # 21-day realised volatility, annualised
    vol21 = series.pct_change().rolling(21).std() * math.sqrt(252)
    # 63-day (3M) momentum
    mom3m = series.pct_change(63)

    trades = []
    next_entry = 0   # earliest index we can open a new trade

    for i in range(60, n):
        if i < next_entry:
            continue

        rsi_val  = rsi.iloc[i]
        ma_val   = ma200.iloc[i]
        ma50_val = ma50.iloc[i]
        vol_val  = vol21.iloc[i]
        mom_val  = mom3m.iloc[i]
        price    = float(series.iloc[i])

        if (pd.isna(rsi_val) or pd.isna(ma_val) or pd.isna(vol_val)
                or price <= 0 or vol_val <= 0):
            continue

        above_ma = price >= float(ma_val)

        # Signal gate
        if above_ma != cfg['above_ma']:
            continue
        if not (cfg['rsi_min'] <= float(rsi_val) <= cfg['rsi_max']):
            continue
        if not (cfg['score_min'] <= value_score <= cfg['score_max']):
            continue

        # BUY CALL: additional quant-grade filters
        if strategy_id == 'buy_call':
            if pd.isna(ma50_val) or pd.isna(mom_val):
                continue
            # Golden cross: 50MA > 200MA (full uptrend alignment)
            if float(ma50_val) < float(ma_val):
                continue
            # Price above 50MA
            if price < float(ma50_val):
                continue
            # Positive 3M momentum
            if float(mom_val) <= 0:
                continue
            # Low IV proxy: skip when 21-day realised vol > 35%
            if float(vol_val) > 0.35:
                continue

        # Can we reach expiry within the series?
        expiry_idx = i + cfg['dte']
        if expiry_idx >= n:
            continue

        strike  = price * cfg['otm_mult']
        T       = cfg['dte'] / 365.0
        premium = bs_price(price, strike, T, RISK_FREE_RATE, float(vol_val), cfg['opt_type'])

        if premium < 0.01:
            continue

        expiry_price = float(series.iloc[expiry_idx])
        entry_date   = series.index[i].date().isoformat()
        expiry_date  = series.index[expiry_idx].date().isoformat()

        # P&L
        if cfg['opt_type'] == 'call':
            intrinsic = max(0.0, expiry_price - strike)
        else:
            intrinsic = max(0.0, strike - expiry_price)

        if cfg['action'] == 'buy':
            pnl = intrinsic - premium
            # Return = % of premium invested
            return_pct = round(pnl / premium * 100, 1)
        else:  # sell put
            pnl = premium - intrinsic
            # Return = % of strike (collateral required for cash-secured put)
            return_pct = round(pnl / strike * 100, 1)

        trades.append({
            'symbol':      symbol,
            'entryDate':   entry_date,
            'expiryDate':  expiry_date,
            'entryPrice':  round(price, 2),
            'strike':      round(strike, 2),
            'expiryPrice': round(expiry_price, 2),
            'premium':     round(premium, 2),
            'pnl':         round(pnl, 2),
            'returnPct':   return_pct,
            'outcome':     'WIN' if pnl >= 0 else 'LOSS',
            'rsiAtEntry':  round(float(rsi_val), 1),
            'volAtEntry':  round(float(vol_val) * 100, 1),
            'valueScore':  value_score,
        })

        # Lock stock until this trade expires
        next_entry = expiry_idx + 1

    return trades


# ── Aggregate statistics ──────────────────────────────────────────────────────

def compute_stats(trades):
    if not trades:
        return {'totalTrades': 0, 'winRate': 0, 'avgReturn': 0}

    wins   = [t for t in trades if t['outcome'] == 'WIN']
    losses = [t for t in trades if t['outcome'] == 'LOSS']
    rets   = [t['returnPct'] for t in trades]

    avg_win  = sum(t['returnPct'] for t in wins)  / len(wins)  if wins  else 0
    avg_loss = sum(t['returnPct'] for t in losses) / len(losses) if losses else 0

    gross_profit = sum(t['returnPct'] for t in wins)
    gross_loss   = abs(sum(t['returnPct'] for t in losses))
    pf = round(gross_profit / gross_loss, 2) if gross_loss > 0 else None

    return {
        'totalTrades':       len(trades),
        'winners':           len(wins),
        'losers':            len(losses),
        'winRate':           round(len(wins) / len(trades) * 100, 1),
        'avgReturn':         round(sum(rets) / len(rets), 1),
        'avgWin':            round(avg_win, 1),
        'avgLoss':           round(avg_loss, 1),
        'bestTrade':         round(max(rets), 1),
        'worstTrade':        round(min(rets), 1),
        'profitFactor':      pf,
        'cumulativeReturn':  round(sum(rets), 1),
    }


# ── Batch price download ──────────────────────────────────────────────────────

def download_prices(symbols):
    prices = {}
    chunk_size = 100
    for i in range(0, len(symbols), chunk_size):
        chunk = symbols[i:i + chunk_size]
        try:
            raw = yf.download(
                chunk, period='1y', auto_adjust=True,
                progress=False, threads=True,
            )
            closes = raw['Close'] if isinstance(raw.columns, pd.MultiIndex) else raw[['Close']].rename(columns={'Close': chunk[0]})
            for sym in chunk:
                if sym in closes.columns:
                    s = closes[sym].dropna()
                    if len(s) >= 80:
                        prices[sym] = s
        except Exception as e:
            print(f"  Chunk {i // chunk_size} error: {e}")
        time.sleep(0.5)
    return prices


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("Loading value scores from stocks.json...")
    with open(STOCKS_JSON) as f:
        stocks_data = json.load(f)
    score_map = {s['symbol']: s['valueScore'] for s in stocks_data['stocks'] if s.get('valueScore') is not None}
    symbols   = list(score_map.keys())
    print(f"  {len(symbols)} symbols")

    print(f"\nDownloading 1Y price history for {len(symbols)} symbols...")
    prices = download_prices(symbols)
    print(f"  Prices for {len(prices)} symbols")

    results = {}
    for sid, cfg in STRATEGIES.items():
        print(f"\nRunning {cfg['label']} backtest across {len(prices)} stocks...")
        all_trades = []
        for sym, series in prices.items():
            score = score_map.get(sym)
            if score is None:
                continue
            all_trades.extend(backtest_stock(sym, series, score, sid))

        all_trades.sort(key=lambda t: t['entryDate'])
        stats = compute_stats(all_trades)
        print(f"  {stats['totalTrades']} trades  win rate {stats.get('winRate')}%  avg {stats.get('avgReturn')}%  PF {stats.get('profitFactor')}")

        # Cumulative P&L series (one point per trade)
        cumulative = []
        running = 0.0
        for t in all_trades:
            running = round(running + t['returnPct'], 1)
            cumulative.append({'date': t['entryDate'], 'cumReturn': running})

        results[sid] = {
            'label':      cfg['label'],
            'color':      cfg['color'],
            'stats':      stats,
            'trades':     all_trades[:1000],   # cap to keep JSON reasonable
            'cumulative': cumulative,
        }

    output = {
        'generatedAt': datetime.utcnow().isoformat(),
        'strategies': results,
        'caveats': [
            'Premium estimated via Black-Scholes using 21-day historical volatility — actual IV differs',
            'Current value scores used as historical signal proxy (point-in-time fundamentals unavailable)',
            'One trade per stock at a time (no overlapping positions on same ticker)',
            'No bid-ask spread, slippage, or commissions deducted',
            'Survivorship bias: only stocks currently active and in the universe are included',
            'Return for BUY strategies = P&L as % of premium paid; SELL PUT = P&L as % of strike (collateral)',
        ],
    }

    out_path = os.path.join(OUTPUT_DIR, 'backtest_options.json')
    with open(out_path, 'w') as f:
        json.dump(output, f)
    print(f"\nSaved {out_path}")
