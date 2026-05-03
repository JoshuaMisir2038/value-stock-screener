/**
 * Value Finder AI Chat — Cloudflare Worker
 *
 * Proxies requests to the Groq API so the key never reaches the browser.
 *
 * Setup:
 *   1. Create a new Worker in the Cloudflare dashboard (Workers & Pages → Create)
 *   2. Paste this entire file into the editor and click Deploy
 *   3. Go to Settings → Variables → Add a secret named GROQ_API_KEY
 *      (get a free key at console.groq.com)
 *   4. Confirm ALLOWED_ORIGIN below matches your GitHub Pages URL
 *   5. (Optional) Enable Cloudflare Rate Limiting in the dashboard for extra protection
 */

const ALLOWED_ORIGIN = 'https://joshuamisir2038.github.io'
const GROQ_API       = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL          = 'llama-3.3-70b-versatile'
const MAX_TOKENS     = 1024

// ── CORS headers ─────────────────────────────────────────────────────────────

function corsHeaders(origin) {
  const allowed = origin === ALLOWED_ORIGIN || origin?.startsWith('http://localhost')
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? ''

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) })
    }

    // Parse body
    let body
    try {
      body = await request.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    const { messages, system } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Groq uses OpenAI format: system prompt goes as first message with role "system"
    const groqMessages = [
      ...(system ? [{ role: 'system', content: String(system).slice(0, 12000) }] : []),
      ...messages.map(m => ({
        role:    m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 8000),
      })),
    ]

    // Call Groq with streaming
    const groqResp = await fetch(GROQ_API, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: MAX_TOKENS,
        stream:     true,
        messages:   groqMessages,
      }),
    })

    if (!groqResp.ok) {
      const err = await groqResp.text()
      return new Response(JSON.stringify({ error: err }), {
        status: groqResp.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      })
    }

    // Stream the SSE response straight back to the browser
    return new Response(groqResp.body, {
      status:  200,
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'X-Accel-Buffering': 'no',
        ...corsHeaders(origin),
      },
    })
  },
}
