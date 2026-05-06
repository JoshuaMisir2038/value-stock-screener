import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function AuthModal({ onClose, signUp, signInWithPassword, signInWithMagicLink }) {
  const [mode,        setMode]        = useState('signin')   // 'signin' | 'signup' | 'magic'
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [done,        setDone]        = useState(null)       // success message
  const [error,       setError]       = useState(null)

  function reset(newMode) {
    setMode(newMode)
    setError(null)
    setDone(null)
    setPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    let err = null
    if (mode === 'magic') {
      err = await signInWithMagicLink(email.trim())
      if (!err) setDone('Magic link sent — check your inbox and click the link to sign in.')
    } else if (mode === 'signup') {
      err = await signUp(email.trim(), password)
      if (!err) setDone('Account created! Check your inbox to confirm your email, then sign in.')
    } else {
      err = await signInWithPassword(email.trim(), password)
      if (!err) onClose()  // signed in — close modal
    }

    if (err) setError(err.message)
    setLoading(false)
  }

  const isPassword = mode === 'signin' || mode === 'signup'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-sm bg-gray-950 border border-gray-700">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-widest uppercase">
              {mode === 'signup' ? 'Create Account' : mode === 'magic' ? 'Magic Link' : 'Sign In'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {mode === 'signup'
                ? 'Free — get alerts, digest & cloud watchlist'
                : mode === 'magic'
                ? 'We\'ll email you a one-click sign-in link'
                : 'Welcome back'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { key: 'signin', label: 'Sign In'    },
            { key: 'signup', label: 'Sign Up'    },
            { key: 'magic',  label: 'Magic Link' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => reset(key)}
              className={`flex-1 py-2.5 text-[11px] font-bold tracking-wider uppercase transition-colors border-b-2 ${
                mode === key
                  ? 'border-blue-500 text-white'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {done ? (
            <div className="flex flex-col items-center text-center gap-3 py-4">
              <CheckCircle size={32} className="text-emerald-400" />
              <p className="text-gray-200 text-sm leading-relaxed">{done}</p>
              <button
                onClick={onClose}
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors mt-1"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Email */}
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                  Email
                </label>
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

              {/* Password — only for signin/signup */}
              {isPassword && (
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                    Password
                    {mode === 'signup' && <span className="ml-1 text-gray-700 normal-case">(min 6 characters)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
                      required
                      minLength={6}
                      className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-sm px-3 pr-10 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-[11px] border border-red-500/30 bg-red-500/5 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim() || (isPassword && password.length < 6)}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-bold tracking-widest uppercase transition-colors flex items-center justify-center gap-2 mt-1"
              >
                {loading && <Loader2 size={13} className="animate-spin" />}
                {loading ? 'Please wait…'
                  : mode === 'signin' ? 'Sign In →'
                  : mode === 'signup' ? 'Create Account →'
                  : 'Send Magic Link →'}
              </button>

              <p className="text-[11px] text-gray-400 text-center">
                {mode === 'signin'
                  ? <>No account? <button type="button" onClick={() => reset('signup')} className="text-blue-400 hover:text-blue-300 underline">Sign up free</button></>
                  : mode === 'signup'
                  ? <>Already a member? <button type="button" onClick={() => reset('signin')} className="text-blue-400 hover:text-blue-300 underline">Sign in</button></>
                  : <span className="text-gray-500">A one-time link — no password needed</span>
                }
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
