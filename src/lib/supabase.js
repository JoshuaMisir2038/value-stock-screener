// Lazy Supabase client — createClient is deferred to first use.
// Calling createClient at module-init time causes a TDZ crash in Rolldown
// (Vite 8's bundler) because the Supabase realtime system has internal
// circular initialisations. The Proxy forwards every property access to
// the real client, which is created on the first .from() / .auth. / etc call.

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let _client = null

function getClient() {
  if (!_client) _client = createClient(url, key)
  return _client
}

// Proxy forwards every property access to the lazily-created client.
// Existing code (supabase.from(...), supabase.auth, supabase.rpc(...))
// continues to work unchanged.
export const supabase = (url && key)
  ? new Proxy({}, {
      get(_, prop) {
        return getClient()[prop]
      },
    })
  : null
