import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, Clock } from 'lucide-react'

const RSS2JSON = 'https://api.rss2json.com/v1/api.json?count=15&rss_url='

const FEEDS = [
  {
    id:    'bbc',
    label: 'BBC',
    badge: 'bg-red-500/15 text-red-400 border-red-500/30',
    url:   'http://feeds.bbci.co.uk/news/world/rss.xml',
  },
  {
    id:    'guardian',
    label: 'The Guardian',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    url:   'https://www.theguardian.com/world/rss',
  },
  {
    id:    'npr',
    label: 'NPR',
    badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    url:   'https://feeds.npr.org/1001/rss.xml',
  },
  {
    id:    'aljazeera',
    label: 'Al Jazeera',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    url:   'https://www.aljazeera.com/xml/rss/all.xml',
  },
]

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const diff = Date.now() - new Date(pubDate).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)   return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function stripHtml(str) {
  return str?.replace(/<[^>]*>/g, '').trim() ?? ''
}

export default function GlobalNewsTab() {
  const [articles, setArticles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter]       = useState('all')
  const [errors, setErrors]       = useState([])

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setErrors([])

    const results = await Promise.all(
      FEEDS.map(async feed => {
        try {
          const res  = await fetch(RSS2JSON + encodeURIComponent(feed.url))
          const data = await res.json()
          if (data.status !== 'ok') throw new Error(data.message || 'Feed error')
          return (data.items || []).map(item => ({
            feedId:      feed.id,
            feedLabel:   feed.label,
            feedBadge:   feed.badge,
            title:       item.title,
            link:        item.link,
            description: stripHtml(item.description).slice(0, 200),
            thumbnail:   item.thumbnail || item.enclosure?.link || null,
            pubDate:     item.pubDate,
          }))
        } catch (e) {
          setErrors(prev => [...prev, feed.label])
          return []
        }
      })
    )

    // Merge and sort by date, newest first
    const merged = results
      .flat()
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))

    setArticles(merged)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  const visible = filter === 'all' ? articles : articles.filter(a => a.feedId === filter)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-lg">Global News</span>
          <span className="text-xs text-gray-600">
            {visible.length} headlines
          </span>
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

      {/* Source filter tabs */}
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
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="text-xs text-yellow-600/70 mb-3">
          Could not load: {errors.join(', ')}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-16 text-gray-600 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Loading headlines...
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="py-16 text-center text-gray-600 text-sm">No articles found.</div>
      )}

      {!loading && (
        <div className="space-y-0">
          {visible.map((a, i) => (
            <a
              key={`${a.feedId}-${i}`}
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-3 px-3 py-3.5 rounded hover:bg-gray-900/60 transition-colors group border-b border-gray-900/60 last:border-0 block"
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

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${a.feedBadge}`}>
                    {a.feedLabel}
                  </span>
                  <span className="text-gray-100 font-medium text-sm leading-snug group-hover:text-white transition-colors line-clamp-2">
                    {a.title}
                    <ExternalLink size={10} className="inline ml-1.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </span>
                </div>
                {a.description && (
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2 mb-1">
                    {a.description}
                  </p>
                )}
                <div className="flex items-center gap-1 text-[11px] text-gray-700">
                  <Clock size={10} />
                  {timeAgo(a.pubDate)}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
