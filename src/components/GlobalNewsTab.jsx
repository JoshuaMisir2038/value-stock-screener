import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, Clock } from 'lucide-react'

const PROXY = 'https://api.allorigins.win/raw?url='

const FEEDS = [
  {
    id:    'bbc',
    label: 'BBC Business',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    url:   'https://feeds.bbci.co.uk/news/business/rss.xml',
  },
  {
    id:    'guardian',
    label: 'The Guardian',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    url:   'https://www.theguardian.com/business/rss',
  },
  {
    id:    'npr',
    label: 'NPR Business',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    url:   'https://feeds.npr.org/1006/rss.xml',
  },
  {
    id:    'cnbc',
    label: 'CNBC',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-400/30',
    url:   'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664',
  },
]

function stripHtml(str) {
  return str?.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim() ?? ''
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (isNaN(mins) || mins < 0) return ''
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function parseFeed(xmlText, feed) {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml')

    // Detect Atom vs RSS
    const isAtom = doc.querySelector('feed') !== null
    const items  = Array.from(doc.querySelectorAll(isAtom ? 'entry' : 'item'))

    return items.slice(0, 15).map(item => {
      let link, title, description, pubDate

      if (isAtom) {
        const linkEl = item.querySelector('link[rel="alternate"]') || item.querySelector('link')
        link        = linkEl?.getAttribute('href') || ''
        title       = item.querySelector('title')?.textContent?.trim()
        description = stripHtml(item.querySelector('summary')?.textContent || item.querySelector('content')?.textContent).slice(0, 220)
        pubDate     = item.querySelector('published')?.textContent || item.querySelector('updated')?.textContent
      } else {
        // RSS — <link> text is between <link> and </link>, but some parsers need nextSibling
        const linkEl = item.getElementsByTagName('link')[0]
        link        = linkEl?.textContent?.trim() || linkEl?.nextSibling?.nodeValue?.trim() || ''
        title       = item.querySelector('title')?.textContent?.trim()
        description = stripHtml(item.querySelector('description')?.textContent).slice(0, 220)
        pubDate     = item.querySelector('pubDate')?.textContent
      }

      // Thumbnail: try media:thumbnail, then enclosure
      let thumbnail = null
      const mediaNS  = 'http://search.yahoo.com/mrss/'
      const mediaTh  = item.getElementsByTagNameNS(mediaNS, 'thumbnail')[0]
                     || item.getElementsByTagNameNS('*', 'thumbnail')[0]
      if (mediaTh) thumbnail = mediaTh.getAttribute('url')

      if (!thumbnail) {
        const enc = item.querySelector('enclosure')
        if (enc && enc.getAttribute('type')?.startsWith('image')) thumbnail = enc.getAttribute('url')
      }

      return { feedId: feed.id, feedLabel: feed.label, feedBadge: feed.badge, title, link, description, pubDate, thumbnail }
    }).filter(a => a.title && a.link)
  } catch {
    return []
  }
}

async function fetchFeed(feed) {
  const res  = await fetch(PROXY + encodeURIComponent(feed.url))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  const items = parseFeed(text, feed)
  if (!items.length) throw new Error('No items parsed')
  return items
}

export default function GlobalNewsTab() {
  const [articles, setArticles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter]         = useState('all')
  const [feedStatus, setFeedStatus] = useState({})

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else { setLoading(true); setArticles([]) }
    setFeedStatus({})

    const status = {}
    const results = await Promise.all(
      FEEDS.map(async feed => {
        try {
          const items = await fetchFeed(feed)
          status[feed.id] = 'ok'
          return items
        } catch (e) {
          status[feed.id] = 'error'
          return []
        }
      })
    )

    setFeedStatus(status)
    const merged = results.flat().sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    setArticles(merged)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = filter === 'all' ? articles : articles.filter(a => a.feedId === filter)
  const failedFeeds = FEEDS.filter(f => feedStatus[f.id] === 'error').map(f => f.label)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">Global News</span>
          {!loading && <span className="text-xs text-gray-600">{visible.length} headlines</span>}
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

      {/* Source filter */}
      <div className="flex gap-1 mb-5 flex-wrap">
        {[{ id: 'all', label: 'All Sources' }, ...FEEDS].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              filter === f.id
                ? 'bg-gray-700 border-gray-600 text-gray-100'
                : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {f.label}
            {feedStatus[f.id] === 'error' && <span className="ml-1 text-red-500">✕</span>}
          </button>
        ))}
      </div>

      {failedFeeds.length > 0 && !loading && (
        <div className="text-xs text-yellow-600/70 mb-4 bg-yellow-500/5 border border-yellow-500/10 rounded px-3 py-2">
          Could not load: {failedFeeds.join(', ')} — feeds may be temporarily unavailable.
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-16 text-gray-600 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Loading headlines...
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="py-16 text-center text-gray-600 text-sm">
          <p>No articles loaded.</p>
          <button onClick={() => load(true)} className="mt-3 text-xs text-gray-500 hover:text-gray-300 underline">
            Try again
          </button>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div>
          {visible.map((a, i) => (
            <a
              key={`${a.feedId}-${i}`}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 px-3 py-3.5 rounded hover:bg-gray-900/60 transition-colors group border-b border-gray-900/60 last:border-0"
            >
              {/* Thumbnail */}
              {a.thumbnail && (
                <img
                  src={a.thumbnail}
                  alt=""
                  className="w-16 h-12 object-cover rounded shrink-0 opacity-80 group-hover:opacity-100 transition-opacity mt-0.5"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${a.feedBadge}`}>
                    {a.feedLabel}
                  </span>
                  <span className="text-gray-100 font-medium text-sm leading-snug group-hover:text-white transition-colors">
                    {a.title}
                    <ExternalLink size={10} className="inline ml-1.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                  </span>
                </div>

                {a.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-1">{a.description}</p>
                )}

                {a.pubDate && (
                  <div className="flex items-center gap-1 text-[11px] text-gray-700">
                    <Clock size={10} />
                    {timeAgo(a.pubDate)}
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
