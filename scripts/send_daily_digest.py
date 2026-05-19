"""
send_daily_digest.py — runs every weekday at 7am ET.
AI-powered daily briefing: Groq scans headlines and writes a sharp market
analysis, followed by top value picks, score movers, and Polymarket snapshot.
Sends to all rows in the `subscribers` table via Resend batch API.
"""

import json, os, re, requests, xml.etree.ElementTree as ET
from datetime import datetime, timezone, date, timedelta
from pathlib import Path

SUPABASE_URL      = os.environ['SUPABASE_URL']
SUPABASE_KEY      = os.environ['SUPABASE_SERVICE_ROLE_KEY']
RESEND_API_KEY    = os.environ['RESEND_API_KEY']
FROM_EMAIL        = os.environ.get('FROM_EMAIL', 'morning@yourdomain.com')
GROQ_API_KEY      = os.environ.get('GROQ_API_KEY', '')
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
    ('FT',              'https://www.ft.com/?format=rss'),
    ('Bloomberg Mktws', 'https://feeds.bloomberg.com/markets/news.rss'),
]

def fetch_headlines(n=8):
    articles = []
    for source, url in RSS_FEEDS:
        try:
            resp = requests.get(url, timeout=8,
                                headers={'User-Agent': 'Aletheia/1.0 digest-bot'})
            root = ET.fromstring(resp.content)
            for item in root.findall('.//item')[:3]:
                title = item.findtext('title', '').strip()
                link  = item.findtext('link', '').strip()
                desc  = item.findtext('description', '').strip()
                desc  = re.sub(r'<[^>]+>', '', desc)[:200]
                if title and link:
                    articles.append({'source': source, 'title': title,
                                     'link': link, 'desc': desc})
        except Exception as e:
            print(f'  RSS {source} failed: {e}')
    seen, out = set(), []
    for a in articles:
        key = a['title'][:40].lower()
        if key not in seen:
            seen.add(key)
            out.append(a)
        if len(out) >= n:
            break
    return out

# ── Polymarket ────────────────────────────────────────────────────────────────

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

# ── AI briefing via Groq ──────────────────────────────────────────────────────

def generate_ai_briefing(headlines, macro, top_stocks, poly_markets):
    if not GROQ_API_KEY:
        print('  No GROQ_API_KEY — skipping AI briefing')
        return None

    vix    = macro.get('vix', {}).get('current')
    above  = macro.get('spy_regime', {}).get('above_ma50', True)
    regime = 'bullish (SPY above 50-day MA)' if above else 'bearish (SPY below 50-day MA)'
    vix_s  = f'{vix:.1f}' if vix else 'unavailable'

    hl_text = '\n'.join(
        f'• [{h["source"]}] {h["title"]}' for h in headlines
    )
    picks = ', '.join(
        f'{s["symbol"]} (value score {s["valueScore"]})' for s in top_stocks[:5]
    )
    poly_text = '\n'.join(
        f'• {p["question"]} — {p["prob"]}% YES' if p["prob"] else f'• {p["question"]}'
        for p in poly_markets
    )

    prompt = f"""You are writing the lead "AI Market Briefing" section of a daily financial newsletter called Aletheia Morning Edge, sent at 7am ET to value investors.

Today's market data:
- Regime: {regime}
- VIX (fear gauge): {vix_s}
- Top value picks today: {picks}

Today's notable headlines:
{hl_text}

Top prediction markets:
{poly_text}

Write a sharp, 4–5 sentence market briefing that:
1. Opens with the single most important theme from today's headlines and its market implication
2. Connects it to the current market regime and volatility level
3. Surfaces one specific insight relevant to value investors (tie to the top picks if relevant)
4. Closes with the key thing to watch before today's close

Rules:
- No bullet points — flowing prose only
- No hedging phrases ("it's worth noting", "it's important to consider", "investors should be aware")
- Write with conviction, like a senior analyst's 7am note
- Be specific — reference actual headlines, numbers, or company names
- Maximum 120 words"""

    try:
        resp = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {GROQ_API_KEY}',
                'Content-Type':  'application/json',
            },
            json={
                'model':       'llama-3.3-70b-versatile',
                'messages':    [{'role': 'user', 'content': prompt}],
                'max_tokens':  220,
                'temperature': 0.65,
            },
            timeout=25,
        )
        if resp.status_code == 200:
            briefing = resp.json()['choices'][0]['message']['content'].strip()
            print(f'  AI briefing generated ({len(briefing)} chars)')
            return briefing
        else:
            print(f'  Groq error {resp.status_code}: {resp.text[:200]}')
    except Exception as e:
        print(f'  Groq briefing failed: {e}')
    return None

# ── Market helpers ────────────────────────────────────────────────────────────

