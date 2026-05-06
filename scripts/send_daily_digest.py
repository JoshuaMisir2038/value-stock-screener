"""
send_daily_digest.py — runs every weekday at 7am ET.
Morning Brew-style daily email: market regime, top news headlines,
best value stocks, score movers, and a Polymarket snapshot.
"""

import json, os, requests, xml.etree.ElementTree as ET
from datetime import datetime, timezone, date, timedelta
from pathlib import Path

SUPABASE_URL      = os.environ['SUPABASE_URL']
SUPABASE_KEY      = os.environ['SUPABASE_SERVICE_ROLE_KEY']
RESEND_API_KEY    = os.environ['RESEND_API_KEY']
FROM_EMAIL        = os.environ.get('FROM_EMAIL', 'morning@yourdomain.com')
SITE_URL          = 'https://joshuamisir2038.github.io/value-stock-screener'

SB = {
    'apikey':        SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type':  'application/json',
}
BASE = Path(__file__).parent.parent / 'public' / 'data'

# ── Data loaders ──────────────────────────────────────────────────────────────

def load_stocks():
    with open(BASE / 'stocks.json') as f:
        d = json.load(f)
    return d.get('stocks', [])

def load_macro():
    try:
        with open(BASE / 'macro.json') as f: return json.load(f)
    except: return {}

def load_score_history():
    try:
        with open(BASE / 'score_history.json') as f: return json.load(f)
    except: return {}

# ── News fetching ─────────────────────────────────────────────────────────────

RSS_FEEDS = [
    ('Reuters',         'https://feeds.reuters.com/reuters/businessNews'),
    ('BBC Business',    'https://feeds.bbci.co.uk/news/business/rss.xml'),
    ('CNBC',            'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664'),
    ('Guardian Biz',    'https://www.theguardian.com/business/rss'),
]

def fetch_headlines(n=6):
    articles = []
    ns = {'content': 'http://purl.org/rss/1.0/modules/content/'}
    for source, url in RSS_FEEDS:
        try:
            resp = requests.get(url, timeout=8,
                                headers={'User-Agent': 'Aletheia/1.0 digest-bot'})
            root = ET.fromstring(resp.content)
            for item in root.findall('.//item')[:3]:
                title = item.findtext('title', '').strip()
                link  = item.findtext('link', '').strip()
                desc  = item.findtext('description', '').strip()
                # Strip HTML tags from description
                import re
                desc = re.sub(r'<[^>]+>', '', desc)[:200]
                if title and link:
                    articles.append({'source': source, 'title': title,
                                     'link': link, 'desc': desc})
        except Exception as e:
            print(f'  RSS {source} failed: {e}')
    # deduplicate roughly and return top n
    seen, out = set(), []
    for a in articles:
        key = a['title'][:40].lower()
        if key not in seen:
            seen.add(key)
            out.append(a)
        if len(out) >= n:
            break
    return out

# ── Polymarket snapshot ───────────────────────────────────────────────────────

def fetch_polymarket_top(n=3):
    try:
        url  = 'https://gamma-api.polymarket.com/markets?limit=10&active=true&closed=false&order=volume24hr&ascending=false'
        data = requests.get(url, timeout=8).json()
        markets = []
        for m in (data if isinstance(data, list) else [])[:n]:
            prob = None
            try:
                prices = json.loads(m.get('outcomePrices', '[]'))
                prob = round(float(prices[0]) * 100) if prices else None
            except: pass
            markets.append({
                'question': m.get('question', ''),
                'prob':     prob,
                'volume':   float(m.get('volume24hr', 0) or 0),
                'url':      f"https://polymarket.com/event/{m.get('slug','')}",
            })
        return markets
    except: return []

# ── Market data helpers ───────────────────────────────────────────────────────

def market_summary(macro):
    vix   = macro.get('vix', {}).get('current')
    above = macro.get('spy_regime', {}).get('above_ma50', True)
    regime_icon  = '🟢' if above else '🔴'
    regime_label = 'Bull market — SPY above 50MA' if above else 'Bear market — SPY below 50MA'
    vix_str  = f'{vix:.1f}' if vix else 'N/A'
    vix_feel = 'calm' if vix and vix < 15 else 'elevated' if vix and vix < 25 else 'fearful'
    return regime_icon, regime_label, vix_str, vix_feel

def top_value_stocks(stocks, n=3):
    return sorted(
        [s for s in stocks if s.get('valueScore') is not None],
        key=lambda s: s['valueScore'], reverse=True
    )[:n]

def score_movers(stocks, history, n=3):
    cutoff = (date.today() - timedelta(days=1)).isoformat()
    movers = []
    for s in stocks:
        sym  = s.get('symbol')
        hist = history.get(sym, [])
        prev = next((h for h in reversed(hist) if h['d'] <= cutoff), None)
        if not prev or s.get('valueScore') is None: continue
        change = s['valueScore'] - prev['s']
        if abs(change) >= 3:
            movers.append({**s, 'change': change})
    movers.sort(key=lambda s: abs(s['change']), reverse=True)
    return movers[:n]

