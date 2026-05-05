import { useState, useCallback, useRef } from 'react'
import { RefreshCw, AlertTriangle, ExternalLink, Building2, Search, X } from 'lucide-react'

// ── Firm registry ─────────────────────────────────────────────────────────────

const FIRMS = [
  { name: 'Berkshire Hathaway', manager: 'Warren Buffett',  cik: '1067983',  style: 'Value'    },
  { name: 'Pershing Square',    manager: 'Bill Ackman',     cik: '1336528',  style: 'Activist' },
  { name: 'Appaloosa',          manager: 'David Tepper',    cik: '1418814',  style: 'Macro'    },
  { name: 'Scion Asset Mgmt',   manager: 'Michael Burry',   cik: '1649339',  style: 'Value'    },
  { name: 'Third Point',        manager: 'Dan Loeb',         cik: '1499418',  style: 'Activist' },
  { name: 'Baupost Group',      manager: 'Seth Klarman',    cik: '1358805',  style: 'Value'    },
  { name: 'Greenlight Capital', manager: 'David Einhorn',   cik: '1079114',  style: 'Value'    },
  { name: 'Tiger Global',       manager: 'Chase Coleman',   cik: '1167483',  style: 'Growth'   },
  { name: 'Druckenmiller',      manager: 'Stanley Druckenmiller', cik: '1536411', style: 'Macro' },
  { name: 'Viking Global',      manager: 'Andreas Halvorsen',     cik: '1103804', style: 'Growth' },
]

const STYLE_COLORS = {
  Value:    'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  Activist: 'text-orange-400  border-orange-500/30  bg-orange-500/10',
  Macro:    'text-purple-400  border-purple-500/30  bg-purple-500/10',
  Growth:   'text-blue-400    border-blue-500/30    bg-blue-500/10',
}

// ── SEC EDGAR fetching ────────────────────────────────────────────────────────

const PROXY = url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`

function timeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms)),
  ])
}

async function fetchEdgar(url, useProxy = false) {
  const target = useProxy ? PROXY(url) : url
  const res    = await fetch(target, {
    headers: { 'User-Agent': 'Aletheia/1.0 contact@aletheia.app' },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res
}

async function fetchFirmHoldings(cik) {
  const padded = cik.padStart(10, '0')

  // 1 — Submission data (CORS-enabled on data.sec.gov)
  const sub = await timeout(
    fetchEdgar(`https://data.sec.gov/submissions/CIK${padded}.json`).then(r => r.json()),
    10000
  )

  // 2 — Find latest 13F-HR
  const forms      = sub.filings.recent.form
  const idx        = forms.findIndex(f => f === '13F-HR')
  if (idx === -1) throw new Error('No 13F-HR filing found')

  const accession  = sub.filings.recent.accessionNumber[idx]   // e.g. 0001067983-25-000007
  const filingDate = sub.filings.recent.filingDate[idx]
  const period     = sub.filings.recent.reportDate?.[idx] ?? filingDate
  const accPath    = accession.replace(/-/g, '')                 // 000106798325000007
  const cikInt     = parseInt(cik, 10)

  // 3 — Fetch filing index to find the InfoTable XML filename
  const indexUrl  = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accPath}/index.json`
  const indexData = await timeout(
    fetchEdgar(indexUrl, true).then(r => r.json()),
    12000
  )

  const items = indexData.directory?.item ?? []
  const infoFile = items.find(f => {
    const n = f.name.toLowerCase()
    return n.includes('infotable') && n.endsWith('.xml')
  }) ?? items.find(f => {
    const n = f.name.toLowerCase()
    return n.includes('form13f') && n.endsWith('.xml')
  }) ?? items.find(f => f.name.toLowerCase().endsWith('.xml') && !f.name.toLowerCase().includes('primary'))

  if (!infoFile) throw new Error('InfoTable XML not found in filing')

  // 4 — Fetch and parse the InfoTable XML
  const xmlUrl  = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accPath}/${infoFile.name}`
  const xmlText = await timeout(
    fetchEdgar(xmlUrl, true).then(r => r.text()),
    15000
  )

  const doc      = new DOMParser().parseFromString(xmlText, 'text/xml')
  const rows     = doc.querySelectorAll('infoTable')
  const holdings = []

  rows.forEach(row => {
    const name    = row.querySelector('nameOfIssuer')?.textContent?.trim()
    const rawVal  = row.querySelector('value')?.textContent?.replace(/,/g, '').trim()
    const rawSh   = row.querySelector('sshPrnamt')?.textContent?.replace(/,/g, '').trim()
    const shType  = row.querySelector('sshPrnamtType')?.textContent?.trim()
    const option  = row.querySelector('putCall')?.textContent?.trim() || null
    const cusip   = row.querySelector('cusip')?.textContent?.trim()

    if (!name || !rawVal) return
    const value  = parseInt(rawVal) * 1000  // stored in $000s
    const shares = parseInt(rawSh) || 0
    if (value <= 0) return

    holdings.push({ name, value, shares, shType, option, cusip })
  })

  holdings.sort((a, b) => b.value - a.value)

  const totalValue = holdings.reduce((s, h) => s + h.value, 0)
  holdings.forEach(h => { h.pct = totalValue > 0 ? (h.value / totalValue) * 100 : 0 })

  return { filingDate, period, accession, holdings, totalValue }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtValue(v) {
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
  return `$${(v / 1e3).toFixed(0)}K`
}

