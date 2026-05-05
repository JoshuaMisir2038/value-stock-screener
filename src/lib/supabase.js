// Supabase is loaded from a CDN <script> tag in index.html (UMD build).
// The UMD bundle exposes window.supabase = { createClient, ... }.
// We reference it as a global rather than bundling it, to avoid a TDZ
// crash caused by Supabase's internal circular ES-module structure when
// processed by Rolldown (Vite 8's bundler).

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null

if (url && key) {
  try {
    // window.supabase is set by the CDN script before module scripts run
    const { createClient } = window.supabase
    supabase = createClient(url, key)
  } catch (e) {
    console.warn('Supabase init failed:', e)
  }
}

export { supabase }
