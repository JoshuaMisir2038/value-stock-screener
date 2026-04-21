import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, MessageSquare, ArrowUp, ExternalLink } from 'lucide-react'

const HN_API   = 'https://hacker-news.firebaseio.com/v0'
const HN_ITEM  = id => `${HN_API}/item/${id}.json`
const HN_TOP   = `${HN_API}/topstories.json`
const HN_URL   = id => `https://news.ycombinator.com/item?id=${id}`
const N_STORIES = 30

function timeAgo(unixSecs) {
  const mins = Math.floor((Date.now() / 1000 - unixSecs) / 60)
  if (mins < 60)  return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

function domain(url) {
  if (!url) return null
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return null }
}

export default function HackerNewsTab() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const ids = await fetch(HN_TOP).then(r => r.json())
      const top = ids.slice(0, N_STORIES)

      const items = await Promise.all(
        top.map(id => fetch(HN_ITEM(id)).then(r => r.json()).catch(() => null))
      )
      setStories(items.filter(Boolean))
    } catch {
      // leave existing stories visible on error
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <span className="text-[#ff6600] font-bold text-lg">Hacker News</span>
          <span className="text-xs text-gray-600">Top {N_STORIES} stories</span>
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

      {loading && (
        <div className="flex items-center gap-2 py-16 text-gray-600 text-sm">
          <RefreshCw size={14} className="animate-spin" /> Loading stories...
        </div>
      )}

      {!loading && (
        <ol className="space-y-0">
          {stories.map((story, i) => (
            <li
              key={story.id}
              className="flex gap-3 px-3 py-3 rounded hover:bg-gray-900/60 transition-colors group border-b border-gray-900/60 last:border-0"
            >
              {/* Rank */}
              <span className="text-gray-700 tabular-nums text-sm w-6 shrink-0 pt-0.5 text-right">
                {i + 1}.
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <a
                    href={story.url || HN_URL(story.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-100 hover:text-white font-medium leading-snug text-sm group-hover:text-white transition-colors"
                  >
                    {story.title}
                  </a>
                  {domain(story.url) && (
                    <span className="text-[10px] text-gray-600 shrink-0 mt-0.5">
                      ({domain(story.url)})
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <ArrowUp size={10} className="text-[#ff6600]" />
                    <span className="text-gray-400 tabular-nums">{story.score}</span>
                  </span>
                  <span>by <span className="text-gray-500">{story.by}</span></span>
                  <span>{timeAgo(story.time)}</span>
                  <a
                    href={HN_URL(story.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-gray-300 transition-colors"
                  >
                    <MessageSquare size={10} />
                    {story.descendants ?? 0} comments
                  </a>
                  {story.url && (
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-gray-300 transition-colors opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink size={10} /> open article
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
