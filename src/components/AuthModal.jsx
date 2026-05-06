import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle } from 'lucide-react'

export default function AuthModal({ onClose, signIn }) {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState(null)

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
      <div className="w-full max-w-sm bg-gray-950 border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-sm font-bold text-white tracking-widest uppercase">Join Aletheia</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">Free membership — no password needed</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
            <p className="text-white text-sm font-semibold mb-1">Check your inbox</p>
            <p className="text-gray-500 text-xs">Magic link sent to <span className="text-gray-300">{email}</span></p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-700"
                />
              </div>
            </div>
            {error && <p className="text-red-400 text-[11px] border border-red-500/30 bg-red-500/5 px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              {loading ? 'Sending…' : 'Join Free →'}
            </button>
            <p className="text-[10px] text-gray-700 text-center">
              Membership gives you price alerts, weekly digest &amp; cloud watchlist.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
