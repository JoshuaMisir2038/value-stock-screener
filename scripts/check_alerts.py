"""
check_alerts.py — runs after each data fetch.
Reads stocks.json, queries Supabase for active alerts,
emails users via Resend when conditions are met.
Only triggers once per calendar day per alert to avoid spam.
"""

import json, os, requests
from datetime import datetime, timezone, date
from pathlib import Path

SUPABASE_URL      = os.environ['SUPABASE_URL']
SUPABASE_KEY      = os.environ['SUPABASE_SERVICE_ROLE_KEY']   # service role — bypasses RLS
RESEND_API_KEY    = os.environ['RESEND_API_KEY']
FROM_EMAIL        = os.environ.get('FROM_EMAIL', 'alerts@yourdomain.com')
SCREENER_URL      = 'https://joshuamisir2038.github.io/value-stock-screener'

SUPABASE_HEADERS  = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
}

# ── Percentage-based metrics stored as decimals in stocks.json ────────────────
PCT_METRICS = {'fcfMargin', 'grossMargin', 'return1y', 'revenueGrowth',
               'operatingMargin', 'earningsGrowth'}

# ── Load stocks ───────────────────────────────────────────────────────────────

def load_stocks():
    path = Path(__file__).parent.parent / 'public' / 'data' / 'stocks.json'
    with open(path) as f:
        data = json.load(f)
    stocks = data['stocks'] if isinstance(data, dict) else data
    return {s['symbol']: s for s in stocks}

# ── Supabase helpers ──────────────────────────────────────────────────────────

def get_active_alerts():
    url  = f'{SUPABASE_URL}/rest/v1/alerts?active=eq.true&select=*'
    resp = requests.get(url, headers=SUPABASE_HEADERS, timeout=15)
    resp.raise_for_status()
    return resp.json()

def mark_triggered(alert_id):
    url  = f'{SUPABASE_URL}/rest/v1/alerts?id=eq.{alert_id}'
    body = {
        'last_triggered_at': datetime.now(timezone.utc).isoformat(),
        'trigger_count':     None,   # incremented via postgres expression below
    }
    # Use RPC to increment trigger_count atomically
    requests.patch(url, headers={**SUPABASE_HEADERS, 'Prefer': 'return=minimal'},
                   json={'last_triggered_at': datetime.now(timezone.utc).isoformat()},
                   timeout=10)
    # Increment trigger count separately
    rpc_url  = f'{SUPABASE_URL}/rest/v1/rpc/increment_trigger_count'
    requests.post(rpc_url, headers=SUPABASE_HEADERS,
                  json={'alert_id': alert_id}, timeout=10)

# ── Email helper ──────────────────────────────────────────────────────────────

def send_email(to_email, subject, html):
    resp = requests.post(
        'https://api.resend.com/emails',
        headers={
            'Authorization': f'Bearer {RESEND_API_KEY}',
            'Content-Type':  'application/json',
        },
        json={'from': FROM_EMAIL, 'to': [to_email], 'subject': subject, 'html': html},
        timeout=15,
    )
    return resp.status_code == 200

def build_email(alert, current_value, stock):
    symbol       = alert['symbol']
    company      = alert.get('company_name') or symbol
    metric_label = {
        'price': 'Price', 'valueScore': 'Value Score', 'peRatio': 'P/E Ratio',
        'pFcf': 'P/FCF', 'evEbitda': 'EV/EBITDA', 'rsi': 'RSI',
        'return1y': '1Y Return', 'fcfMargin': 'FCF Margin', 'grossMargin': 'Gross Margin',
    }.get(alert['metric'], alert['metric'])

    is_pct    = alert['metric'] in PCT_METRICS
    fmt_curr  = f"{current_value * 100:.1f}%" if is_pct else (
                f"${current_value:.2f}" if alert['metric'] == 'price' else f"{current_value:.1f}")
    fmt_thr   = f"{alert['threshold'] * 100:.1f}%" if is_pct else (
                f"${alert['threshold']:.2f}" if alert['metric'] == 'price' else f"{alert['threshold']:.1f}")
    direction = 'dropped below' if alert['condition'] == 'below' else 'risen above'

    subject = f"Alert: {symbol} {metric_label} {direction} {fmt_thr}"
    html = f"""
    <div style="font-family:monospace;background:#0a0a0f;color:#e5e7eb;padding:32px;max-width:560px;margin:0 auto;">
      <div style="border-bottom:1px solid #374151;padding-bottom:16px;margin-bottom:24px;">
        <span style="font-size:11px;color:#6b7280;letter-spacing:0.1em;text-transform:uppercase;">ALETHEIA ALERT</span>
      </div>

      <h2 style="font-size:20px;font-weight:bold;color:#ffffff;margin:0 0 4px;">{symbol} — {company}</h2>
      <p style="color:#9ca3af;font-size:13px;margin:0 0 24px;">{stock.get('sector','')}</p>

      <div style="background:#111827;border:1px solid #1f2937;padding:20px;margin-bottom:24px;">
        <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">{metric_label}</div>
        <div style="font-size:28px;font-weight:bold;color:#60a5fa;">{fmt_curr}</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Has {direction} your threshold of <strong style="color:#ffffff">{fmt_thr}</strong></div>
      </div>

      <a href="{SCREENER_URL}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;
         padding:10px 24px;font-size:12px;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase;">
        Open Value Finder →
      </a>

      <p style="color:#374151;font-size:10px;margin-top:24px;">
        You're receiving this because you set an alert on Aletheia.<br>
        Manage your alerts at <a href="{SCREENER_URL}" style="color:#4b5563;">{SCREENER_URL}</a>
      </p>
    </div>
    """
    return subject, html

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    today  = date.today().isoformat()
    stocks = load_stocks()
    alerts = get_active_alerts()
    print(f"Checking {len(alerts)} active alert(s) against {len(stocks)} stocks...")

    triggered = 0
    for alert in alerts:
        symbol = alert['symbol']
        metric = alert['metric']
        stock  = stocks.get(symbol)
        if not stock:
            continue

        # Skip if already triggered today
        last = alert.get('last_triggered_at')
        if last and last[:10] == today:
            continue

        raw = stock.get(metric)
        if raw is None:
            continue

        # Percentage metrics are stored as decimals (0.25 = 25%)
        # Alert thresholds are stored as entered by user (25 for 25%)
        current   = raw * 100 if metric in PCT_METRICS else raw
        threshold = float(alert['threshold'])

        met = (alert['condition'] == 'below' and current < threshold) or \
              (alert['condition'] == 'above' and current > threshold)

        if not met:
            continue

        subject, html = build_email(alert, raw, stock)
        ok = send_email(alert['email'], subject, html)

        if ok:
            mark_triggered(alert['id'])
            triggered += 1
            print(f"  ✓ Sent alert to {alert['email']} — {symbol} {metric} {alert['condition']} {threshold}")
        else:
            print(f"  ✗ Failed to send alert for {symbol} to {alert['email']}")

    print(f"Done. {triggered} alert(s) triggered.")

if __name__ == '__main__':
    main()