# ── HTML builder ──────────────────────────────────────────────────────────────

def score_color(s):
    if s >= 75: return '#30D158'
    if s >= 55: return '#0A84FF'
    if s >= 35: return '#FFD60A'
    return '#FF453A'

def build_html(subscriber, today_str, headlines, top_stocks, movers,
               regime_icon, regime_label, vix_str, vix_feel, poly_markets):
    name = subscriber.get('display_name') or subscriber['email'].split('@')[0].capitalize()

    # News section
    news_html = ''
    for a in headlines:
        news_html += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #1a2640">
            <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px">{a['source']}</div>
            <a href="{a['link']}" style="color:#e2e8f0;font-size:13px;font-weight:bold;
               text-decoration:none;line-height:1.4">{a['title']}</a>
            {'<p style="color:#64748b;font-size:11px;margin:4px 0 0;line-height:1.5">' + a['desc'] + '</p>' if a['desc'] else ''}
          </td>
        </tr>"""

    # Top stocks
    stocks_html = ''
    for i, s in enumerate(top_stocks, 1):
        col = score_color(s['valueScore'])
        ret = s.get('return1y')
        ret_str = f"{'+' if ret >= 0 else ''}{ret:.1f}% 1Y" if ret is not None else ''
        stocks_html += f"""
        <tr style="{'background:#0d1a2e' if i % 2 == 0 else ''}">
          <td style="padding:10px 12px;font-weight:bold;color:#e2e8f0;font-size:13px">{s['symbol']}</td>
          <td style="padding:10px 12px;color:#64748b;font-size:11px">{s.get('name','')[:28]}</td>
          <td style="padding:10px 12px;text-align:right;font-weight:bold;color:{col};font-size:13px">{s['valueScore']}</td>
          <td style="padding:10px 12px;text-align:right;color:#64748b;font-size:11px">{ret_str}</td>
        </tr>"""

    # Movers
    movers_html = ''
    for m in movers:
        arrow = '▲' if m['change'] > 0 else '▼'
        col   = '#30D158' if m['change'] > 0 else '#FF453A'
        movers_html += f"""
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#e2e8f0">{m['symbol']}</td>
          <td style="padding:8px 12px;color:#64748b;font-size:11px">{m.get('name','')[:25]}</td>
          <td style="padding:8px 12px;text-align:right;color:{col};font-weight:bold">
            {arrow} {abs(m['change'])} pts
          </td>
        </tr>"""

    # Polymarket
    poly_html = ''
    for p in poly_markets:
        prob_str = f"{p['prob']}% YES" if p['prob'] is not None else '—'
        prob_col = '#30D158' if p['prob'] and p['prob'] >= 60 else '#FF453A' if p['prob'] and p['prob'] <= 40 else '#FFD60A'
        vol_str  = f"${p['volume']/1e6:.1f}M vol" if p['volume'] >= 1e6 else f"${p['volume']/1e3:.0f}K vol"
        poly_html += f"""
        <tr style="border-bottom:1px solid #1a2640">
          <td style="padding:10px 0">
            <a href="{p['url']}" style="color:#e2e8f0;font-size:12px;font-weight:bold;text-decoration:none">{p['question']}</a>
            <span style="margin-left:8px;color:{prob_col};font-weight:bold;font-size:12px">{prob_str}</span>
            <span style="margin-left:8px;color:#4a6080;font-size:10px">{vol_str}</span>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#060c16;font-family:'IBM Plex Mono',monospace,sans-serif;color:#94a3b8">
