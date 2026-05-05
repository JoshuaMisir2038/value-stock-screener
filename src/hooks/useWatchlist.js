import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const KEY = 'vf_watchlist'

function loadLocal() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} }
}
function saveLocal(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {}
}

export function useWatchlist(user) {
  const [watchlist, setWatchlist] = useState(loadLocal)
  const [syncing,   setSyncing]   = useState(false)

  // When user logs in: fetch cloud watchlist and merge up any local-only items
  useEffect(() => {
    if (!user || !supabase) return
    let cancelled = false

    async function sync() {
      setSyncing(true)
      try {
        const { data: cloud } = await supabase
          .from('user_watchlists')
          .select('symbol, note, added_at')
          .eq('user_id', user.id)

        if (cancelled || !cloud) return

        const local        = loadLocal()
        const cloudSymbols = new Set(cloud.map(r => r.symbol))

        // Upload any locally-added stocks that aren't in the cloud yet
        const toUpload = Object.entries(local)
          .filter(([sym]) => !cloudSymbols.has(sym))
          .map(([symbol, meta]) => ({
            user_id:  user.id,
            symbol,
            note:     meta.note || '',
            added_at: meta.addedAt,
          }))

        if (toUpload.length) {
          await supabase.from('user_watchlists')
            .upsert(toUpload, { onConflict: 'user_id,symbol' })
          // Update community counters for migrated items
          await Promise.allSettled(
            toUpload.map(({ symbol }) => supabase.rpc('add_watcher', { sym: symbol }))
          )
        }

        // Merge: cloud is authoritative, local fills in anything missing
        const merged = {}
        for (const row of cloud) {
          merged[row.symbol] = { addedAt: row.added_at, note: row.note || '' }
        }
        for (const [sym, meta] of Object.entries(local)) {
          if (!merged[sym]) merged[sym] = meta
        }

        if (!cancelled) {
          setWatchlist(merged)
          saveLocal(merged)
        }
      } catch (e) {
        console.warn('Watchlist sync error:', e)
      } finally {
        if (!cancelled) setSyncing(false)
      }
    }

    sync()
    return () => { cancelled = true }
  }, [user?.id])

  const toggle = useCallback((symbol) => {
    setWatchlist(prev => {
      const isAdding = !prev[symbol]
      const next     = { ...prev }

      if (isAdding) {
        next[symbol] = { addedAt: new Date().toISOString(), note: '' }
      } else {
        delete next[symbol]
      }
      saveLocal(next)

      if (user && supabase) {
        if (isAdding) {
          supabase.from('user_watchlists')
            .upsert({ user_id: user.id, symbol, note: '', added_at: new Date().toISOString() },
                    { onConflict: 'user_id,symbol' })
          supabase.rpc('add_watcher', { sym: symbol })
        } else {
          supabase.from('user_watchlists').delete()
            .eq('user_id', user.id).eq('symbol', symbol)
          supabase.rpc('remove_watcher', { sym: symbol })
        }
      }

      return next
    })
  }, [user])

  const setNote = useCallback((symbol, note) => {
    setWatchlist(prev => {
      if (!prev[symbol]) return prev
      const next = { ...prev, [symbol]: { ...prev[symbol], note } }
      saveLocal(next)
      if (user && supabase) {
        supabase.from('user_watchlists').update({ note })
          .eq('user_id', user.id).eq('symbol', symbol)
      }
      return next
    })
  }, [user])

  const remove = useCallback((symbol) => {
    setWatchlist(prev => {
      const next = { ...prev }
      delete next[symbol]
      saveLocal(next)
      if (user && supabase) {
        supabase.from('user_watchlists').delete()
          .eq('user_id', user.id).eq('symbol', symbol)
        supabase.rpc('remove_watcher', { sym: symbol })
      }
      return next
    })
  }, [user])

  return { watchlist, toggle, setNote, remove, syncing }
}
