import { useState } from 'react'
import { Loader2, CheckCircle, Bell, Newspaper, Star, Users } from 'lucide-react'

export default function MembershipBanner({ signIn, memberCount = null }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  // Icons inside component — avoids Rolldown TDZ with shared lucide imports
  const perks = [
    { Icon: Bell,      label: 'Price alerts'    },
    { Icon: Newspaper, label: 'Daily digest'    },
    { Icon: Star,      label: 'Cloud watchlist' },
    { Icon: Users,     label: 'Community data'  },
  ]

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
    <div className="border border-blue-500/30 bg-blue-500/5 mb-3">
      <div className="px-4 py-2.5 flex items-center gap-6 flex-wrap">
        {/* Left: label + perks */}
        <div className="flex items-center gap-4 flex-wrap flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">Free Membership</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {perks.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-1 text-[11px] text-gray-200 font-medium">
                <Icon size={10} className="text-blue-400 shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Right: form */}
        <div className="shrink-0">
          {sent ? (
            <div className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-400" />
              <span className="text-[11px] text-white font-semibold">Check your inbox — magic link sent to {email}</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="bg-gray-900 border border-gray-700 text-gray-100 text-[12px] px-3 py-1.5 focus:outline-none focus:border-blue-400 placeholder-gray-600 w-52"
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="px-4 py-1.5 bg-blue-500 hover:bg-blue-400 disabled:opacity-40 text-white text-[12px] font-bold tracking-wide uppercase transition-colors flex items-center gap-1.5 shrink-0"
              >
                {loading && <Loader2 size={11} className="animate-spin" />}
                {loading ? 'Sending…' : 'Join Free →'}
              </button>
              {error && <p className="text-red-400 text-[10px]">{error}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
