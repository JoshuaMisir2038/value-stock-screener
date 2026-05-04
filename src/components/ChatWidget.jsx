import { useState, useRef, useEffect, useCallback } from 'react'
import { MessageSquare, X, Send, RotateCcw, ChevronDown, Bot } from 'lucide-react'

// ── Config ────────────────────────────────────────────────────────────────────

const WORKER_URL = 'https://small-resonance-5e82.misirjosh.workers.dev'

// ── System prompt factory ─────────────────────────────────────────────────────

function buildSystem(stocks) {
  const date   = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const count  = stocks?.length ?? 0

  const scoringBlurb = `
VALUE SCORE (0–100): Weighted percentile rank across 9 metrics vs the entire ~${count}-stock universe.
  Weights: EV/EBITDA 20pt · P/FCF 18pt · P/E 15pt · P/S 12pt · P/B 8pt · EV/Revenue 7pt ·
           Debt/Equity 8pt · Gross Margin 6pt · FCF Margin 6pt
  Lower multiples score better for valuation metrics; higher margins score better for quality metrics.
  SECTOR SCORE: same logic but ranked only within the stock's GICS sector.
`.trim()

  return `You are the AI assistant for Aletheia — a stock research dashboard (ἀλήθεια: Greek for "unconcealment of truth") that screens ~${count} US-listed stocks using a composite value score. Today is ${date}.

${scoringBlurb}

TABS IN THE APP: Value Screener · Options Ideas · Bonds · Commodities · Score Backtest ·
Options Backtest · Macro · Hacker News · Global News · GitHub Trending ·
Custom Screener · Custom Backtest · DCF Calculator · Education

RULES:
- Answer concisely but completely. Use the exact metric values when provided in context.
- When explaining a value score, always reference the specific metrics that drove it high or low.
- You can compare stocks if the user provides multiple tickers.
- If asked for investment advice, note you are a research tool, not a licensed advisor.
- Keep answers under ~250 words unless the question genuinely requires more depth.
- Use plain text — no markdown headers, no bullet asterisks (use · instead).`.trim()
}

// ── Context injection — pull the named stocks out of the data ────────────────

function extractTickerMentions(text) {
  // Match explicit tickers (2–5 uppercase letters) and common company name fragments
  const explicit = [...text.matchAll(/\b([A-Z]{1,5})\b/g)].map(m => m[1])
  return [...new Set(explicit)]
}

function buildStockContext(userText, stocks) {
  if (!stocks || stocks.length === 0) return ''
  const mentions = extractTickerMentions(userText)
  const lower    = userText.toLowerCase()

  const matches = stocks.filter(s => {
    if (mentions.includes(s.symbol)) return true
    if (s.name && lower.includes(s.name.toLowerCase().split(' ')[0].toLowerCase()) && s.name.split(' ')[0].length > 3) return true
    return false
  }).slice(0, 5) // cap at 5 stocks to stay within context budget

  if (matches.length === 0) return ''

  const lines = matches.map(s => {
    const fmt = (v, d = 1) => v != null && !isNaN(v) ? Number(v).toFixed(d) : 'N/A'
    const pct  = v => v != null ? `${(v * 100).toFixed(1)}%` : 'N/A'
    return [
      `STOCK: ${s.symbol} — ${s.name ?? ''} | Sector: ${s.sector ?? 'N/A'}`,
      `  Value Score: ${s.valueScore ?? 'N/A'}/100  Sector Score: ${s.sectorScore ?? 'N/A'}/100`,
      `  Price: $${fmt(s.price, 2)}  Market Cap: ${s.marketCap ? '$' + (s.marketCap / 1e9).toFixed(1) + 'B' : 'N/A'}`,
      `  EV/EBITDA: ${fmt(s.evEbitda)}  P/E: ${fmt(s.peRatio)}  Fwd P/E: ${fmt(s.forwardPE)}`,
      `  P/FCF: ${fmt(s.pFcf)}  P/S: ${fmt(s.psRatio)}  P/B: ${fmt(s.pbRatio)}  EV/Rev: ${fmt(s.evRevenue)}`,
      `  Gross Margin: ${pct(s.grossMargin)}  Op Margin: ${pct(s.operatingMargin)}  FCF Margin: ${pct(s.fcfMargin)}`,
      `  Rev Growth: ${pct(s.revenueGrowth)}  EPS Growth: ${pct(s.earningsGrowth)}  Rule of 40: ${fmt(s.ruleOf40)}`,
      `  Debt/Equity: ${fmt(s.debtEquity)}  Net Debt/EBITDA: ${fmt(s.netDebtEbitda)}  Current Ratio: ${fmt(s.currentRatio)}`,
      `  RSI: ${fmt(s.rsi)}  Above 200MA: ${s.aboveMa200 ? 'Yes' : 'No'}  Golden Cross: ${s.goldenCross ? 'Yes' : 'No'}`,
      `  1M: ${fmt(s.return1m)}%  3M: ${fmt(s.return3m)}%  1Y: ${fmt(s.return1y)}%`,
    ].join('\n')
  })

  return '\n\nLIVE STOCK DATA:\n' + lines.join('\n\n')
}

