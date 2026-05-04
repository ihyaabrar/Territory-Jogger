/**
 * NotificationHistory — Territory Runner
 *
 * Komponen daftar riwayat notifikasi invasion yang dapat diakses
 * dari menu profil pengguna.
 *
 * Fitur:
 * - Menampilkan daftar notifikasi invasion (terbaru di atas)
 * - Menampilkan badge unread count
 * - Tombol "Tandai semua dibaca"
 * - Toggle aktifkan/nonaktifkan notifikasi (Persyaratan 9.4)
 * - Klik notifikasi untuk menandai sebagai dibaca
 *
 * Persyaratan: 9.3, 9.4
 */

import type { InvasionNotification } from '../../types'

// ─── Tipe Props ───────────────────────────────────────────────────────────────

interface NotificationHistoryProps {
  /** Daftar notifikasi invasion */
  notifications: InvasionNotification[]
  /** Jumlah notifikasi belum dibaca */
  unreadCount: number
  /** Apakah sedang memuat */
  isLoading: boolean
  /** Error jika ada */
  error: string | null
  /** Apakah notifikasi diaktifkan */
  notificationsEnabled: boolean
  /** Toggle aktifkan/nonaktifkan notifikasi */
  onToggleNotifications: () => void
  /** Tandai satu notifikasi sebagai dibaca */
  onMarkAsRead: (id: string) => Promise<void>
  /** Tandai semua sebagai dibaca */
  onMarkAllAsRead: () => Promise<void>
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: 480,
    margin: '0 auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    margin: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 20,
    height: 20,
    padding: '0 6px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderRadius: '9999px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem',
    backgroundColor: '#f9fafb',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
  },
  toggleLabel: {
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: 500,
  },
  toggleButton: {
    position: 'relative' as const,
    display: 'inline-flex',
    alignItems: 'center',
    width: 44,
    height: 24,
    borderRadius: '9999px',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    padding: 0,
  },
  toggleThumb: {
    position: 'absolute' as const,
    width: 18,
    height: 18,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  markAllButton: {
    padding: '0.375rem 0.75rem',
    backgroundColor: 'transparent',
    color: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: '0.375rem',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '0.5rem',
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  itemUnread: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  itemRead: {
    backgroundColor: '#ffffff',
  },
  itemIcon: {
    fontSize: '1.5rem',
    flexShrink: 0,
    lineHeight: 1,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 0.25rem',
  },
  itemBody: {
    fontSize: '0.8rem',
    color: '#6b7280',
    margin: '0 0 0.25rem',
  },
  itemTime: {
    fontSize: '0.7rem',
    color: '#9ca3af',
    margin: 0,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    backgroundColor: '#ef4444',
    flexShrink: 0,
    marginTop: 6,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '3rem 1rem',
    color: '#9ca3af',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '0.75rem',
  },
  emptyText: {
    fontSize: '0.875rem',
    margin: 0,
  },
  loadingText: {
    textAlign: 'center' as const,
    color: '#6b7280',
    padding: '2rem',
    fontSize: '0.875rem',
  },
  errorText: {
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.375rem',
    color: '#dc2626',
    fontSize: '0.875rem',
  },
} as const

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Format waktu relatif (misalnya "2 menit lalu", "1 jam lalu").
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`

  return new Date(isoString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Daftar riwayat notifikasi invasion.
 * Dapat diakses dari menu profil pengguna.
 * Persyaratan: 9.3, 9.4
 */
export function NotificationHistory({
  notifications,
  unreadCount,
  isLoading,
  error,
  notificationsEnabled,
  onToggleNotifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationHistoryProps) {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <h2 style={styles.title}>Notifikasi</h2>
          {unreadCount > 0 && (
            <span
              style={styles.badge}
              aria-label={`${unreadCount} notifikasi belum dibaca`}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>

        <div style={styles.actions}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void onMarkAllAsRead()}
              style={styles.markAllButton}
              aria-label="Tandai semua notifikasi sebagai sudah dibaca"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
      </div>

      {/* Toggle notifikasi — Persyaratan 9.4 */}
      <div style={styles.toggleRow}>
        <span style={styles.toggleLabel}>
          🔔 Notifikasi Invasion
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={notificationsEnabled}
          aria-label={notificationsEnabled ? 'Nonaktifkan notifikasi invasion' : 'Aktifkan notifikasi invasion'}
          onClick={onToggleNotifications}
          style={{
            ...styles.toggleButton,
            backgroundColor: notificationsEnabled ? '#2563eb' : '#d1d5db',
          }}
        >
          <span
            style={{
              ...styles.toggleThumb,
              transform: notificationsEnabled ? 'translateX(22px)' : 'translateX(3px)',
            }}
          />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" style={styles.errorText}>
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <p style={styles.loadingText}>Memuat notifikasi...</p>
      )}

      {/* Daftar notifikasi — Persyaratan 9.3 */}
      {!isLoading && !error && (
        <>
          {notifications.length === 0 ? (
            <div style={styles.emptyState} aria-label="Tidak ada notifikasi">
              <div style={styles.emptyIcon} aria-hidden="true">🛡️</div>
              <p style={styles.emptyText}>
                Belum ada notifikasi invasion.
                <br />
                Wilayahmu aman!
              </p>
            </div>
          ) : (
            <ul
              style={styles.list}
              role="list"
              aria-label="Riwayat notifikasi invasion"
            >
              {notifications.map(notification => (
                <li
                  key={notification.id}
                  role="listitem"
                  style={{
                    ...styles.item,
                    ...(notification.isRead ? styles.itemRead : styles.itemUnread),
                  }}
                  onClick={() => {
                    if (!notification.isRead) {
                      void onMarkAsRead(notification.id)
                    }
                  }}
                  aria-label={
                    `Invasion oleh ${notification.attackerUsername}, ` +
                    `${notification.areaLostKm2.toFixed(4)} km², ` +
                    `${formatRelativeTime(notification.createdAt)}`
                  }
                >
                  <span style={styles.itemIcon} aria-hidden="true">⚔️</span>

                  <div style={styles.itemContent}>
                    <p style={styles.itemTitle}>
                      Wilayahmu diserang!
                    </p>
                    <p style={styles.itemBody}>
                      <strong>{notification.attackerUsername}</strong> mengambil{' '}
                      <strong>{notification.areaLostKm2.toFixed(4)} km²</strong> wilayahmu
                    </p>
                    <p style={styles.itemTime}>
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {!notification.isRead && (
                    <span
                      style={styles.unreadDot}
                      aria-label="Belum dibaca"
                      role="img"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
