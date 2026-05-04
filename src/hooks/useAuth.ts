/**
 * Re-exports the `useAuth` hook from AuthContext for convenient import.
 *
 * Usage:
 *   import { useAuth } from '../hooks/useAuth'
 *
 * This keeps the hook accessible from both the context module and the hooks
 * directory, following the project's convention of co-locating hooks under
 * `src/hooks/`.
 */
export { useAuth } from '../contexts/AuthContext'
export type { AuthContextType } from '../contexts/AuthContext'