// ── SSE streaming parser ──────────────────────────────────────────────────────

async function* streamResponse(response) {
  const reader  = response.body.getReader()
  const decoder = new TextDecoder()
  let   buffer  = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        const delta  = parsed?.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // ignore malformed SSE lines
      }
    }
  }
}

// ── Message bubble ────────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
          <Bot size={11} className="text-blue-400" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-3 py-2 text-[12px] leading-relaxed rounded ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'
        }`}
      >
        {msg.content}
        {msg.streaming && (
          <span className="inline-block w-1.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}

// ── Suggested prompts ─────────────────────────────────────────────────────────

const SUGGESTIONS = [
  'Why does Microsoft have such a high value score?',
  'What does EV/EBITDA actually measure?',
  'Explain the difference between P/E and P/FCF',
  'What makes a good sell put candidate?',
  'Compare AAPL and GOOGL',
  'Why would a stock have a low score despite strong earnings growth?',
]

// ── Main widget ───────────────────────────────────────────────────────────────

export default function ChatWidget({ stocks }) {
  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [messages, setMessages] = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)
  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const abortRef   = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120)
  }, [open])

  const sendMessage = useCallback(async (text) => {
    const userText = (text ?? input).trim()
    if (!userText || loading) return

    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: userText }
    const history = [...messages, userMsg]
    setMessages(history)
    setLoading(true)

    // Build context
    const stockContext = buildStockContext(userText, stocks)
    const system       = buildSystem(stocks) + stockContext

    // API messages (last 10 turns to keep context window bounded)
    const apiMessages = history.slice(-10).map(m => ({ role: m.role, content: m.content }))

    // Placeholder streaming message
    const assistantIdx = history.length
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }])

    try {
      abortRef.current = new AbortController()
      const resp = await fetch(WORKER_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
        body:    JSON.stringify({ messages: apiMessages, system }),
      })

      if (!resp.ok) {
        throw new Error(`API error ${resp.status}`)
      }

      let accumulated = ''
      for await (const chunk of streamResponse(resp)) {
        accumulated += chunk
        setMessages(prev => {
          const next = [...prev]
          next[assistantIdx] = { role: 'assistant', content: accumulated, streaming: true }
          return next
        })
      }

      // Finalise — remove streaming cursor
      setMessages(prev => {
        const next = [...prev]
        next[assistantIdx] = { role: 'assistant', content: accumulated, streaming: false }
        return next
      })
    } catch (err) {
      if (err.name === 'AbortError') return
      setError('Something went wrong. Check your connection and try again.')
      setMessages(prev => prev.slice(0, -1)) // remove empty assistant bubble
    } finally {
      setLoading(false)
    }
  }, [input, messages, loading, stocks])

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setLoading(false)
  }

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ width: 52, height: 52 }}
          title="Ask AI"
        >
          <MessageSquare size={20} />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col bg-gray-950 border border-gray-700 shadow-2xl shadow-black/60"
          style={{ width: 380, height: 560 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                <Bot size={12} className="text-blue-400" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-white tracking-widest uppercase">Aletheia AI</div>
                <div className="text-[9px] text-gray-600">Powered by Llama 3.3 · {stocks?.length ?? 0} stocks loaded</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={reset}
                  className="text-gray-600 hover:text-gray-400 transition-colors"
                  title="New conversation"
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-gray-600 hover:text-gray-400 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-600 text-center pt-2">
                  Ask anything about the stocks, metrics, or strategies in this screener.
                </p>
                <div className="space-y-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left px-3 py-2 text-[11px] text-gray-500 border border-gray-800 hover:border-gray-700 hover:text-gray-300 hover:bg-gray-900/50 transition-colors rounded"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}

            {error && (
              <div className="text-[11px] text-red-400 border border-red-500/30 bg-red-500/5 px-3 py-2 rounded">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-gray-800 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about any stock or metric..."
                rows={1}
                className="flex-1 bg-gray-900 border border-gray-800 text-gray-200 text-[12px] px-3 py-2 focus:outline-none focus:border-gray-600 resize-none leading-relaxed rounded"
                style={{ minHeight: 36, maxHeight: 100 }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                }}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-9 h-9 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded transition-colors shrink-0"
              >
                <Send size={13} />
              </button>
            </div>
            <div className="text-[9px] text-gray-800 mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      )}
    </>
  )
}
