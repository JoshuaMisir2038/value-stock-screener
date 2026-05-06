import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

let supabase = null
try {
  if (url && key) supabase = createClient(url, key)
} catch (e) {
  console.warn('Supabase init failed:', e)
}

export { supabase }
