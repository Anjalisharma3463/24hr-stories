import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const missingConfigError = () =>
  new Error(
    'Supabase is not configured. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable backend features.',
  )

const createDisabledClient = () => {
  const throwOnUse = () => {
    throw missingConfigError()
  }

  return {
    auth: {
      getSession: throwOnUse,
      getUser: throwOnUse,
      signUp: throwOnUse,
      signInWithPassword: throwOnUse,
      signOut: throwOnUse,
      onAuthStateChange: throwOnUse,
    },
    from: throwOnUse,
    rpc: throwOnUse,
  } as unknown as ReturnType<typeof createClient<Database>>
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabaseClient =
  supabaseUrl && supabaseAnonKey
    ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
          storageKey: 'ephemeral-spaces-auth',
        },
      })
    : createDisabledClient()