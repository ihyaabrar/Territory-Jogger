/**
 * NotificationHistory — Territory Runner
 * Redesign dengan Red Rose theme, modern cards
 */

import type { InvasionNotification } from '../../types'

const ROSE = '#C0392B'

interface NotificationHistoryProps {
  notifications: InvasionNotification[]
  unreadCount: number
  isLoading: boolean
  error: string | null
  notificationsEnabled: boolean
  onToggleNotifications: () => void
  onMarkAsRead: (id: string) => Promise<void>
  onMarkAllAsRead: () => Promise<void>
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

export function NotificationHistory({
  notifications, unreadCount, isLoading, error,
  notificationsEnabled, onToggleNotifications, onMarkAsRead, onMarkAllAsRead,
}: NotificationHistoryProps) {
  return (
    <div style={{ background: '#F5F4F4', minHeight: '100%', paddingBottom: 24 }}>

      {/* Hero header */}
      <div style={{
        background: `linear-gradient(135deg, ${ROSE} 0%, #96281B 100%)`,
        padding: '20px 20px 24px',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>Notifikasi</h1>
              {unreadCount > 0 && (
                <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void onMarkAllAsRead()}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 99, padding: '6px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                Tandai semua dibaca
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            Serangan wilayah dari pemain lain
          </p>
        </div>
      </div>

      {/* Toggle notifikasi */}
      <div style={{ margin: '14px 16px 0', background: '#fff', borderRadius: 18, padding: '14px 16px', border: '1px solid #F0EEEE', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: notificationsEnabled ? 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)' : '#F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={notificationsEnabled ? ROSE : '#AAA'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Notifikasi Invasion</p>
            <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>{notificationsEnabled ? 'Aktif' : 'Nonaktif'}</p>
          </div>
        </div>
        <button type="button" role="switch" aria-checked={notificationsEnabled} onClick={onToggleNotifications}
          style={{
            width: 46, height: 26, borderRadius: 13,
            background: notificationsEnabled ? `linear-gradient(135deg, ${ROSE} 0%, #96281B 100%)` : '#E0E0E0',
            border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            boxShadow: notificationsEnabled ? '0 2px 8px rgba(192,57,43,0.3)' : 'none',
          }}>
          <div style={{
            position: 'absolute', top: 3,
            left: notificationsEnabled ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{ margin: '10px 16px 0', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, fontSize: 12, color: ROSE, fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px 0' }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 18, opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      )}

      {/* Notification list */}
      {!isLoading && !error && (
        <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 22, padding: '32px 20px', textAlign: 'center', border: '1px solid #F0EEEE', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>Wilayahmu aman!</p>
              <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Belum ada serangan dari pemain lain</p>
            </div>
          ) : (
            notifications.map((n, idx) => (
              <div key={n.id}
                onClick={() => { if (!n.isRead) void onMarkAsRead(n.id) }}
                style={{
                  background: n.isRead ? '#fff' : 'linear-gradient(135deg, #FFF5F4 0%, #FDECEA 100%)',
                  borderRadius: 18, padding: '14px 16px',
                  border: n.isRead ? '1px solid #F0EEEE' : `1px solid rgba(192,57,43,0.15)`,
                  boxShadow: n.isRead ? '0 2px 10px rgba(0,0,0,0.04)' : '0 2px 16px rgba(192,57,43,0.1)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  animation: 'fade-in 0.3s ease',
                  animationDelay: `${idx * 0.05}s`,
                  animationFillMode: 'both',
                  transition: 'transform 0.15s',
                }}>
                {/* Icon */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: n.isRead ? '#F5F5F5' : 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M4 4L14 14" stroke={n.isRead ? '#AAA' : ROSE} strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 4L6 4L4 6" stroke={n.isRead ? '#AAA' : ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 14L12 17L15 16L14 14Z" fill={n.isRead ? '#AAA' : ROSE}/>
                    <path d="M20 4L10 14" stroke={n.isRead ? '#AAA' : ROSE} strokeWidth="2" strokeLinecap="round"/>
                    <path d="M20 4L18 4L20 6" stroke={n.isRead ? '#AAA' : ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 14L12 17L9 16L10 14Z" fill={n.isRead ? '#AAA' : ROSE}/>
                  </svg>
                </div>
                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 3px' }}>
                    Wilayahmu diserang!
                  </p>
                  <p style={{ fontSize: 12, color: '#666', margin: '0 0 4px', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: n.isRead ? '#555' : ROSE }}>{n.attackerUsername}</span>
                    {' '}mengambil{' '}
                    <span style={{ fontWeight: 700 }}>{n.areaLostKm2.toFixed(4)} km²</span>
                  </p>
                  <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>{formatRelativeTime(n.createdAt)}</p>
                </div>
                {/* Unread dot */}
                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROSE, flexShrink: 0, marginTop: 4, boxShadow: `0 0 6px ${ROSE}` }} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
