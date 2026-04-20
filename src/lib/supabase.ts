import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY ausente em .env.local')
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  realtime: { params: { eventsPerSecond: 10 } },
  auth: { persistSession: false }
})
