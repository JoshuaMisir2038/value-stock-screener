"""
send_weekly_digest.py — runs every Monday at 8am ET.
Sends a weekly email digest to all digest subscribers.
Uses Resend batch API for efficiency at scale.
"""

import json, os, requests
from datetime import datetime, timezone, timedelta
from pathlib import Path

SUPABASE_URL      = os.environ['SUPABASE_URL']
SUPABASE_KEY      = os.environ['SUPABASE_SERVICE_ROLE_KEY']
RESEND_API_KEY    = os.environ['RESEND_API_KEY']
FROM_EMAIL        = os.environ.get('FROM_EMAIL', 'digest@yourdomain.com')
SITE_URL          = 'https://joshuamisir2038.github.io/value-stock-screener'

HEADERS = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
}

BASE = Path(__file__).parent.parent / 'public' / 'data'

# ── Load data ─────────────────────────────────────────────────────────────────

def load_stocks():
    with open(BASE / 'stocks.json') as f:
        data = json.load(f)
    return data.get('stocks', [])

def load_macro():
    try:
        with open(BASE / 'macro.json') as f:
            return json.load(f)
    except:
        return {}

def load_score_history():
    try:
        with open(BASE / 'score_history.json') as f:
            return json.load(f)
    except:
        return {}

# ── Digest content builders ───────────────────────────────────────────────────

def top_value_stocks(stocks, n=5):
    scored = [s for s in stocks if s.get('valueScore') is not None]
    return sorted(scored, key=lambda s: s['valueScore'], reverse=True)[:n]

def biggest_movers(stocks, history, n=5):
    """Stocks whose value score changed most in the past 7 days."""
    movers = []
    cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()
    for stock in stocks:
        sym = stock.get('symbol')
        hist = history.get(sym, [])
        if not hist:
            continue
        old = next((h for h in reversed(hist) if h['d'] <= cutoff), None)
        if not old:
            continue
        curr = stock.get('valueScore')
        if curr is None:
            continue
        change = curr - old['s']
        movers.append({ **stock, 'scoreChange': change })
    movers.sort(key=lambda s: abs(s['scoreChange']), reverse=True)
    return movers[:n]

def market_regime(macro):
    vix = macro.get('vix', {}).get('current')
    spy = macro.get('spy_regime', {})
    above = spy.get('above_ma50', True)
    regime = '🟢 Bull (SPY above 50MA)' if above else '🔴 Bear (SPY below 50MA)'
    vix_str = f'VIX {vix:.1f}' if vix else 'VIX N/A'
    return regime, vix_str

# ── HTML email builder ────────────────────────────────────────────────────────

def fmt_score(s):
    if s >= 75: color = '#30D158'
    elif s >= 55: color = '#0A84FF'
    elif s >= 35: color = '#FFD60A'
    else: color = '#FF453A'
    return f'<span style="color:{color};font-weight:bold">{s}</span>'

