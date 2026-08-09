import {
  
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import {
  createEphemeralSpacesRepository,
  type CreateProfileInput,
} from '@/services'
import type { AuthenticatedUser, Profile } from '@/types/ephemeral-space'
import { AuthContext, type AuthContextValue } from './authContext'

type ProvidersProps = {
  children: ReactNode
}

const repository = createEphemeralSpacesRepository()

const toFriendlyAuthError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'Authentication failed. Please try again.'
  }

  const message = error.message.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return 'Invalid email or password.'
  }

  if (message.includes('user already registered') || message.includes('duplicate key')) {
    return 'An account with this email already exists.'
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.'
  }

  if (message.includes('supabase is not configured')) {
    return error.message
  }

  return error.message
}

export function Providers({ children }: ProvidersProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const loadProfile = useCallback(async () => {
    try {
      const currentProfile = await repository.profiles.getCurrentProfile()
      setProfile(currentProfile)
    } catch (error) {
      setProfile(null)
      setAuthError(toFriendlyAuthError(error))
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        const sessionInfo = await repository.auth.getSession()

        if (!isMounted) {
          return
        }

        setSession(sessionInfo.session)
        setUser(sessionInfo.user)
        setAuthError(null)

        if (sessionInfo.user) {
          await loadProfile()
        } else {
          setProfile(null)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSession(null)
        setUser(null)
        setProfile(null)
        setAuthError(toFriendlyAuthError(error))
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    const { data } = repository.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)
      setUser(
        nextSession?.user
          ? { id: nextSession.user.id, email: nextSession.user.email ?? null }
          : null,
      )
      setAuthError(null)

      if (nextSession?.user) {
        void loadProfile()
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      isMounted = false
      data.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null)

    try {
      await repository.auth.signIn(email, password)
    } catch (error) {
      setAuthError(toFriendlyAuthError(error))
      throw error
    }
  }, [])

  const signUp = useCallback(
    async (email: string, password: string, profileInput: CreateProfileInput) => {
      setAuthError(null)

      try {
        const signupResponse = await repository.auth.signUp(
          email,
          password,
          profileInput.username,
        )

        if (signupResponse.user) {
          await repository.profiles.upsertProfile(signupResponse.user.id, profileInput)
        }
      } catch (error) {
        setAuthError(toFriendlyAuthError(error))
        throw error
      }
    },
    [],
  )

  const signOut = useCallback(async () => {
    setAuthError(null)

    try {
      await repository.auth.signOut()
    } catch (error) {
      setAuthError(toFriendlyAuthError(error))
      throw error
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      authError,
      signIn,
      signUp,
      signOut,
    }),
    [authError, loading, profile, session, signIn, signOut, signUp, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
