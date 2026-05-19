import { useState, useRef, useMemo } from 'react'
import { FileSearch, Loader2, AlertTriangle, ExternalLink, ChevronDown, ChevronUp, Sparkles, RefreshCw } from 'lucide-react'

const WORKER_URL = 'https://small-resonance-5e82.misirjosh.workers.dev'
const PROXY      = url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`

function timeout(p, ms) {
  return Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))])
}

// ── EDGAR helpers ─────────────────────────────────────────────────────────────

let _tickerMapCache = null

async function getCIK(ticker) {
  if (!_tickerMapCache) {
    const res = await timeout(
      fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': 'Aletheia/1.0 contact@aletheia.app' },
      }).then(r => r.json()),
      15000
    )
    _tickerMapCache = res
  }
  const entry = Object.values(_tickerMapCache).find(
    e => e.ticker?.toUpperCase() === ticker.toUpperCase()
  )
  if (!entry) throw new Error(`Ticker "${ticker}" not found in SEC EDGAR`)
  return String(entry.cik_str).padStart(10, '0')
}

async function getLatest10K(paddedCik) {
  const sub = await timeout(
    fetch(`https://data.sec.gov/submissions/CIK${paddedCik}.json`, {
      headers: { 'User-Agent': 'Aletheia/1.0 contact@aletheia.app' },
    }).then(r => r.json()),
    12000
  )

  const forms   = sub.filings.recent.form
  const accNums = sub.filings.recent.accessionNumber
  const dates   = sub.filings.recent.filingDate
  const idx     = forms.findIndex(f => f === '10-K')
  if (idx === -1) throw new Error('No 10-K filing found for this company')

  const companyName = sub.name
  const accession   = accNums[idx]
  const filingDate  = dates[idx]
  const accPath     = accession.replace(/-/g, '')
  const cikInt      = parseInt(paddedCik, 10)

  return { companyName, accession, filingDate, accPath, cikInt }
}

async function getFilingDoc(cikInt, accPath) {
  const indexUrl  = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accPath}/index.json`
  const indexData = await timeout(
    fetch(PROXY(indexUrl), {
      headers: { 'User-Agent': 'Aletheia/1.0 contact@aletheia.app' },
    }).then(r => r.json()),
    12000
  )

  const items = indexData.directory?.item ?? []

  // Prefer the primary HTM/HTML document (usually the full 10-K)
  const primary = items.find(f => {
    const n = f.name.toLowerCase()
    return (n.endsWith('.htm') || n.endsWith('.html')) &&
      !n.includes('ex') && !n.includes('exhibit') && !n.includes('r2') &&
      (n.includes('10k') || n.includes('10-k') || n.includes('annual') || f.type === '10-K')
  }) ?? items.find(f => {
    const n = f.name.toLowerCase()
    return (n.endsWith('.htm') || n.endsWith('.html')) && !n.includes('ex')
  }) ?? items.find(f => f.name.toLowerCase().endsWith('.htm'))

  if (!primary) throw new Error('Could not locate the 10-K document in this filing')

  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accPath}/${primary.name}`
  const html   = await timeout(
    fetch(PROXY(docUrl), {
      headers: { 'User-Agent': 'Aletheia/1.0 contact@aletheia.app' },
    }).then(r => r.text()),
    20000
  )

  return { html, docUrl }
}

// ── Section extraction ────────────────────────────────────────────────────────

