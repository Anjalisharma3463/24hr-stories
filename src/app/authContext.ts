import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { CreateProfileInput } from '@/services'
import type { AuthenticatedUser, Profile } from '@/types/ephemeral-space'

export type AuthContextValue = {
  session: Session | null
  user: AuthenticatedUser | null
  profile: Profile | null
  loading: boolean
  authError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, profile: CreateProfileInput) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within Providers.')
  }

  return context
}