function fmtShares(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString()
}

// ── EDGAR firm search ─────────────────────────────────────────────────────────

async function searchEdgar(query) {
  // EDGAR full-text search — returns 13F filers matching the query
  const url  = `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(`"${query}"`)}&forms=13F-HR&dateRange=custom&startdt=2023-01-01`
  const res  = await timeout(fetch(url, { headers: { 'User-Agent': 'Aletheia/1.0' } }), 8000)
  if (!res.ok) throw new Error(`EDGAR search HTTP ${res.status}`)
  const data = await res.json()

  const seen = new Set()
  return (data.hits?.hits ?? [])
    .map(h => {
      // CIK is in the _id path: "edgar/data/1234567/..."
      const cikMatch = h._id?.match(/edgar\/data\/(\d+)\//)
      const cik      = cikMatch?.[1]
      const name     = h._source?.entity_name ?? h._source?.file_date ?? 'Unknown'
      return { name, cik, filedAt: h._source?.file_date }
    })
    .filter(r => r.cik && !seen.has(r.cik) && seen.add(r.cik))
    .slice(0, 8)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InstitutionalTab() {
  const [activeFirm,      setActiveFirm]      = useState(FIRMS[0])
  const [data,            setData]            = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [search,          setSearch]          = useState('')
  const [cache,           setCache]           = useState({})
  const [edgarQuery,      setEdgarQuery]      = useState('')
  const [edgarResults,    setEdgarResults]    = useState([])
  const [edgarSearching,  setEdgarSearching]  = useState(false)
  const [edgarError,      setEdgarError]      = useState(null)
  const searchTimer = useRef(null)

  const load = useCallback(async (firm) => {
    if (cache[firm.cik]) { setData(cache[firm.cik]); setError(null); return }
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const result = await fetchFirmHoldings(firm.cik)
      setData(result)
      setCache(c => ({ ...c, [firm.cik]: result }))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [cache])

  function selectFirm(firm) {
    setActiveFirm(firm)
    setSearch('')
    setEdgarResults([])
    setEdgarQuery('')
    load(firm)
  }

  function onEdgarInput(val) {
    setEdgarQuery(val)
    setEdgarError(null)
    clearTimeout(searchTimer.current)
    if (!val.trim() || val.length < 3) { setEdgarResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setEdgarSearching(true)
      try {
        const results = await searchEdgar(val.trim())
        setEdgarResults(results)
      } catch (e) {
        setEdgarError(e.message)
        setEdgarResults([])
      } finally {
        setEdgarSearching(false)
      }
    }, 500)
  }

  // Load first firm on mount
  useState(() => { load(FIRMS[0]) })

  const visible = (data?.holdings ?? []).filter(h =>
    !search || h.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={13} className="text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Institutional Holdings</h2>
          </div>
          <p className="text-[11px] text-gray-500">
            Latest 13F filings from SEC EDGAR — updated quarterly
          </p>
        </div>
        {data && (
          <div className="text-right text-[10px] text-gray-600">
            <div>Period: <span className="text-gray-400">{data.period}</span></div>
            <div>Filed: <span className="text-gray-400">{data.filingDate}</span></div>
            <div>Portfolio: <span className="text-gray-300 font-bold">{fmtValue(data.totalValue)}</span></div>
          </div>
        )}
      </div>

      {/* Firm selector */}
      <div className="flex flex-wrap gap-2 mb-5">
        {FIRMS.map(firm => (
          <button
            key={firm.cik}
            onClick={() => selectFirm(firm)}
            className={`px-3 py-2 border text-[11px] font-medium transition-colors text-left ${
              activeFirm.cik === firm.cik
                ? 'border-blue-500/60 bg-blue-500/10 text-white'
                : 'border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
            }`}
          >
            <div className="font-bold">{firm.name}</div>
            <div className="text-[9px] opacity-60 mt-0.5">{firm.manager}</div>
          </button>
        ))}
      </div>

      {/* EDGAR firm search */}
      <div className="mb-4 relative">
        <div className="flex items-center gap-2 bg-gray-900/50 border border-gray-800 px-3 py-2">
          <Search size={12} className="text-gray-600 shrink-0" />
          <input
            value={edgarQuery}
            onChange={e => onEdgarInput(e.target.value)}
            placeholder="Search any 13F filer on SEC EDGAR (e.g. Aschenbrenner, Forethought…)"
            className="flex-1 bg-transparent text-gray-200 text-[12px] focus:outline-none placeholder-gray-600"
          />
          {edgarSearching && <RefreshCw size={11} className="animate-spin text-gray-600 shrink-0" />}
          {edgarQuery && (
            <button onClick={() => { setEdgarQuery(''); setEdgarResults([]) }}>
              <X size={11} className="text-gray-600 hover:text-gray-400" />
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {(edgarResults.length > 0 || edgarError) && (
          <div className="absolute top-full left-0 right-0 z-20 bg-gray-900 border border-gray-700 border-t-0 max-h-64 overflow-y-auto">
            {edgarError && (
              <div className="px-4 py-3 text-[11px] text-red-400 flex items-center gap-1">
                <AlertTriangle size={11} /> {edgarError}
              </div>
            )}
            {edgarResults.map(r => (
              <button
                key={r.cik}
                onClick={() => selectFirm({ name: r.name, manager: '', cik: r.cik, style: 'Value' })}
                className="w-full text-left px-4 py-2.5 hover:bg-gray-800 transition-colors border-b border-gray-800/60 last:border-0"
              >
                <div className="text-[12px] text-gray-200 font-medium">{r.name}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">CIK {r.cik} · Last filed {r.filedAt}</div>
              </button>
            ))}
            {edgarResults.length === 0 && !edgarError && !edgarSearching && edgarQuery.length >= 3 && (
              <div className="px-4 py-3 text-[11px] text-gray-600">No 13F filers matched "{edgarQuery}"</div>
            )}
          </div>
        )}
      </div>

      {/* Active firm info bar */}
      <div className="flex items-center gap-3 mb-4 px-3 py-2 bg-gray-900/40 border border-gray-800">
        <span className="font-bold text-white text-sm">{activeFirm.name}</span>
        <span className="text-gray-600 text-xs">{activeFirm.manager}</span>
        <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm font-bold ${STYLE_COLORS[activeFirm.style]}`}>
          {activeFirm.style}
        </span>
        <a
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${activeFirm.cik}&type=13F-HR&dateb=&owner=include&count=10`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-[10px] text-gray-600 hover:text-gray-400 flex items-center gap-1"
        >
          EDGAR filings <ExternalLink size={10} />
        </a>
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-600 gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Fetching latest 13F from SEC EDGAR…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 py-6 text-red-400 text-sm border border-red-500/20 bg-red-500/5 px-4">
          <AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Search + count */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] text-gray-600">
              {visible.length} position{visible.length !== 1 ? 's' : ''}
              {data.totalValue > 0 && <span className="ml-2">· {fmtValue(data.totalValue)} total</span>}
            </span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name…"
              className="bg-gray-900 border border-gray-800 text-gray-300 text-xs px-3 py-1.5 focus:outline-none focus:border-gray-600 w-44"
            />
          </div>

          {/* Holdings table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider text-[10px] w-8">#</th>
                  <th className="text-left py-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Company</th>
                  <th className="text-right py-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Shares</th>
                  <th className="text-right py-2 pr-3 font-medium uppercase tracking-wider text-[10px]">Market Value</th>
                  <th className="text-right py-2 pr-3 font-medium uppercase tracking-wider text-[10px] w-20">% Portfolio</th>
                  <th className="text-right py-2 font-medium uppercase tracking-wider text-[10px] w-16">Type</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((h, i) => (
                  <tr key={`${h.cusip}-${i}`} className="border-b border-gray-900 hover:bg-gray-900/40 transition-colors">
                    <td className="py-2 pr-3 text-gray-700 tabular-nums">{i + 1}</td>
                    <td className="py-2 pr-3">
                      <span className="text-gray-200 font-medium">{h.name}</span>
                      {h.option && (
                        <span className={`ml-2 text-[9px] font-bold px-1 py-0.5 ${h.option === 'Put' ? 'text-red-400 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                          {h.option.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-400">{fmtShares(h.shares)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-gray-200 font-semibold">{fmtValue(h.value)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1 bg-gray-800 overflow-hidden">
                          <div className="h-full bg-blue-500/60" style={{ width: `${Math.min(h.pct, 100)}%` }} />
                        </div>
                        <span className="text-gray-400 w-10 text-right">{h.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-gray-700 text-[10px]">{h.shType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