function extractSections(html) {
  const parser  = new DOMParser()
  const doc     = parser.parseFromString(html, 'text/html')
  // Strip scripts, styles, tables of contents
  doc.querySelectorAll('script, style, head').forEach(el => el.remove())
  const text = (doc.body?.innerText ?? doc.body?.textContent ?? '').replace(/\s+/g, ' ')

  // Locate section markers — 10-Ks use various spacing/punctuation conventions
  const marker = (pattern) => {
    const m = text.search(new RegExp(pattern, 'i'))
    return m >= 0 ? m : null
  }

  const starts = {
    item1:  marker('item\\s*1[^a-z0-9].*?business'),
    item1a: marker('item\\s*1a[^a-z0-9].*?risk\\s*factors'),
    item1b: marker('item\\s*1b[^a-z0-9]'),
    item2:  marker('item\\s*2[^a-z0-9]'),
    item7:  marker('item\\s*7[^a-z0-9].*?management'),
    item8:  marker('item\\s*8[^a-z0-9]'),
  }

  function slice(from, toKeys, maxLen) {
    if (from === null) return null
    const end = toKeys.map(k => starts[k]).filter(v => v !== null && v > from)
    const stop = end.length ? Math.min(...end) : from + maxLen
    return text.slice(from, stop).slice(0, maxLen).trim()
  }

  const business     = slice(starts.item1,  ['item1a', 'item2'], 3500)
  const riskFactors  = slice(starts.item1a, ['item1b', 'item2'], 4000)
  const mda          = slice(starts.item7,  ['item8'],           3000)

  return { business, riskFactors, mda }
}

// ── AI streaming ──────────────────────────────────────────────────────────────

function buildPrompt(symbol, companyName, sections) {
  const parts = []
  if (sections.business)
    parts.push(`=== ITEM 1 — BUSINESS ===\n${sections.business}`)
  if (sections.riskFactors)
    parts.push(`=== ITEM 1A — RISK FACTORS ===\n${sections.riskFactors}`)
  if (sections.mda)
    parts.push(`=== ITEM 7 — MD&A (EXCERPT) ===\n${sections.mda}`)

  return `You are a senior equity analyst reviewing the latest 10-K annual report for ${symbol} (${companyName}).

Based only on the extracted 10-K sections below, write a concise structured report with exactly these six sections:

**BUSINESS MODEL**
[2-3 sentences: what the company does, how it makes money, who its customers are]

**COMPETITIVE MOAT**
[1-2 sentences: what protects this business from competitors — network effects, switching costs, brand, scale, IP, etc.]

**TOP RISKS** (from Risk Factors)
• [Most material risk, one sentence]
• [Second risk, one sentence]
• [Third risk, one sentence]
• [Fourth risk if significant, one sentence]

**FINANCIAL TRENDS** (from MD&A if present)
[2-3 sentences on revenue growth, margin direction, and cash generation trends]

**BULL CASE**
[1-2 sentences: the scenario where this business meaningfully outperforms]

**BEAR CASE**
[1-2 sentences: the main scenario where this goes wrong]

Be specific — reference actual products, markets, and numbers from the text. Avoid generic statements.

---

${parts.join('\n\n')}`
}

async function streamAnalysis(symbol, companyName, sections, onChunk, onDone, onError) {
  try {
    const prompt = buildPrompt(symbol, companyName, sections)
    const resp = await fetch(WORKER_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!resp.ok) throw new Error(`Worker error ${resp.status}`)

    const reader  = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') { onDone(); return }
        try {
          const token = JSON.parse(payload).choices?.[0]?.delta?.content
          if (token) onChunk(token)
        } catch { /* skip malformed */ }
      }
    }
    onDone()
  } catch (e) {
    onError(e.message)
  }
}

// ── Render helpers ────────────────────────────────────────────────────────────

function AnalysisText({ text }) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="block text-white text-[11px] tracking-wider uppercase mt-4 mb-1 first:mt-0">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return (
      <span key={i} className="text-gray-300 text-[12px] leading-relaxed whitespace-pre-wrap">
        {part}
      </span>
    )
  })
}

