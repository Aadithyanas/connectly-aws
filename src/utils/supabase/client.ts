import { createBrowserClient } from '@supabase/ssr'

// Nuke any stale Supabase auth session keys from localStorage on every page load.
// This app uses custom JWT auth (Express backend). The Supabase client is used
// ONLY for Realtime channels (presence / broadcast) — never for auth sessions.
// Without this, the old auth-js client would attempt token refresh loops on init.
if (typeof window !== 'undefined') {
  try {
    const prefix = `sb-${(process.env.NEXT_PUBLIC_SUPABASE_URL || '').split('//')[1]?.split('.')[0]}`
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefix) || k.startsWith('supabase.auth.'))
      .forEach((k) => localStorage.removeItem(k))
  } catch (_) {
    // localStorage may not be available in some SSR edge cases
  }
}

export function createClient() {
  // Server-side: fresh instance with no auth
  if (typeof window === 'undefined') {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        }
      }
    )
  }

  // Browser: single shared instance.
  // autoRefreshToken / persistSession / detectSessionInUrl are ALL disabled —
  // this eliminates the SupabaseAuthClient._callRefreshToken loop.
  if (!(window as any)._supabaseClient) {
    (window as any)._supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        }
      }
    )
  }

  return (window as any)._supabaseClient
}
