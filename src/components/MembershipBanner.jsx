import { useState } from 'react'
import { Bell, Star, Newspaper, Users, X, Loader2, CheckCircle } from 'lucide-react'

const PERKS = [
  { icon: Bell,      label: 'Price alerts'   },
  { icon: Newspaper, label: 'Weekly digest'  },
  { icon: Star,      label: 'Cloud watchlist'},
  { icon: Users,     label: 'Community data' },
]

export default function MembershipBanner({ signIn, memberCount = null }) {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('banner_dismissed') === '1'
  )
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  if (dismissed) return null

  function dismiss() {
    sessionStorage.setItem('banner_dismissed', '1')
    setDismissed(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const err = await signIn(email.trim())
    setLoading(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  return (
    <div className="border border-blue-500/20 bg-blue-500/5 mb-5 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-gray-700 hover:text-gray-400 transition-colors"
      >
        <X size={13} />
      </button>

      <div className="px-5 py-4">
        <div className="flex items-start gap-6 flex-wrap">
          {/* Left: headline + perks */}
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-widest">Free Membership</span>
              {memberCount != null && (
                <span className="text-[10px] text-gray-600">· {memberCount.toLocaleString()} members</span>
              )}
            </div>
            <h3 className="text-sm font-extrabold text-white tracking-wide mb-3">
              Get alerts, digests & community data
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {PERKS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-gray-400">
                  <Icon size={11} className="text-blue-400 shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: email form */}
          <div className="flex-1 min-w-[240px] max-w-sm">
            {sent ? (
              <div className="flex items-center gap-3 py-2">
                <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white">Check your inbox</p>
                  <p className="text-[11px] text-gray-500">Magic link sent to {email}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm px-3 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
                {error && <p className="text-red-400 text-[10px]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  {loading ? 'Sending…' : 'Join Free →'}
                </button>
                <p className="text-[9px] text-gray-700 text-center">No password · No credit card · Unsubscribe anytime</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