function SectionPreview({ title, text, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!text) return null
  return (
    <div className="border border-gray-800 mb-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-900/40 transition-colors"
      >
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">{text.length.toLocaleString()} chars extracted</span>
          {open ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-800">
          <p className="text-[11px] text-gray-500 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
            {text.slice(0, 2000)}{text.length > 2000 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TenKAnalyzerTab({ stocks }) {
  const [query,       setQuery]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selected,    setSelected]    = useState(null)   // { symbol, name }

  const [fetchStatus, setFetchStatus] = useState(null)   // null | 'loading' | 'done' | 'error'
  const [fetchError,  setFetchError]  = useState(null)
  const [filing,      setFiling]      = useState(null)   // { companyName, filingDate, docUrl, accession }
  const [sections,    setSections]    = useState(null)   // { business, riskFactors, mda }

  const [aiStatus,    setAiStatus]    = useState(null)   // null | 'loading' | 'done' | 'error'
  const [aiText,      setAiText]      = useState('')
  const [aiError,     setAiError]     = useState(null)

  const inputRef = useRef(null)

  // Autocomplete from screener universe
  const stockMap = useMemo(() => {
    const m = {}
    for (const s of stocks) m[s.symbol] = s.name
    return m
  }, [stocks])

  function onInput(val) {
    setQuery(val)
    setSelected(null)
    setSections(null)
    setFiling(null)
    setAiText('')
    setFetchStatus(null)
    setAiStatus(null)
    if (val.length < 1) { setSuggestions([]); return }
    const q = val.toUpperCase()
    const hits = stocks
      .filter(s => s.symbol.startsWith(q) || s.name?.toUpperCase().includes(q))
      .slice(0, 8)
    setSuggestions(hits)
  }

  function pick(stock) {
    setQuery(stock.symbol)
    setSelected({ symbol: stock.symbol, name: stock.name })
    setSuggestions([])
  }

  async function handleFetch() {
    const sym = (selected?.symbol ?? query).trim().toUpperCase()
    if (!sym) return
    setFetchStatus('loading')
    setFetchError(null)
    setSections(null)
    setFiling(null)
    setAiText('')
    setAiStatus(null)

    try {
      const paddedCik               = await getCIK(sym)
      const { companyName, accession, filingDate, accPath, cikInt } = await getLatest10K(paddedCik)
      const { html, docUrl }        = await getFilingDoc(cikInt, accPath)
      const extracted               = extractSections(html)

      if (!extracted.business && !extracted.riskFactors) {
        throw new Error('Could not extract Business or Risk Factor sections from this filing. The document may use an unsupported format.')
      }

      setFiling({ companyName, filingDate, docUrl, accession })
      setSections(extracted)
      setFetchStatus('done')
    } catch (e) {
      setFetchError(e.message)
      setFetchStatus('error')
    }
  }

  function handleAnalyze() {
    const sym = (selected?.symbol ?? query).trim().toUpperCase()
    if (!sections || !filing) return
    setAiStatus('loading')
    setAiError(null)
    setAiText('')
    streamAnalysis(
      sym,
      filing.companyName,
      sections,
      token => setAiText(prev => prev + token),
      ()    => setAiStatus('done'),
      msg   => { setAiError(msg); setAiStatus('error') },
    )
  }

  function reset() {
    setQuery(''); setSelected(null); setSuggestions([])
    setFetchStatus(null); setFetchError(null)
    setFiling(null); setSections(null)
    setAiStatus(null); setAiText(''); setAiError(null)
    inputRef.current?.focus()
  }

  const sym = (selected?.symbol ?? query).trim().toUpperCase()

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSearch size={13} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">10-K Analyzer</h2>
          </div>
          <p className="text-[11px] text-gray-500">
            Fetches the latest annual report from SEC EDGAR · AI extracts business model, risks, and moat
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              value={query}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sym && handleFetch()}
              placeholder="Ticker or company name (e.g. AAPL, NVDA, Microsoft…)"
              className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm px-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-600"
            />
            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 bg-gray-900 border border-gray-700 border-t-0 max-h-60 overflow-y-auto">
                {suggestions.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => pick(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors border-b border-gray-800/60 last:border-0 flex items-center gap-3"
                  >
                    <span className="text-white font-bold text-sm w-16 shrink-0">{s.symbol}</span>
                    <span className="text-gray-400 text-[11px] truncate">{s.name}</span>
                    <span className="text-gray-600 text-[10px] ml-auto shrink-0">{s.sector}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleFetch}
            disabled={!sym || fetchStatus === 'loading'}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-bold tracking-widest uppercase transition-colors flex items-center gap-2 shrink-0"
          >
            {fetchStatus === 'loading'
              ? <><Loader2 size={12} className="animate-spin" /> Fetching…</>
              : <><FileSearch size={12} /> Fetch 10-K</>}
          </button>

          {(filing || fetchStatus === 'error') && (
            <button onClick={reset} className="px-3 py-2.5 border border-gray-700 text-gray-500 hover:text-gray-300 text-[10px] uppercase tracking-wider transition-colors">
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {fetchStatus === 'error' && (
        <div className="flex items-start gap-2 p-4 border border-red-500/30 bg-red-500/5 mb-5">
          <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 text-[12px] font-semibold">Failed to fetch 10-K</p>
            <p className="text-red-400/70 text-[11px] mt-0.5">{fetchError}</p>
          </div>
        </div>
      )}

      {/* Filing info bar */}
      {filing && (
        <div className="flex items-center gap-4 px-4 py-3 bg-gray-900/50 border border-gray-800 mb-5">
          <div>
            <div className="text-white font-bold text-sm">{sym} — {filing.companyName}</div>
            <div className="text-gray-500 text-[10px] mt-0.5">
              Annual Report (10-K) · Filed {filing.filingDate}
            </div>
          </div>
          <a
            href={filing.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors shrink-0"
          >
            View on SEC.gov <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Extracted sections preview */}
      {sections && (
        <div className="mb-5">
          <div className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-bold">Extracted Sections</div>
          <SectionPreview title="Item 1 — Business" text={sections.business} defaultOpen={false} />
          <SectionPreview title="Item 1A — Risk Factors" text={sections.riskFactors} defaultOpen={false} />
          <SectionPreview title="Item 7 — MD&A" text={sections.mda} defaultOpen={false} />
        </div>
      )}

      {/* AI Analysis */}
      {sections && (
        <div className="border border-gray-800">
          {/* AI header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/30">
            <Sparkles size={12} className="text-violet-400" />
            <span className="text-[11px] font-bold text-violet-400 uppercase tracking-widest">AI Analysis</span>
            <span className="text-[10px] text-gray-600">— Groq Llama 3.3 · based on SEC filing only</span>

            {aiStatus !== 'loading' && (
              <button
                onClick={handleAnalyze}
                className={`ml-auto flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase border transition-colors ${
                  aiStatus === 'done'
                    ? 'border-gray-700 text-gray-500 hover:border-violet-500/40 hover:text-violet-400'
                    : 'border-violet-500/60 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
                }`}
              >
                {aiStatus === 'done'
                  ? <><RefreshCw size={10} /> Re-analyze</>
                  : <><Sparkles size={10} /> Analyze Now</>}
              </button>
            )}
            {aiStatus === 'loading' && (
              <div className="ml-auto flex items-center gap-2 text-[10px] text-gray-600">
                <Loader2 size={10} className="animate-spin" /> Analyzing…
              </div>
            )}
          </div>

          {/* AI output */}
          <div className="px-5 py-5">
            {!aiStatus && (
              <div className="py-8 text-center text-gray-600 text-[11px]">
                Click <span className="text-violet-400 font-semibold">Analyze Now</span> to generate the AI report from the 10-K sections above.
              </div>
            )}

            {aiError && (
              <div className="flex items-center gap-2 text-red-400 text-[11px]">
                <AlertTriangle size={12} /> {aiError}
              </div>
            )}

            {aiText && (
              <div className="border-l-2 border-violet-500/30 pl-4">
                <AnalysisText text={aiText} />
                {aiStatus === 'loading' && (
                  <span className="inline-block w-1.5 h-3.5 bg-violet-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            )}

            {aiStatus === 'done' && (
              <p className="text-[9px] text-gray-700 mt-5 border-t border-gray-900 pt-3">
                Generated from SEC EDGAR 10-K filing. For informational purposes only — not investment advice.
                Verify all statements against the source document before acting.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
