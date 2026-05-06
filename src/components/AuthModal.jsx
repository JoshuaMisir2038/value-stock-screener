import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle, Bell, Newspaper, Star, Users } from 'lucide-react'

export default function AuthModal({ onClose, signIn }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

  // Icons defined INSIDE the component — never at module level
  // (module-level icon refs cause Rolldown TDZ with shared lucide imports)
  const benefits = [
    { Icon: Bell,      text: 'Price & metric alerts — email when a stock hits your threshold' },
    { Icon: Newspaper, text: 'Weekly digest — top value stocks & biggest movers every Monday' },
    { Icon: Star,      text: 'Cloud watchlist — syncs across all your devices' },
    { Icon: Users,     text: 'Community data — see which stocks members are watching' },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md bg-gray-950 border border-gray-700 overflow-hidden">

        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-extrabold text-white tracking-widest uppercase">Join Aletheia</h2>
            <p className="text-[11px] text-gray-500 mt-1">Free membership — no password needed</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors mt-0.5">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="text-center px-6 py-10">
            <CheckCircle size={36} className="text-emerald-400 mx-auto mb-4" />
            <p className="text-white text-sm font-bold mb-2">Check your inbox</p>
            <p className="text-gray-500 text-xs">Magic link sent to <span className="text-gray-200 font-semibold">{email}</span></p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 space-y-2.5">
              {benefits.map(({ Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={11} className="text-blue-400" />
                  </div>
                  <p className="text-[12px] text-gray-300 leading-snug">{text}</p>
                </div>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-3">
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-700"
                />
              </div>
              {error && <p className="text-red-400 text-[11px] border border-red-500/30 bg-red-500/5 px-3 py-2">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[13px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? 'Sending link…' : 'Join Free →'}
              </button>
              <p className="text-[11px] text-gray-400 text-center">No password · No credit card · Unsubscribe anytime</p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
