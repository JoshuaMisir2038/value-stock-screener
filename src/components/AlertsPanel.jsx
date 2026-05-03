import { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Loader2, X, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const METRICS = [
  { key: 'price',       label: 'Price ($)',          hint: 'e.g. 150' },
  { key: 'valueScore',  label: 'Value Score',         hint: '0–100' },
  { key: 'peRatio',     label: 'P/E Ratio',           hint: 'e.g. 25' },
  { key: 'pFcf',        label: 'P/FCF',               hint: 'e.g. 30' },
  { key: 'evEbitda',    label: 'EV/EBITDA',           hint: 'e.g. 15' },
  { key: 'rsi',         label: 'RSI',                  hint: 'e.g. 30' },
  { key: 'return1y',    label: '1Y Return (%)',        hint: 'e.g. -20' },
  { key: 'fcfMargin',   label: 'FCF Margin (%)',       hint: 'e.g. 10' },
  { key: 'grossMargin', label: 'Gross Margin (%)',     hint: 'e.g. 50' },
]

const METRIC_LABEL = Object.fromEntries(METRICS.map(m => [m.key, m.label]))

function fmt(metric, value) {
  if (value == null) return '—'
  if (metric === 'price')       return `$${Number(value).toFixed(2)}`
  if (metric === 'return1y' || metric === 'fcfMargin' || metric === 'grossMargin')
    return `${Number(value).toFixed(1)}%`
  return Number(value).toFixed(1)
}

function conditionLabel(condition, metric, threshold) {
  const dir = condition === 'below' ? 'drops below' : 'rises above'
  return `${dir} ${fmt(metric, threshold)}`
}

export default function AlertsPanel({ user, stocks, onClose }) {
  const [alerts,    setAlerts]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)
  const [showForm,  setShowForm]  = useState(false)

  // Form state
  const [symbol,    setSymbol]    = useState('')
  const [metric,    setMetric]    = useState('price')
  const [condition, setCondition] = useState('below')
  const [threshold, setThreshold] = useState('')
  const [symbolQ,   setSymbolQ]   = useState('')
  const [dropOpen,  setDropOpen]  = useState(false)

  const symbolResults = symbolQ.length >= 1
    ? stocks.filter(s =>
        s.symbol?.toLowerCase().startsWith(symbolQ.toLowerCase()) ||
        s.name?.toLowerCase().includes(symbolQ.toLowerCase())
      ).slice(0, 6)
    : []

  useEffect(() => {
    loadAlerts()
  }, [])

  async function loadAlerts() {
    setLoading(true)
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setAlerts(data ?? [])
    setLoading(false)
  }

  async function createAlert(e) {
    e.preventDefault()
    if (!symbol || !threshold) return
    setSaving(true)
    setError(null)

    const stock = stocks.find(s => s.symbol === symbol)
    const { error } = await supabase.from('alerts').insert({
      user_id:      user.id,
      email:        user.email,
      symbol,
      company_name: stock?.name ?? null,
      metric,
      condition,
      threshold:    parseFloat(threshold),
      active:       true,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setShowForm(false)
      setSymbol(''); setSymbolQ(''); setThreshold(''); setMetric('price'); setCondition('below')
      loadAlerts()
    }
  }

  async function deleteAlert(id) {
    await supabase.from('alerts').delete().eq('id', id)
    setAlerts(prev => prev.filter(a => a.id !== id))
  }

  async function toggleAlert(id, active) {
    await supabase.from('alerts').update({ active: !active }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/50">
      <div className="h-full w-full max-w-md bg-gray-950 border-l border-gray-700 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Bell size={13} className="text-blue-400" />
              <h2 className="text-sm font-bold text-white tracking-widest uppercase">Price Alerts</h2>
            </div>
            <p className="text-[10px] text-gray-600 mt-0.5">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Alerts list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-600">
              <Loader2 size={16} className="animate-spin mr-2" /> Loading alerts...
            </div>
          )}

          {!loading && alerts.length === 0 && !showForm && (
            <div className="text-center py-12">
              <Bell size={28} className="text-gray-800 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No alerts yet</p>
              <p className="text-gray-700 text-xs mt-1">Add one below — we'll email you when conditions are met</p>
            </div>
          )}

          {alerts.map(alert => {
            const stock     = stocks.find(s => s.symbol === alert.symbol)
            const current   = stock?.[alert.metric]
            const triggered = alert.last_triggered_at

            // Percentage-based metrics stored as decimals in stocks.json
            const pctMetrics  = ['fcfMargin', 'grossMargin', 'return1y']
            const displayVal  = current != null && pctMetrics.includes(alert.metric)
              ? (current * 100)
              : current

            return (
              <div
                key={alert.id}
                className={`border rounded p-3 transition-colors ${alert.active ? 'border-gray-800 bg-gray-900/40' : 'border-gray-900 bg-gray-950 opacity-50'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-[13px]">{alert.symbol}</span>
                      <span className="text-gray-600 text-[11px] truncate">{alert.company_name}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      <span className="text-gray-600">{METRIC_LABEL[alert.metric]}</span>
                      {' '}{conditionLabel(alert.condition, alert.metric, alert.threshold)}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-700">
                      {displayVal != null && (
                        <span>Now: <span className="text-gray-500">{fmt(alert.metric, displayVal)}</span></span>
                      )}
                      {triggered && (
                        <span>Last triggered: <span className="text-gray-500">{new Date(triggered).toLocaleDateString()}</span></span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleAlert(alert.id, alert.active)}
                      className={`text-[10px] px-2 py-0.5 border rounded transition-colors ${
                        alert.active
                          ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                          : 'border-gray-700 text-gray-600 hover:border-gray-600'
                      }`}
                    >
                      {alert.active ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => deleteAlert(alert.id)}
                      className="text-gray-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Create alert form */}
        <div className="shrink-0 border-t border-gray-800 px-5 py-4">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2.5 border border-dashed border-gray-700 text-gray-500 hover:border-blue-500/50 hover:text-blue-400 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={13} /> Add Alert
            </button>
          ) : (
            <form onSubmit={createAlert} className="space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">New Alert</span>
                <button type="button" onClick={() => setShowForm(false)} className="text-gray-700 hover:text-gray-400">
                  <X size={13} />
                </button>
              </div>

              {/* Stock search */}
              <div className="relative">
                <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Stock</label>
                <input
                  value={symbolQ}
                  onChange={e => { setSymbolQ(e.target.value); setSymbol(''); setDropOpen(true) }}
                  onFocus={() => setDropOpen(true)}
                  placeholder="Search ticker or company..."
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs px-3 py-2 focus:outline-none focus:border-blue-500"
                />
                {dropOpen && symbolResults.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-900 border border-gray-700 max-h-40 overflow-y-auto z-10">
                    {symbolResults.map(s => (
                      <button
                        key={s.symbol}
                        type="button"
                        onMouseDown={() => {
                          setSymbol(s.symbol)
                          setSymbolQ(`${s.symbol} — ${s.name}`)
                          setDropOpen(false)
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-800 flex items-center gap-2"
                      >
                        <span className="font-bold text-blue-400 w-12 shrink-0">{s.symbol}</span>
                        <span className="text-gray-400 truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Metric + condition + threshold */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Metric</label>
                  <select
                    value={metric}
                    onChange={e => setMetric(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs px-2 py-2 focus:outline-none focus:border-blue-500"
                  >
                    {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">Condition</label>
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs px-2 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="below">Drops below</option>
                    <option value="above">Rises above</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-600 uppercase tracking-wider mb-1">
                  Threshold <span className="text-gray-700">({METRICS.find(m => m.key === metric)?.hint})</span>
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  placeholder={METRICS.find(m => m.key === metric)?.hint}
                  step="any"
                  required
                  className="w-full bg-gray-900 border border-gray-700 text-gray-200 text-xs px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <p className="text-red-400 text-[11px] flex items-center gap-1">
                  <AlertTriangle size={11} /> {error}
                </p>
              )}

              <button
                type="submit"
                disabled={saving || !symbol || !threshold}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 size={11} className="animate-spin" />}
                {saving ? 'Saving...' : 'Create Alert'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