<div style="max-width:580px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="border-bottom:2px solid #1a2640;padding-bottom:20px;margin-bottom:28px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.15em">ALETHEIA</div>
        <div style="font-size:10px;color:#4a6080;letter-spacing:0.1em;margin-top:2px">MORNING EDGE</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:12px;color:#64748b">{today_str}</div>
        <div style="font-size:10px;color:#4a6080;margin-top:2px">Daily digest</div>
      </div>
    </div>
  </div>

  <!-- Greeting -->
  <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 28px">
    Good morning, {name}. Here's everything you need to know before the market opens today.
  </p>

  <!-- Market snapshot -->
  <div style="background:#0d1a2e;border:1px solid #1a2640;border-left:3px solid #0a84ff;
              padding:16px 20px;margin-bottom:28px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.1em;margin-bottom:10px">Market Regime</div>
    <div style="font-size:15px;color:#e2e8f0;font-weight:bold">{regime_icon} {regime_label}</div>
    <div style="font-size:11px;color:#64748b;margin-top:6px">
      VIX at <strong style="color:#e2e8f0">{vix_str}</strong> — markets are feeling <em>{vix_feel}</em>.
    </div>
  </div>

  <!-- Headlines -->
  <div style="margin-bottom:32px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.12em;border-bottom:1px solid #1a2640;
                padding-bottom:8px;margin-bottom:4px">📰 In The News</div>
    <table style="width:100%;border-collapse:collapse">
      {news_html}
    </table>
  </div>

  <!-- Top value stocks -->
  <div style="margin-bottom:32px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.12em;border-bottom:1px solid #1a2640;
                padding-bottom:8px;margin-bottom:4px">⭐ Top Value Picks Right Now</div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <thead>
        <tr style="border-bottom:1px solid #1a2640">
          <th style="padding:8px 12px;text-align:left;font-size:9px;color:#4a6080;font-weight:normal;text-transform:uppercase">Ticker</th>
          <th style="padding:8px 12px;text-align:left;font-size:9px;color:#4a6080;font-weight:normal;text-transform:uppercase">Company</th>
          <th style="padding:8px 12px;text-align:right;font-size:9px;color:#4a6080;font-weight:normal;text-transform:uppercase">Score</th>
          <th style="padding:8px 12px;text-align:right;font-size:9px;color:#4a6080;font-weight:normal;text-transform:uppercase">Return</th>
        </tr>
      </thead>
      <tbody>{stocks_html}</tbody>
    </table>
  </div>

  <!-- Score movers -->
  {f'''<div style="margin-bottom:32px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.12em;border-bottom:1px solid #1a2640;
                padding-bottom:8px;margin-bottom:4px">📈 Score Movers (vs yesterday)</div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <tbody>{movers_html}</tbody>
    </table>
  </div>''' if movers_html else ''}

  <!-- Polymarket -->
  {f'''<div style="margin-bottom:32px">
    <div style="font-size:10px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.12em;border-bottom:1px solid #1a2640;
                padding-bottom:8px;margin-bottom:4px">🎯 Prediction Markets</div>
    <table style="width:100%;border-collapse:collapse">
      {poly_html}
    </table>
  </div>''' if poly_html else ''}

  <!-- CTA -->
  <div style="text-align:center;margin:32px 0">
    <a href="{SITE_URL}" style="display:inline-block;background:#0a84ff;color:#fff;
       text-decoration:none;padding:12px 36px;font-size:12px;font-weight:bold;
       letter-spacing:0.1em;text-transform:uppercase">
      Open Aletheia →
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1a2640;padding-top:20px;font-size:10px;
              color:#374151;text-align:center;line-height:1.9">
    Aletheia · Daily Morning Edge<br>
    Sent to {subscriber['email']}<br>
    <a href="{SITE_URL}" style="color:#4a6080">Manage preferences</a> ·
    <a href="{SITE_URL}" style="color:#4a6080">Unsubscribe</a>
  </div>

</div>
</body>
</html>"""

# ── Supabase helpers ──────────────────────────────────────────────────────────

def get_subscribers():
    r = requests.get(f'{SUPABASE_URL}/rest/v1/digest_subscriptions?select=*',
                     headers=SB, timeout=15)
    r.raise_for_status()
    return r.json()

def mark_sent(user_ids):
    if not user_ids: return
    ids = ','.join(f'"{uid}"' for uid in user_ids)
    requests.patch(
        f'{SUPABASE_URL}/rest/v1/digest_subscriptions?user_id=in.({ids})',
        headers={**SB, 'Prefer': 'return=minimal'},
        json={'last_sent_at': datetime.now(timezone.utc).isoformat()},
        timeout=15
    )

def send_batch(emails):
    sent = 0
    for i in range(0, len(emails), 100):
        batch = emails[i:i+100]
        r = requests.post(
            'https://api.resend.com/emails/batch',
            headers={'Authorization': f'Bearer {RESEND_API_KEY}',
                     'Content-Type': 'application/json'},
            json=batch, timeout=30
        )
        if r.status_code in (200, 201):
            sent += len(batch)
            print(f'  Sent batch of {len(batch)}')
        else:
            print(f'  Batch failed: {r.status_code} {r.text[:200]}')
    return sent

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    today_str = datetime.now().strftime('%A, %B %d %Y')
    print(f'Daily digest — {today_str}')

    stocks    = load_stocks()
    macro     = load_macro()
    history   = load_score_history()

    print('Fetching headlines...')
    headlines = fetch_headlines(6)
    print(f'  Got {len(headlines)} headlines')

    print('Fetching Polymarket...')
    poly = fetch_polymarket_top(3)

    top      = top_value_stocks(stocks, 3)
    movers   = score_movers(stocks, history, 3)
    regime_icon, regime_label, vix_str, vix_feel = market_summary(macro)

    subscribers = get_subscribers()
    print(f'Subscribers: {len(subscribers)}')
    if not subscribers:
        print('No subscribers — done.')
        return

    emails = []
    for sub in subscribers:
        html = build_html(sub, today_str, headlines, top, movers,
                          regime_icon, regime_label, vix_str, vix_feel, poly)
        emails.append({
            'from':    FROM_EMAIL,
            'to':      [sub['email']],
            'subject': f'☀️ Your Morning Edge | {datetime.now().strftime("%b %d")}',
            'html':    html,
        })

    sent = send_batch(emails)
    mark_sent([s['user_id'] for s in subscribers])
    print(f'Done — {sent}/{len(emails)} sent.')

if __name__ == '__main__':
    main()
