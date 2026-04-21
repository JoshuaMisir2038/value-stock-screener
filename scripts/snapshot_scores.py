#!/usr/bin/env python3
"""
Append today's value scores to public/data/score_history.json.
Keeps a rolling 365-day window. Skips if today's snapshot already exists.
"""
import json
import os
from datetime import datetime, timedelta

OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
STOCKS_JSON  = os.path.join(OUTPUT_DIR, 'stocks.json')
HISTORY_JSON = os.path.join(OUTPUT_DIR, 'score_history.json')

today   = datetime.utcnow().date().isoformat()
cutoff  = (datetime.utcnow().date() - timedelta(days=365)).isoformat()

with open(STOCKS_JSON) as f:
    stocks_data = json.load(f)

# Load existing history
if os.path.exists(HISTORY_JSON):
    with open(HISTORY_JSON) as f:
        history = json.load(f)
else:
    history = {}

# Skip if already snapshotted today
sample = next(iter(history.values()), []) if history else []
if sample and sample[-1].get('d') == today:
    print(f"Already snapshotted for {today} — skipping.")
    raise SystemExit(0)

added = 0
for s in stocks_data.get('stocks', []):
    sym   = s.get('symbol')
    score = s.get('valueScore')
    if not sym or score is None:
        continue

    entry = {'d': today, 's': score}
    sec = s.get('sectorScore')
    price = s.get('price')
    if sec   is not None: entry['sc'] = sec
    if price is not None: entry['p']  = round(float(price), 2)

    if sym not in history:
        history[sym] = []

    # Prune entries outside rolling window
    history[sym] = [e for e in history[sym] if e.get('d', '') >= cutoff]
    history[sym].append(entry)
    added += 1

with open(HISTORY_JSON, 'w') as f:
    json.dump(history, f, separators=(',', ':'))

print(f"Snapshot saved: {today} — {added} stocks, {len(history)} total symbols")
