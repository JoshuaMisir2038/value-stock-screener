import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Star, GitFork, ExternalLink } from 'lucide-react'

const PROXY = 'https://api.allorigins.win/raw?url='

const PERIODS = [
  { id: 'daily',   label: 'Today' },
  { id: 'weekly',  label: 'This Week' },
  { id: 'monthly', label: 'This Month' },
]

const LANGUAGES = [
  { id: '',           label: 'All' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python' },
  { id: 'rust',       label: 'Rust' },
  { id: 'go',         label: 'Go' },
  { id: 'java',       label: 'Java' },
  { id: 'cpp',        label: 'C++' },
]

const LANG_COLORS = {
  javascript: '#f1e05a',
  typescript: '#3178c6',
  python:     '#3572a5',
  rust:       '#dea584',
  go:         '#00add8',
  java:       '#b07219',
  'c++':      '#f34b7d',
  'c#':       '#178600',
  ruby:       '#701516',
  swift:      '#f05138',
  kotlin:     '#a97bff',
  shell:      '#89e051',
}

function buildUrl(language, since) {
  const base = language ? `https://github.com/trending/${language}` : 'https://github.com/trending'
  return since !== 'daily' ? `${base}?since=${since}` : base
}

function parseRepos(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const articles = doc.querySelectorAll('article.Box-row')

  return Array.from(articles).map(article => {
    const nameLink = article.querySelector('h2 a')
    const href     = nameLink?.getAttribute('href') || ''
    const parts    = href.split('/').filter(Boolean)
    const owner    = parts[0] || ''
    const repo     = parts[1] || ''

    const desc = article.querySelector('p')?.textContent?.trim() || ''

    const lang      = article.querySelector('[itemprop="programmingLanguage"]')?.textContent?.trim() || null
    const langDot   = article.querySelector('.repo-language-color')
    const langColor = langDot
      ? langDot.style?.backgroundColor || LANG_COLORS[lang?.toLowerCase()] || '#6b7280'
      : LANG_COLORS[lang?.toLowerCase()] || '#6b7280'

    const starsLink = article.querySelector('a[href$="/stargazers"]')
    const stars     = parseInt(starsLink?.textContent?.replace(/[^0-9]/g, '') || '0')

    const forksLink = article.querySelector('a[href$="/forks"], a[href*="/network/members"]')
    const forks     = parseInt(forksLink?.textContent?.replace(/[^0-9]/g, '') || '0')

    const todaySpan = Array.from(article.querySelectorAll('span'))
      .find(s => /stars? today/i.test(s.textContent))
    const starsToday = todaySpan
      ? todaySpan.textContent.trim().replace(/\s+/g, ' ')
      : null

    return { owner, repo, url: `https://github.com${href}`, desc, lang, langColor, stars, forks, starsToday }
  }).filter(r => r.owner && r.repo)
}

function formatNum(n) {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export default function GitHubTrendingTab() {
  const [repos, setRepos]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError]       = useState(null)
  const [period, setPeriod]     = useState('daily')
  const [lang, setLang]         = useState('')

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else { setLoading(true); setRepos([]) }
    setError(null)

    try {
      const url = buildUrl(lang, period)
      const res = await fetch(PROXY + encodeURIComponent(url))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const html  = await res.text()
      const items = parseRepos(html)
      if (!items.length) throw new Error('No repos parsed — GitHub may have changed their layout.')
      setRepos(items)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [period, lang])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">GitHub Trending</span>
          {!loading && repos.length > 0 && (
            <span className="text-xs text-gray-600">{repos.length} repositories</span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Period filter */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {PERIODS.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              period === p.id
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Language filter */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {LANGUAGES.map(l => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              lang === l.id
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-16 text-gray-600 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Loading trending repos...
        </div>
      )}

      {error && (
        <div className="py-8 text-center text-sm">
          <p className="text-red-400/70 mb-3">{error}</p>
          <button onClick={() => load(true)} className="text-xs text-gray-500 hover:text-gray-300 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && repos.length > 0 && (
        <div>
          {repos.map((r, i) => (
            <a
              key={`${r.owner}/${r.repo}`}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 px-3 py-3.5 rounded hover:bg-gray-900/60 transition-colors group border-b border-gray-900/60 last:border-0"
            >
              {/* Rank */}
              <span className="text-gray-700 tabular-nums text-sm w-6 shrink-0 pt-0.5 text-right">
                {i + 1}.
              </span>

              <div className="flex-1 min-w-0">
                {/* Title */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-gray-500 text-sm">{r.owner}</span>
                  <span className="text-gray-600 text-sm">/</span>
                  <span className="text-white font-semibold text-sm group-hover:text-blue-400 transition-colors">
                    {r.repo}
                  </span>
                  <ExternalLink size={10} className="text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Description */}
                {r.desc && (
                  <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{r.desc}</p>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-4 text-[11px] text-gray-600 flex-wrap">
                  {r.lang && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.langColor }} />
                      {r.lang}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star size={11} className="text-yellow-500/70" />
                    {formatNum(r.stars)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork size={11} />
                    {formatNum(r.forks)}
                  </span>
                  {r.starsToday && (
                    <span className="text-emerald-500/70">{r.starsToday}</span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