def build_email(subscriber, top_stocks, movers, regime, vix_str, member_count):
    name = subscriber.get('display_name') or subscriber['email'].split('@')[0].capitalize()
    week = datetime.now().strftime('%B %d, %Y')

    rows_top = ''.join(f"""
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;font-weight:bold;color:#e2e8f0">{s['symbol']}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;color:#94a3b8;font-size:11px">{s.get('name','')[:30]}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;text-align:right">{fmt_score(s['valueScore'])}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;text-align:right;color:#94a3b8;font-size:11px">{s.get('sector','')[:18]}</td>
      </tr>
    """ for s in top_stocks)

    rows_movers = ''.join(f"""
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;font-weight:bold;color:#e2e8f0">{s['symbol']}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;color:#94a3b8;font-size:11px">{s.get('name','')[:30]}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;text-align:right">{fmt_score(s['valueScore'])}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #1a2640;text-align:right;color:{'#30D158' if s['scoreChange']>0 else '#FF453A'};font-weight:bold">
          {'▲' if s['scoreChange']>0 else '▼'} {abs(s['scoreChange'])} pts
        </td>
      </tr>
    """ for s in movers)

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060c16;font-family:'IBM Plex Mono',monospace,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="border-bottom:1px solid #1a2640;padding-bottom:20px;margin-bottom:28px">
    <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:0.15em">ALETHEIA</div>
    <div style="font-size:11px;color:#4a6080;margin-top:2px">truth in data</div>
    <div style="margin-top:12px;font-size:12px;color:#64748b">Weekly Digest · {week}</div>
  </div>

  <p style="color:#94a3b8;font-size:13px;margin:0 0 24px">Hi {name},</p>
  <p style="color:#94a3b8;font-size:12px;margin:0 0 28px;line-height:1.6">
    Here's your weekly snapshot from Aletheia — {member_count:,} members are using the platform to find their edge.
  </p>

  <!-- Market regime -->
  <div style="background:#0d1a2e;border:1px solid #1a2640;padding:16px;margin-bottom:28px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Market Regime</div>
    <div style="font-size:14px;color:#e2e8f0;font-weight:bold">{regime}</div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">{vix_str}</div>
  </div>

  <!-- Top value stocks -->
  <div style="margin-bottom:28px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">
      Top Value Stocks This Week
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <thead>
        <tr style="border-bottom:1px solid #1a2640">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Ticker</th>
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Company</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Score</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Sector</th>
        </tr>
      </thead>
      <tbody>{rows_top}</tbody>
    </table>
  </div>

  <!-- Biggest movers -->
  <div style="margin-bottom:28px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">
      Biggest Score Movers (7 days)
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <thead>
        <tr style="border-bottom:1px solid #1a2640">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Ticker</th>
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Company</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Score</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#4a6080;font-weight:normal;text-transform:uppercase">Change</th>
        </tr>
      </thead>
      <tbody>{rows_movers}</tbody>
    </table>
  </div>

  <!-- CTA -->
  <div style="text-align:center;margin-bottom:32px">
    <a href="{SITE_URL}" style="display:inline-block;background:#0a84ff;color:#ffffff;text-decoration:none;
       padding:12px 32px;font-size:12px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase">
      Open Aletheia →
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1a2640;padding-top:20px;font-size:10px;color:#374151;text-align:center;line-height:1.8">
    You're receiving this because you subscribed to Aletheia weekly digest.<br>
    <a href="{SITE_URL}" style="color:#374151">Manage preferences</a> ·
    <a href="{SITE_URL}" style="color:#374151">Unsubscribe</a>
  </div>

</div>
</body>
</html>
"""

# ── Supabase helpers ──────────────────────────────────────────────────────────

def get_subscribers():
    url  = f'{SUPABASE_URL}/rest/v1/digest_subscriptions?select=*'
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.json()

def get_member_count():
    url  = f'{SUPABASE_URL}/rest/v1/digest_subscriptions?select=count'
    resp = requests.get(url, headers={**HEADERS, 'Prefer': 'count=exact', 'Range': '0-0'}, timeout=10)
    total = resp.headers.get('Content-Range', '*/0').split('/')[-1]
    return int(total) if total.isdigit() else 0

def mark_sent(user_ids):
    if not user_ids:
        return
    ids_str = ','.join(f'"{uid}"' for uid in user_ids)
    url = f'{SUPABASE_URL}/rest/v1/digest_subscriptions?user_id=in.({ids_str})'
    requests.patch(url,
        headers={**HEADERS, 'Prefer': 'return=minimal'},
        json={'last_sent_at': datetime.now(timezone.utc).isoformat()},
        timeout=15
    )

# ── Resend batch send ─────────────────────────────────────────────────────────

def send_batch(emails):
    """Resend supports up to 100 emails per batch request."""
    sent = 0
    for i in range(0, len(emails), 100):
        batch = emails[i:i+100]
        resp  = requests.post(
            'https://api.resend.com/emails/batch',
            headers={
                'Authorization': f'Bearer {RESEND_API_KEY}',
                'Content-Type':  'application/json',
            },
            json=batch,
            timeout=30,
        )
        if resp.status_code in (200, 201):
            sent += len(batch)
            print(f'  Batch sent: {len(batch)} emails')
        else:
            print(f'  Batch failed: {resp.status_code} — {resp.text[:200]}')
    return sent

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f'Weekly digest — {datetime.now().strftime("%Y-%m-%d %H:%M UTC")}')

    stocks  = load_stocks()
    macro   = load_macro()
    history = load_score_history()

    top     = top_value_stocks(stocks)
    movers  = biggest_movers(stocks, history)
    regime, vix_str = market_regime(macro)

    subscribers  = get_subscribers()
    member_count = get_member_count()
    print(f'Subscribers: {len(subscribers)} · Members: {member_count}')

    if not subscribers:
        print('No subscribers — done.')
        return

    week = datetime.now().strftime('%B %d, %Y')
    emails = []
    for sub in subscribers:
        html = build_email(sub, top, movers, regime, vix_str, member_count)
        emails.append({
            'from':    FROM_EMAIL,
            'to':      [sub['email']],
            'subject': f'Aletheia Weekly · {week} — Top value stocks & biggest movers',
            'html':    html,
        })

    sent = send_batch(emails)
    mark_sent([s['user_id'] for s in subscribers])
    print(f'Done — {sent}/{len(emails)} emails sent.')

if __name__ == '__main__':
    main()