def market_summary(macro):
    vix   = macro.get('vix', {}).get('current')
    above = macro.get('spy_regime', {}).get('above_ma50', True)
    icon  = '🟢' if above else '🔴'
    label = 'Bull market — SPY above 50MA' if above else 'Bear market — SPY below 50MA'
    vix_s = f'{vix:.1f}' if vix else 'N/A'
    feel  = 'calm' if vix and vix < 15 else 'elevated' if vix and vix < 25 else 'fearful'
    return icon, label, vix_s, feel

def top_value_stocks(stocks, n=5):
    return sorted(
        [s for s in stocks if s.get('valueScore') is not None],
        key=lambda s: s['valueScore'], reverse=True
    )[:n]

def score_movers(stocks, history, n=4):
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

def build_html(subscriber, today_str, ai_briefing, headlines, top_stocks,
               movers, regime_icon, regime_label, vix_str, vix_feel, poly_markets):
    email = subscriber['email']
    name  = email.split('@')[0].replace('.', ' ').replace('_', ' ').capitalize()
    token = subscriber.get('unsubscribe_token', '')
    unsub_url = f'{SITE_URL}?unsub={token}'

    # ── AI Briefing ────────────────────────────────────────────────────────────
    ai_section = ''
    if ai_briefing:
        ai_section = f"""
  <!-- AI Briefing -->
  <div style="background:#100820;border:1px solid #2d1b69;border-left:3px solid #a855f7;
              padding:18px 20px;margin-bottom:28px">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px">
      <span style="font-size:12px">✦</span>
      <div style="font-size:10px;color:#9333ea;text-transform:uppercase;
                  letter-spacing:0.12em;font-weight:bold">AI Market Briefing</div>
    </div>
    <p style="color:#e2e8f0;font-size:13.5px;line-height:1.8;margin:0 0 10px">{ai_briefing}</p>
    <div style="font-size:9px;color:#4a3a6e;margin-top:4px">
      Generated by Llama 3.3 70B · Informational only · Not investment advice
    </div>
  </div>"""

    # ── Headlines ──────────────────────────────────────────────────────────────
    news_rows = ''
    for a in headlines[:6]:
        news_rows += f"""
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #1a2640">
            <div style="font-size:9px;color:#4a6080;text-transform:uppercase;
                        letter-spacing:0.08em;margin-bottom:4px">{a['source']}</div>
            <a href="{a['link']}" style="color:#e2e8f0;font-size:13px;font-weight:bold;
               text-decoration:none;line-height:1.4">{a['title']}</a>
            {'<p style="color:#64748b;font-size:11px;margin:4px 0 0;line-height:1.5">' + a['desc'] + '</p>' if a['desc'] else ''}
          </td>
        </tr>"""

    # ── Top stocks ─────────────────────────────────────────────────────────────
    stock_rows = ''
    for i, s in enumerate(top_stocks, 1):
        col = score_color(s['valueScore'])
        ret = s.get('return1y')
        ret_s = f"{'+' if ret >= 0 else ''}{ret:.1f}% 1Y" if ret is not None else ''
        pe  = s.get('forwardPE') or s.get('peRatio')
        pe_s = f"P/E {pe:.1f}x" if pe else ''
        stock_rows += f"""
        <tr style="{'background:#0d1a2e' if i % 2 == 0 else ''}">
          <td style="padding:9px 12px;font-weight:bold;color:#e2e8f0;font-size:13px">{s['symbol']}</td>
          <td style="padding:9px 12px;color:#64748b;font-size:11px">{s.get('name','')[:26]}</td>
          <td style="padding:9px 12px;color:#4a6080;font-size:10px">{pe_s}</td>
          <td style="padding:9px 12px;text-align:right;font-weight:bold;color:{col};font-size:14px">{s['valueScore']}</td>
          <td style="padding:9px 12px;text-align:right;color:#64748b;font-size:10px">{ret_s}</td>
        </tr>"""

    # ── Movers ────────────────────────────────────────────────────────────────
    mover_rows = ''
    for m in movers:
        arrow = '▲' if m['change'] > 0 else '▼'
        col   = '#30D158' if m['change'] > 0 else '#FF453A'
        mover_rows += f"""
        <tr>
          <td style="padding:8px 12px;font-weight:bold;color:#e2e8f0">{m['symbol']}</td>
          <td style="padding:8px 12px;color:#64748b;font-size:11px">{m.get('name','')[:24]}</td>
          <td style="padding:8px 12px;text-align:right;color:{col};font-weight:bold">
            {arrow} {abs(m['change'])} pts
          </td>
        </tr>"""

    # ── Polymarket ────────────────────────────────────────────────────────────
    poly_rows = ''
    for p in poly_markets:
        prob_s = f"{p['prob']}% YES" if p['prob'] is not None else '—'
        prob_c = '#30D158' if p['prob'] and p['prob'] >= 60 else '#FF453A' if p['prob'] and p['prob'] <= 40 else '#FFD60A'
        vol_s  = f"${p['volume']/1e6:.1f}M vol" if p['volume'] >= 1e6 else f"${p['volume']/1e3:.0f}K vol"
        poly_rows += f"""
        <tr style="border-bottom:1px solid #1a2640">
          <td style="padding:10px 0">
            <a href="{p['url']}" style="color:#e2e8f0;font-size:12px;font-weight:bold;
               text-decoration:none">{p['question']}</a>
            <span style="margin-left:8px;color:{prob_c};font-weight:bold;font-size:12px">{prob_s}</span>
            <span style="margin-left:8px;color:#4a6080;font-size:10px">{vol_s}</span>
          </td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Aletheia Morning Edge</title>
</head>
<body style="margin:0;padding:0;background:#060c16;font-family:'IBM Plex Mono',ui-monospace,monospace,sans-serif;color:#94a3b8">
<div style="max-width:600px;margin:0 auto;padding:32px 16px">

  <!-- Header -->
  <div style="border-bottom:2px solid #1a2640;padding-bottom:18px;margin-bottom:26px">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td>
          <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:0.15em">ALETHEIA</div>
          <div style="font-size:9px;color:#4a6080;letter-spacing:0.12em;margin-top:3px">MORNING EDGE · TRUTH IN DATA</div>
        </td>
        <td style="text-align:right;vertical-align:top">
          <div style="font-size:11px;color:#64748b">{today_str}</div>
          <div style="font-size:9px;color:#4a6080;margin-top:2px">Daily AI Briefing</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Greeting -->
  <p style="color:#94a3b8;font-size:13px;line-height:1.7;margin:0 0 24px">
    Good morning, {name}. Here's your AI-powered market briefing before the open.
  </p>

  {ai_section}

  <!-- Market snapshot -->
  <div style="background:#0d1a2e;border:1px solid #1a2640;border-left:3px solid #0a84ff;
              padding:14px 18px;margin-bottom:28px">
    <div style="font-size:9px;color:#4a6080;text-transform:uppercase;
                letter-spacing:0.1em;margin-bottom:8px">Market Regime</div>
    <div style="font-size:14px;color:#e2e8f0;font-weight:bold">{regime_icon} {regime_label}</div>
    <div style="font-size:11px;color:#64748b;margin-top:5px">
      VIX at <strong style="color:#e2e8f0">{vix_str}</strong> — markets are feeling <em>{vix_feel}</em>
    </div>
  </div>

  <!-- Headlines -->
  <div style="margin-bottom:32px">
    <div style="font-size:9px;color:#4a6080;text-transform:uppercase;letter-spacing:0.12em;
                border-bottom:1px solid #1a2640;padding-bottom:8px;margin-bottom:4px">
      📰 In The News
    </div>
    <table style="width:100%;border-collapse:collapse">{news_rows}</table>
  </div>

  <!-- Top value stocks -->
  <div style="margin-bottom:32px">
    <div style="font-size:9px;color:#4a6080;text-transform:uppercase;letter-spacing:0.12em;
                border-bottom:1px solid #1a2640;padding-bottom:8px;margin-bottom:4px">
      ⭐ Top Value Picks Right Now
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <thead>
        <tr style="border-bottom:1px solid #1a2640">
          <th style="padding:7px 12px;text-align:left;font-size:8px;color:#4a6080;font-weight:normal;text-transform:uppercase">Ticker</th>
          <th style="padding:7px 12px;text-align:left;font-size:8px;color:#4a6080;font-weight:normal;text-transform:uppercase">Company</th>
          <th style="padding:7px 12px;text-align:left;font-size:8px;color:#4a6080;font-weight:normal;text-transform:uppercase">Val.</th>
          <th style="padding:7px 12px;text-align:right;font-size:8px;color:#4a6080;font-weight:normal;text-transform:uppercase">Score</th>
          <th style="padding:7px 12px;text-align:right;font-size:8px;color:#4a6080;font-weight:normal;text-transform:uppercase">1Y Ret.</th>
        </tr>
      </thead>
      <tbody>{stock_rows}</tbody>
    </table>
  </div>

  <!-- Score movers -->
  {f'''<div style="margin-bottom:32px">
    <div style="font-size:9px;color:#4a6080;text-transform:uppercase;letter-spacing:0.12em;
                border-bottom:1px solid #1a2640;padding-bottom:8px;margin-bottom:4px">
      📈 Score Movers (vs yesterday)
    </div>
    <table style="width:100%;border-collapse:collapse;background:#0d1a2e;border:1px solid #1a2640">
      <tbody>{mover_rows}</tbody>
    </table>
  </div>''' if mover_rows else ''}

  <!-- Prediction markets -->
  {f'''<div style="margin-bottom:32px">
    <div style="font-size:9px;color:#4a6080;text-transform:uppercase;letter-spacing:0.12em;
                border-bottom:1px solid #1a2640;padding-bottom:8px;margin-bottom:4px">
      🎯 Prediction Markets
    </div>
    <table style="width:100%;border-collapse:collapse">{poly_rows}</table>
  </div>''' if poly_rows else ''}

  <!-- CTA -->
  <div style="text-align:center;margin:32px 0">
    <a href="{SITE_URL}" style="display:inline-block;background:#0a84ff;color:#fff;
       text-decoration:none;padding:12px 40px;font-size:11px;font-weight:bold;
       letter-spacing:0.12em;text-transform:uppercase">
      Open Aletheia →
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1a2640;padding-top:18px;font-size:10px;
              color:#374151;text-align:center;line-height:2">
    Aletheia · Morning Edge<br>
    Sent to {email}<br>
    <a href="{unsub_url}" style="color:#4a6080;text-decoration:none">Unsubscribe</a>
    &nbsp;·&nbsp;
    <a href="{SITE_URL}" style="color:#4a6080;text-decoration:none">Open Aletheia</a>
  </div>

</div>
</body>
</html>"""

