import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextType {
  /** Currently authenticated user, or null if not signed in. */
  user: User | null
  /** Current Supabase session, or null if not signed in. */
  session: Session | null
  /**
   * True once the initial session check has completed.
   * Use this to avoid rendering auth-gated UI before we know the auth state.
   */
  initialized: boolean
  /** Sign the current user out and clear the local session. */
  signOut: () => Promise<void>
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  initialized: false,
  signOut: async () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

/**
 * Wraps the application and provides authentication state to all descendants.
 *
 * Responsibilities:
 * - Loads the persisted session on mount (Persyaratan 1.4)
 * - Listens for auth state changes via `onAuthStateChange` (Persyaratan 1.4)
 * - Auto-refreshes tokens via Supabase's built-in mechanism (Persyaratan 1.5)
 * - Sets `user` and `session` to null when the token expires / user signs out,
 *   which consumers can use to redirect to the login page (Persyaratan 1.5)
 */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // Load the persisted session from localStorage on first render.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      setInitialized(true)
    })

    // Subscribe to all auth state changes:
    //   SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, USER_UPDATED, PASSWORD_RECOVERY
    // When the token expires and cannot be refreshed, Supabase emits SIGNED_OUT
    // with a null session — consumers should redirect to login at that point.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, updatedSession) => {
      setSession(updatedSession)
      setUser(updatedSession?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange will fire with null session, clearing state above.
  }

  return (
    <AuthContext.Provider value={{ user, session, initialized, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Returns the current authentication context.
 * Must be used inside an `<AuthProvider>`.
 */
export function useAuth(): AuthContextType {
  return useContext(AuthContext)
}
