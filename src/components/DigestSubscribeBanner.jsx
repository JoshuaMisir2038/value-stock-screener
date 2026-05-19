import { useState, useEffect } from 'react'
import { Mail, Loader2, CheckCircle, X, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Reads ?unsub=TOKEN from the URL to handle one-click unsubscribe links in emails
function getUnsubToken() {
  try {
    return new URLSearchParams(window.location.search).get('unsub')
  } catch { return null }
}

export default function DigestSubscribeBanner({ user }) {
  const [email,      setEmail]      = useState(user?.email ?? '')
  const [loading,    setLoading]    = useState(false)
  const [done,       setDone]       = useState(false)
  const [error,      setError]      = useState(null)
  const [dismissed,  setDismissed]  = useState(
    () => sessionStorage.getItem('digest_banner_dismissed') === '1'
  )

  // Unsubscribe flow — triggered by ?unsub=TOKEN in email links
  const [unsubToken, setUnsubToken] = useState(null)
  const [unsubDone,  setUnsubDone]  = useState(false)

  useEffect(() => {
    const token = getUnsubToken()
    if (token) setUnsubToken(token)
  }, [])

  async function handleUnsubscribe() {
    if (!supabase) return
    setLoading(true)
    try {
      await supabase.rpc('unsubscribe', { p_token: unsubToken })
      setUnsubDone(true)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    } catch (e) {
      setError('Unsubscribe failed — please reply to the email to be removed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubscribe(e) {
    e.preventDefault()
    const addr = email.trim().toLowerCase()
    if (!addr || !supabase) return
    setLoading(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('subscribers')
        .insert({ email: addr })
      if (err) {
        if (err.code === '23505') {
          // Unique violation — already subscribed
          setDone(true)
        } else {
          throw err
        }
      } else {
        setDone(true)
      }
    } catch (e) {
      setError(e.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function dismiss() {
    sessionStorage.setItem('digest_banner_dismissed', '1')
    setDismissed(true)
  }

  // ── Unsubscribe flow ────────────────────────────────────────────────────────
  if (unsubToken) {
    return (
      <div className="border border-gray-800 bg-gray-950 px-5 py-4 mb-3 flex items-center gap-4">
        <Mail size={14} className="text-gray-500 shrink-0" />
        {unsubDone ? (
          <p className="text-[12px] text-gray-400">
            You've been unsubscribed. You won't receive any more digest emails.
          </p>
        ) : (
          <>
            <p className="text-[12px] text-gray-400 flex-1">
              Unsubscribe from the Aletheia daily digest?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={loading}
              className="px-4 py-1.5 border border-red-500/40 text-red-400 text-[11px] font-bold tracking-wider uppercase hover:bg-red-500/10 transition-colors disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {loading && <Loader2 size={10} className="animate-spin" />}
              Confirm Unsubscribe
            </button>
          </>
        )}
        {error && <p className="text-red-400 text-[11px]">{error}</p>}
      </div>
    )
  }

  // ── Dismissed / already subscribed ─────────────────────────────────────────
  if (dismissed || !supabase) return null

  // ── Success state ───────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-emerald-400 shrink-0" />
          <span className="text-[12px] text-emerald-300 font-semibold">
            You're subscribed! First briefing tomorrow at 7am ET.
          </span>
        </div>
        <button onClick={dismiss} className="text-gray-600 hover:text-gray-400 transition-colors shrink-0">
          <X size={13} />
        </button>
      </div>
    )
  }

  // ── Main subscribe form ─────────────────────────────────────────────────────
  return (
    <div className="border border-violet-500/20 bg-violet-500/5 mb-3">
      <div className="px-4 py-2.5 flex items-center gap-5 flex-wrap">
        {/* Left: label */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          <Sparkles size={10} className="text-violet-400" />
          <span className="text-[11px] font-bold text-violet-300 uppercase tracking-widest">
            AI Daily Digest
          </span>
          <span className="text-[11px] text-gray-500 hidden sm:inline">
            — market briefing, top picks & news at 7am ET
          </span>
        </div>

        {/* Right: form */}
        <form onSubmit={handleSubscribe} className="flex items-center gap-2 ml-auto">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            className="bg-gray-900 border border-gray-700 text-gray-100 text-[12px] px-3 py-1.5 focus:outline-none focus:border-violet-400 placeholder-gray-600 w-48"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-[11px] font-bold tracking-wide uppercase transition-colors flex items-center gap-1.5 shrink-0"
          >
            {loading && <Loader2 size={10} className="animate-spin" />}
            {loading ? 'Subscribing…' : 'Subscribe Free →'}
          </button>
          {error && <p className="text-red-400 text-[10px]">{error}</p>}
        </form>

        <button onClick={dismiss} className="text-gray-700 hover:text-gray-500 transition-colors shrink-0 ml-1">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
