import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Graceful degradation: if env vars are missing, create a dummy client
// that will fail on actual requests rather than crashing the whole app at load time.
// This allows the app to render an error boundary instead of a blank screen.
const url = supabaseUrl ?? 'https://placeholder.supabase.co'
const key = supabaseAnonKey ?? 'placeholder-key'

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY. ' +
    'Copy .env.example to .env and fill in your Supabase project credentials.'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

/** True if Supabase is properly configured */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
