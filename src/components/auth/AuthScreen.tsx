import { useMemo, useState, type FormEvent } from 'react'
import { cn } from '@/utils/cn'

type AuthScreenProps = {
  authError: string | null
  onSignIn: (email: string, password: string) => Promise<void>
  onSignUp: (
    email: string,
    password: string,
    profile: { username: string; displayName: string | null },
  ) => Promise<void>
}

type AuthMode = 'sign-in' | 'sign-up'

const getUsernameFromEmail = (email: string) => {
  const [localPart] = email.split('@')

  return localPart.replace(/[^a-z0-9._-]/gi, '').slice(0, 24) || 'member'
}

export function AuthScreen({ authError, onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const primaryLabel = useMemo(
    () => (mode === 'sign-in' ? 'Sign in' : 'Create account'),
    [mode],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLocalError(null)
    setSuccessMessage(null)
    setIsSubmitting(true)

    try {
      if (mode === 'sign-in') {
        await onSignIn(email.trim(), password)
        return
      }

      await onSignUp(email.trim(), password, {
        username: username.trim() || getUsernameFromEmail(email),
        displayName: displayName.trim() || null,
      })

      setSuccessMessage('Account created. If email confirmation is enabled, check your inbox.')
    } catch (error) {
      if (error instanceof Error) {
        setLocalError(error.message)
      } else {
        setLocalError('Authentication failed. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell min-h-dvh bg-background text-foreground">
      <div aria-hidden="true" className="app-ambient app-ambient--one" />
      <div aria-hidden="true" className="app-ambient app-ambient--two" />
      <div aria-hidden="true" className="app-ambient app-ambient--three" />

      <div className="container-app flex min-h-dvh items-center justify-center py-8 sm:py-10">
        <section className="glass-surface w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/12 p-5 shadow-[0_24px_90px_rgba(0,0,0,0.42)] sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-[0.6875rem] font-medium tracking-[0.24em] text-accent uppercase">
                  Ephemeral Spaces
                </p>
                <h1 className="max-w-lg text-balance text-[clamp(2.2rem,4.8vw,4rem)] font-semibold leading-[0.96] tracking-[-0.05em]">
                  A private place for temporary events.
                </h1>
                <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
                  Sign in to join short-lived spaces, share stories, and keep event updates in one place.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="studio-metric-card studio-metric-card--compact">
                  <span className="studio-metric-card__label">Private spaces</span>
                  <span className="studio-metric-card__value text-[1.15rem] tracking-tight">Secure</span>
                </div>
                <div className="studio-metric-card studio-metric-card--compact">
                  <span className="studio-metric-card__label">Invite flow</span>
                  <span className="studio-metric-card__value text-[1.15rem] tracking-tight">Link + QR</span>
                </div>
                <div className="studio-metric-card studio-metric-card--compact">
                  <span className="studio-metric-card__label">Stories</span>
                  <span className="studio-metric-card__value text-[1.15rem] tracking-tight">Time-limited</span>
                </div>
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-4 sm:p-5">
              <div className="mb-4 flex gap-2 rounded-full border border-white/10 bg-black/20 p-1 text-sm">
                <button
                  className={cn(
                    'flex-1 rounded-full px-4 py-2 font-medium transition-colors',
                    mode === 'sign-in' ? 'bg-white/10 text-foreground' : 'text-muted',
                  )}
                  type="button"
                  onClick={() => {
                    setMode('sign-in')
                    setLocalError(null)
                    setSuccessMessage(null)
                  }}
                >
                  Sign in
                </button>
                <button
                  className={cn(
                    'flex-1 rounded-full px-4 py-2 font-medium transition-colors',
                    mode === 'sign-up' ? 'bg-white/10 text-foreground' : 'text-muted',
                  )}
                  type="button"
                  onClick={() => {
                    setMode('sign-up')
                    setLocalError(null)
                    setSuccessMessage(null)
                  }}
                >
                  Sign up
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === 'sign-up' ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Display name</span>
                    <input
                      className="studio-input"
                      name="displayName"
                      placeholder="Alex Rivera"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </label>
                ) : null}

                {mode === 'sign-up' ? (
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-foreground">Username</span>
                    <input
                      className="studio-input"
                      name="username"
                      placeholder="alex"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </label>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Email</span>
                  <input
                    autoComplete="email"
                    className="studio-input"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-foreground">Password</span>
                  <input
                    autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                    className="studio-input"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                {localError || authError ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {localError ?? authError}
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {successMessage}
                  </div>
                ) : null}

                <button
                  className="studio-button studio-button--primary w-full justify-center"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Working…' : primaryLabel}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}