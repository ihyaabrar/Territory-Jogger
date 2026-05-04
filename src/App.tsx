/**
 * App.tsx — Territory Runner
 * Light theme, Strava-inspired navigation
 */

import { useState, useCallback, useMemo, useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import type { Feature, LineString } from 'geojson'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { LoginForm, RegisterForm } from './components/auth'
import { MapView } from './components/map'
import { RunSession } from './components/run'
import { Dashboard } from './components/dashboard/Dashboard'
import { HistoryPage } from './components/history/HistoryPage'
import { LeaderboardPage } from './components/leaderboard'
import { ProfileSettings } from './components/profile'
import { NotificationHistory } from './components/notifications'
import { PrivacyZoneManager } from './components/privacy'
import { useRealtimeTerritories } from './hooks/useRealtimeTerritories'
import { useMapViewport } from './hooks/useMapViewport'
import { useInvasionNotifications } from './hooks/useInvasionNotifications'
import { useTerritoryStore } from './stores/territoryStore'
import { getProfile } from './services/profileService'
import {
  IconHome, IconMap, IconTrophy, IconUser,
} from './components/ui/Icons'
import { gpsTracker } from './services/gpsTracker'
import { isSupabaseConfigured } from './lib/supabase'
import { registerOfflineSyncListener } from './services/territoryService'
import type { ViewportBBox } from './services/territoryService'
import type { UserProfile } from './types/index'

type NavPage = 'home' | 'map' | 'history' | 'leaderboard' | 'profile'
type AuthView = 'login' | 'register'

const NAV_HEIGHT = 72

// ─── Error Boundary ────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; message: string }
class AppErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, message: error.message }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16, background: '#F8F7F7', padding: 24 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/>
            <path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/>
          </svg>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', margin: 0, textAlign: 'center' }}>Terjadi Kesalahan</h2>
          <p style={{ fontSize: 13, color: '#888', textAlign: 'center', maxWidth: 280 }}>{this.state.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Muat Ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Offline Banner ────────────────────────────────────────────────────────────
function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  useEffect(() => {
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (!offline) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#1A1A1A', color: '#fff', fontSize: 12, fontWeight: 600,
      textAlign: 'center', padding: '6px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M1 1L23 23" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Tidak ada koneksi — klaim akan disimpan lokal
    </div>
  )
}

function AppContent() {
  const { user, initialized, signOut } = useAuth()
  const [authView, setAuthView] = useState<AuthView>('login')
  const [activePage, setActivePage] = useState<NavPage>('home')
  const [isRunning, setIsRunning] = useState(false)
  // RunSession selalu di-render saat di halaman map, bukan toggle
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null)
  const [runTrack, setRunTrack] = useState<Feature<LineString> | null>(null)
  const [currentViewport, setCurrentViewport] = useState<ViewportBBox | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  const territoriesMap = useTerritoryStore((state) => state.territories)
  const territories = useMemo(() => Array.from(territoriesMap.values()), [territoriesMap])
  const totalTerritoryKm2 = useMemo(
    () => territories.reduce((sum, t) => sum + t.areaKm2, 0),
    [territories]
  )

  const { handleViewportChange } = useMapViewport()
  useRealtimeTerritories({ currentViewport, enabled: !!user })

  const {
    notifications, unreadCount, isLoading: notifLoading, error: notifError,
    notificationsEnabled, toggleNotifications, markAsRead, markAllAsRead,
    latestUnread, dismissLatest,
  } = useInvasionNotifications({ userId: user?.id ?? null, isRunning })

  const handleViewportChangeWrapper = useCallback((bounds: ViewportBBox) => {
    setCurrentViewport(bounds)
    handleViewportChange(bounds)
  }, [handleViewportChange])

  const handlePositionUpdate = useCallback((position: { lat: number; lng: number } | null) => {
    setUserPosition(position)
  }, [])

  // Auto-request current location when user opens the map page (without starting a run)
  useEffect(() => {
    if (activePage !== 'map') return
    if (userPosition) return // already have position
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => { /* silently ignore — user can still use map without GPS */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    )
  }, [activePage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrackUpdate = useCallback((track: Feature<LineString> | null) => {
    setRunTrack(track)
  }, [])

  const handleSessionChange = useCallback((running: boolean) => {
    setIsRunning(running)
    if (!running) {
      // Don't clear userPosition here — RunSession keeps marker visible after stop
      // so user can see where they finished. Position is cleared by onPositionUpdate(null)
      // only on speed violation or GPS lost.
      setRunTrack(null)
    }
  }, [])

  const handleSignOut = useCallback(async () => {
    // Stop GPS session if active before signing out
    if (gpsTracker._isSessionActive) {
      try { await gpsTracker.stopSession() } catch { /* ignore */ }
    }
    setUserPosition(null)
    setRunTrack(null)
    setIsRunning(false)
    setActivePage('home')
    // Clear territory store so stale data doesn't show for next user
    useTerritoryStore.getState().clearTerritories()
    await signOut()
  }, [signOut])

  const handleProfileSaved = useCallback((profile: UserProfile) => {
    setUserProfile(profile)
  }, [])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(({ data }) => {
      if (data) setUserProfile(data)
    })
  }, [user])

  // Register offline sync listener once on mount
  useEffect(() => {
    const cleanup = registerOfflineSyncListener()
    return cleanup
  }, [])

  const userColor = userProfile?.userColor ?? '#C0392B'
  const username = userProfile?.username ?? (user?.email?.split('@')[0] ?? 'Jogger')

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (!initialized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12, background: '#F8F8F8' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(192,57,43,0.15)', borderTopColor: '#C0392B', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#888', fontSize: 14 }}>Memuat...</p>
      </div>
    )
  }

  // ─── Missing env vars — already handled in App() before AuthProvider ──────

  // ─── Auth ──────────────────────────────────────────────────────────────────
  if (!user) {
    return authView === 'login'
      ? <LoginForm onSuccess={() => {}} onSwitchToRegister={() => setAuthView('register')} />
      : <RegisterForm onSuccess={() => setAuthView('login')} onSwitchToLogin={() => setAuthView('login')} />
  }

  // ─── Notification overlay ──────────────────────────────────────────────────
  if (showNotifications) {
    return (
      <div style={{ height: '100dvh', background: '#F8F8F8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F0F0F0', background: '#fff' }}>
          <button type="button" onClick={() => setShowNotifications(false)}
            style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
            ← Kembali
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Notifikasi</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <NotificationHistory
            notifications={notifications} unreadCount={unreadCount}
            isLoading={notifLoading} error={notifError}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={toggleNotifications}
            onMarkAsRead={markAsRead} onMarkAllAsRead={markAllAsRead}
          />
        </div>
      </div>
    )
  }

  // ─── Privacy overlay ───────────────────────────────────────────────────────
  if (showPrivacy) {
    return (
      <div style={{ height: '100dvh', background: '#F8F8F8', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #F0F0F0', background: '#fff' }}>
          <button type="button" onClick={() => setShowPrivacy(false)}
            style={{ background: 'none', border: 'none', color: '#C0392B', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
            ← Kembali
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Privacy Zone</h1>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <PrivacyZoneManager userId={user.id} />
        </div>
      </div>
    )
  }

  // ─── Main app ──────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%', height: '100dvh', background: '#F5F5F7', overflow: 'hidden', position: 'relative' }}>

      {/* ── MAP CONTAINER — always mounted so Leaflet stays initialized ── */}
      {/* visibility:hidden keeps Leaflet alive but hides it visually */}
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        height: `calc(100dvh - ${NAV_HEIGHT}px)`,
        visibility: activePage === 'map' ? 'visible' : 'hidden',
        zIndex: activePage === 'map' ? 20 : 0,
        pointerEvents: activePage === 'map' ? 'auto' : 'none',
      }}>
        <MapView
          territories={territories}
          userPosition={userPosition}
          userColor={userColor}
          runTrack={runTrack}
          onViewportChange={handleViewportChangeWrapper}
          isVisible={activePage === 'map'}
        />
      </div>

      {/* ── RUN SESSION — ONLY render on map page, outside map container ── */}
      {activePage === 'map' && (
        <RunSession
          userId={user.id}
          userColor={userColor}
          username={username}
          onPositionUpdate={handlePositionUpdate}
          onTrackUpdate={handleTrackUpdate}
          onSessionChange={handleSessionChange}
          latestInvasion={latestUnread}
          onDismissInvasion={dismissLatest}
          totalTerritoryKm2={totalTerritoryKm2}
        />
      )}

      {/* ── NON-MAP PAGES ── */}
      {activePage !== 'map' && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          height: `calc(100dvh - ${NAV_HEIGHT}px)`,
          overflowY: 'auto',
          background: '#F5F5F7',
          zIndex: 20,
        }}>
          {activePage === 'home' && (
            <Dashboard
              userId={user.id}
              userProfile={userProfile}
              totalTerritoryKm2={totalTerritoryKm2}
              onNavigate={(page) => {
                if (page === 'notifications') { setShowNotifications(true); return }
                if (page === 'privacy') { setShowPrivacy(true); return }
                setActivePage(page as NavPage)
              }}
            />
          )}
          {activePage === 'history' && (
            <HistoryPage userId={user.id} totalTerritoryKm2={totalTerritoryKm2} />
          )}
          {activePage === 'leaderboard' && <LeaderboardPage userId={user.id} />}
          {activePage === 'profile' && (
            <ProfileSettings
              userId={user.id}
              onSaved={handleProfileSaved}
              totalTerritoryKm2={totalTerritoryKm2}
              onSignOut={() => void handleSignOut()}
              onShowNotifications={() => setShowNotifications(true)}
              onShowPrivacy={() => setShowPrivacy(true)}
              unreadCount={unreadCount}
            />
          )}
        </div>
      )}

      {/* ── BOTTOM NAV — Behance style with floating center button ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 72,
        background: '#FFFFFF',
        borderTop: '1px solid #F0F0F0',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
      }} aria-label="Navigasi utama">

        <NavBtn active={activePage === 'home'} onClick={() => setActivePage('home')} label="Summary">
          <IconHome size={20} color={activePage === 'home' ? '#C0392B' : '#CCCCCC'} />
        </NavBtn>

        <NavBtn active={activePage === 'history'} onClick={() => setActivePage('history')} label="Riwayat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12L15 15" stroke={activePage === 'history' ? '#C0392B' : '#CCCCCC'} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke={activePage === 'history' ? '#C0392B' : '#CCCCCC'} strokeWidth="2"/>
          </svg>
        </NavBtn>

        {/* Activity — CENTER slot (position 3 of 5) */}
        <NavBtn active={activePage === 'map'} onClick={() => setActivePage('map')} label="Activity" hideIndicator={true}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: activePage === 'map' ? '#C0392B' : '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: activePage === 'map' ? '0 4px 16px rgba(192,57,43,0.4)' : 'none',
            transition: 'all 0.2s',
            marginTop: -14,
            border: activePage === 'map' ? 'none' : '1px solid #E8E8E8',
          }}>
            <IconMap size={22} color={activePage === 'map' ? '#fff' : '#AAAAAA'} />
          </div>
          {/* Active dot below the floating button */}
          {activePage === 'map' && (
            <span style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 20, height: 3, borderRadius: '3px 3px 0 0', background: '#C0392B',
            }} />
          )}
        </NavBtn>

        <NavBtn active={activePage === 'leaderboard'} onClick={() => setActivePage('leaderboard')} label="Peringkat">
          <IconTrophy size={20} color={activePage === 'leaderboard' ? '#C0392B' : '#CCCCCC'} />
        </NavBtn>

        <NavBtn active={activePage === 'profile'} onClick={() => setActivePage('profile')} label="Settings">
          <div style={{ position: 'relative' }}>
            <IconUser size={20} color={activePage === 'profile' ? '#C0392B' : '#CCCCCC'} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#C0392B', borderRadius: '50%', fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </NavBtn>
      </nav>
    </div>
  )
}

