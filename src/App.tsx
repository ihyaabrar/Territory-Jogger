/**
 * App.tsx — Territory Jogger
 * Light theme, Strava-inspired navigation
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
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
import type { ViewportBBox } from './services/territoryService'
import type { UserProfile } from './types/index'

type NavPage = 'home' | 'map' | 'history' | 'leaderboard' | 'profile'
type AuthView = 'login' | 'register'

const NAV_HEIGHT = 68

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

  const handlePositionUpdate = useCallback((position: { lat: number; lng: number } | undefined) => {
    setUserPosition(position ?? null)
  }, [])

  const handleTrackUpdate = useCallback((track: Feature<LineString> | null) => {
    setRunTrack(track)
  }, [])

  const handleSessionChange = useCallback((running: boolean) => {
    setIsRunning(running)
    if (!running) {
      setUserPosition(null)
      setRunTrack(null)
    }
  }, [])

  const handleProfileSaved = useCallback((profile: UserProfile) => {
    setUserProfile(profile)
  }, [])

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(({ data }) => {
      if (data) setUserProfile(data)
    })
  }, [user])

  const userColor = userProfile?.userColor ?? '#FF6B35'
  const username = userProfile?.username ?? (user?.email?.split('@')[0] ?? 'Jogger')

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (!initialized) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12, background: 'var(--color-bg)' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(255,107,53,0.15)', borderTopColor: '#FF6B35', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Memuat...</p>
      </div>
    )
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
  if (!user) {
    return authView === 'login'
      ? <LoginForm onSuccess={() => {}} onSwitchToRegister={() => setAuthView('register')} />
      : <RegisterForm onSuccess={() => setAuthView('login')} onSwitchToLogin={() => setAuthView('login')} />
  }

  // ─── Notification overlay ──────────────────────────────────────────────────
  if (showNotifications) {
    return (
      <div style={{ height: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: '#fff' }}>
          <button type="button" onClick={() => setShowNotifications(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-orange)', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
            ← Kembali
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Notifikasi</h1>
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
      <div style={{ height: '100dvh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: '#fff' }}>
          <button type="button" onClick={() => setShowPrivacy(false)}
            style={{ background: 'none', border: 'none', color: 'var(--color-orange)', cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0 }}>
            ← Kembali
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Privacy Zone</h1>
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
              onSignOut={() => void signOut()}
              onShowNotifications={() => setShowNotifications(true)}
              onShowPrivacy={() => setShowPrivacy(true)}
              unreadCount={unreadCount}
            />
          )}
        </div>
      )}

      {/* ── BOTTOM NAV — Behance style ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 68,
        background: '#FFFFFF',
        borderTop: '1px solid #F0F0F0',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        boxShadow: '0 -2px 16px rgba(0,0,0,0.06)',
      }} aria-label="Navigasi utama">

        <NavBtn active={activePage === 'home'} onClick={() => setActivePage('home')} label="Summary">
          <IconHome size={20} color={activePage === 'home' ? '#FF6B35' : '#CCCCCC'} />
        </NavBtn>

        <NavBtn active={activePage === 'map'} onClick={() => setActivePage('map')} label="Activity">
          <IconMap size={20} color={activePage === 'map' ? '#FF6B35' : '#CCCCCC'} />
        </NavBtn>

        {/* History — center */}
        <NavBtn active={activePage === 'history'} onClick={() => setActivePage('history')} label="Riwayat">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 8V12L15 15" stroke={activePage === 'history' ? '#FF6B35' : '#CCCCCC'} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="9" stroke={activePage === 'history' ? '#FF6B35' : '#CCCCCC'} strokeWidth="2"/>
          </svg>
        </NavBtn>

        <NavBtn active={activePage === 'leaderboard'} onClick={() => setActivePage('leaderboard')} label="Peringkat">
          <IconTrophy size={20} color={activePage === 'leaderboard' ? '#FF6B35' : '#CCCCCC'} />
        </NavBtn>

        <NavBtn active={activePage === 'profile'} onClick={() => setActivePage('profile')} label="Settings">
          <div style={{ position: 'relative' }}>
            <IconUser size={20} color={activePage === 'profile' ? '#FF6B35' : '#CCCCCC'} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#FF6B35', borderRadius: '50%', fontSize: 8, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </NavBtn>
      </nav>
    </div>
  )
}

function NavBtn({ active, onClick, label, children }: {
  active: boolean; onClick: () => void; label: string; children: React.ReactNode
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
        color: active ? '#FF6B35' : '#CCCCCC',
        letterSpacing: '0.02em', lineHeight: 1,
        transition: 'color 0.15s',
      }}>
        {label}
      </span>
      {active && (
        <span style={{
          position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 3, borderRadius: '3px 3px 0 0', background: '#FF6B35',
        }} />
      )}
    </button>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