# ── Supabase helpers ──────────────────────────────────────────────────────────

def get_subscribers():
    """Fetch all confirmed subscribers from the subscribers table."""
    r = requests.get(
        f'{SUPABASE_URL}/rest/v1/subscribers'
        '?select=email,unsubscribe_token,last_sent_at'
        '&confirmed=eq.true'
        '&order=subscribed_at.asc',
        headers=SB, timeout=15,
    )
    if not r.ok:
        print(f'  subscribers table error {r.status_code}: {r.text[:200]}')
        return []
    return r.json()

def mark_sent(emails):
    if not emails: return
    # Update last_sent_at for all addresses just emailed
    for addr in emails:
        requests.patch(
            f'{SUPABASE_URL}/rest/v1/subscribers?email=eq.{requests.utils.quote(addr)}',
            headers={**SB, 'Prefer': 'return=minimal'},
            json={'last_sent_at': datetime.now(timezone.utc).isoformat()},
            timeout=10,
        )

def send_batch(emails):
    sent = 0
    for i in range(0, len(emails), 100):
        batch = emails[i:i + 100]
        r = requests.post(
            'https://api.resend.com/emails/batch',
            headers={'Authorization': f'Bearer {RESEND_API_KEY}',
                     'Content-Type':  'application/json'},
            json=batch, timeout=30,
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
    print(f'Aletheia Morning Digest — {today_str}')

    stocks  = load_stocks()
    macro   = load_macro()
    history = load_score_history()

    print('Fetching headlines...')
    headlines = fetch_headlines(8)
    print(f'  {len(headlines)} headlines')

    print('Fetching Polymarket...')
    poly = fetch_polymarket_top(3)

    top    = top_value_stocks(stocks, 5)
    movers = score_movers(stocks, history, 4)
    regime_icon, regime_label, vix_str, vix_feel = market_summary(macro)

    print('Generating AI briefing...')
    ai_briefing = generate_ai_briefing(headlines, macro, top, poly)

    print('Fetching subscribers...')
    subscribers = get_subscribers()
    print(f'  {len(subscribers)} subscriber(s)')
    if not subscribers:
        print('No subscribers — done.')
        return

    emails = []
    for sub in subscribers:
        html = build_html(
            sub, today_str, ai_briefing, headlines, top, movers,
            regime_icon, regime_label, vix_str, vix_feel, poly,
        )
        emails.append({
            'from':    FROM_EMAIL,
            'to':      [sub['email']],
            'subject': f'✦ Morning Edge | {datetime.now().strftime("%b %d")} | {headline_subject(headlines, ai_briefing)}',
            'html':    html,
        })

    sent = send_batch(emails)
    mark_sent([s['email'] for s in subscribers])
    print(f'Done — {sent}/{len(emails)} sent.')

def headline_subject(headlines, ai_briefing):
    """Pick a punchy subject line from the top headline or AI briefing."""
    if ai_briefing:
        # Use the first sentence of the AI briefing, trimmed to 60 chars
        first = ai_briefing.split('.')[0].strip()
        if len(first) <= 60:
            return first
    if headlines:
        t = headlines[0]['title']
        return t[:60] + ('…' if len(t) > 60 else '')
    return 'Your daily market briefing'

if __name__ == '__main__':
    main()