function NavBtn({ active, onClick, label, children, hideIndicator = false }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode; hideIndicator?: boolean
}) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 3, padding: '6px 4px',
        border: 'none', background: 'transparent',
        cursor: 'pointer', position: 'relative', minWidth: 0,
      }}>
      {children}
      <span style={{
        fontSize: 9, fontWeight: active ? 700 : 500,
        color: active ? '#C0392B' : '#CCCCCC',
        letterSpacing: '0.02em', lineHeight: 1,
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      {active && !hideIndicator && (
        <span style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 3, borderRadius: '3px 3px 0 0', background: '#C0392B',
        }} />
      )}
    </button>
  )
}

function App() {
  // Check config before mounting AuthProvider to avoid hanging on placeholder URL
  if (!isSupabaseConfigured) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16, background: '#F8F7F7', padding: 24 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/>
          <path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/>
        </svg>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', margin: 0, textAlign: 'center' }}>Konfigurasi Diperlukan</h2>
        <p style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
          Salin file <code style={{ background: '#F0F0F0', padding: '2px 6px', borderRadius: 4 }}>.env.example</code> ke{' '}
          <code style={{ background: '#F0F0F0', padding: '2px 6px', borderRadius: 4 }}>.env</code> dan isi dengan kredensial Supabase kamu.
        </p>
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', border: '1px solid #F0F0F0', fontFamily: 'monospace', fontSize: 12, color: '#555', width: '100%', maxWidth: 320 }}>
          VITE_SUPABASE_URL=https://xxx.supabase.co<br />
          VITE_SUPABASE_ANON_KEY=eyJ...
        </div>
      </div>
    )
  }
  return (
    <AppErrorBoundary>
      <OfflineBanner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppErrorBoundary>
  )
}

export default App
