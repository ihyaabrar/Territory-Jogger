/**
 * HistoryPage — Riwayat Jogging
 * Strava-inspired activity feed dengan stats lengkap
 */

import { useState, useEffect, useCallback } from 'react'
import { getRecentSessions, formatDuration, formatRelativeTime, type RunSessionRecord } from '../../services/runSessionService'
import { RunnerIllustration } from '../ui/Icons'

interface HistoryPageProps {
  userId: string
  totalTerritoryKm2: number
}

function StatPill({ label, value, color = '#C0392B' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span style={{ fontSize: 15, fontWeight: 900, color, letterSpacing: '-0.02em' }}>{value}</span>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function ActivityCard({ session, index }: { session: RunSessionRecord; index: number }) {
  const pace = session.durationSec > 0 && session.distanceKm > 0
    ? (() => {
        const pps = session.durationSec / session.distanceKm
        return `${String(Math.floor(pps / 60)).padStart(2,'0')}:${String(Math.floor(pps % 60)).padStart(2,'0')}`
      })()
    : '—'

  const date = new Date(session.startedAt)
  const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: '#fff',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid #F5F5F5',
      animation: 'fade-in 0.3s ease',
      animationDelay: `${index * 0.05}s`,
      animationFillMode: 'both',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F8F8F8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RunnerIllustration size={20} color="#C0392B" />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 2px' }}>{dayName} Run</p>
              <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>{dateStr} · {timeStr}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#CCC', fontWeight: 500 }}>{formatRelativeTime(session.startedAt)}</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <StatPill label="Jarak" value={`${session.distanceKm.toFixed(2)} km`} color="#C0392B" />
        <div style={{ width: 1, height: 32, background: '#F0F0F0' }} />
        <StatPill label="Durasi" value={formatDuration(session.durationSec)} color="#1A1A1A" />
        <div style={{ width: 1, height: 32, background: '#F0F0F0' }} />
        <StatPill label="Pace" value={`${pace}/km`} color="#1A1A1A" />
        <div style={{ width: 1, height: 32, background: '#F0F0F0' }} />
        <StatPill label="Kalori" value={`${session.caloriesKcal}`} color="#F59E0B" />
      </div>
    </div>
  )
}

function TotalStats({ sessions }: { sessions: RunSessionRecord[] }) {
  const totalDist = sessions.reduce((s, r) => s + r.distanceKm, 0)
  const totalDur = sessions.reduce((s, r) => s + r.durationSec, 0)
  const totalKcal = sessions.reduce((s, r) => s + r.caloriesKcal, 0)

  return (
    <div style={{ background: '#C0392B', borderRadius: 20, padding: '16px 20px', margin: '0 16px 16px', boxShadow: '0 4px 20px rgba(192,57,43,0.3)' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Total Semua Aktivitas
      </p>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{totalDist.toFixed(1)}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>km</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{sessions.length}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>sesi</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{formatDuration(totalDur)}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>waktu</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em' }}>{totalKcal}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>kcal</p>
        </div>
      </div>
    </div>
  )
}

export function HistoryPage({ userId, totalTerritoryKm2 }: HistoryPageProps) {
  const [sessions, setSessions] = useState<RunSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all')
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadSessions = useCallback(async (f: 'all' | 'week' | 'month') => {
    setLoading(true)
    setLoadError(null)
    try {
      let since: Date | undefined
      const now = new Date()
      if (f === 'week') {
        since = new Date(now)
        since.setDate(now.getDate() - 7)
      } else if (f === 'month') {
        since = new Date(now)
        since.setMonth(now.getMonth() - 1)
      }
      const data = await getRecentSessions(userId, 100, since)
      setSessions(data)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat riwayat')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void loadSessions(filter) }, [loadSessions, filter])

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100%', paddingBottom: 16 }}>

      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px 14px', borderBottom: '1px solid #F5F5F5', marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Riwayat Lari</h1>
        <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>{sessions.length} aktivitas{filter !== 'all' ? ` (${filter === 'week' ? '7 hari' : '30 hari'} terakhir)` : ' tercatat'}</p>
      </div>

      {/* Error banner */}
      {loadError && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/><path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/></svg>
          <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 600, flex: 1 }}>{loadError}</span>
          <button type="button" onClick={() => void loadSessions(filter)} style={{ fontSize: 11, color: '#C0392B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Coba lagi</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', gap: 8 }}>
        {(['all', 'week', 'month'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px', borderRadius: 99,
              background: filter === f ? '#C0392B' : '#fff',
              border: filter === f ? 'none' : '1px solid #F0F0F0',
              color: filter === f ? '#fff' : '#AAA',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: filter === f ? '0 2px 8px rgba(192,57,43,0.3)' : 'none',
            }}>
            {f === 'all' ? 'Semua' : f === 'week' ? '7 Hari' : '30 Hari'}
          </button>
        ))}
      </div>

      {/* Total stats */}
      {!loading && sessions.length > 0 && <TotalStats sessions={sessions} />}

      {/* Territory stat */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 16, padding: '14px 16px', border: '1px solid #F5F5F5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Map pin SVG */}
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6L9 4L15 7L21 5V19L15 21L9 18L3 20V6Z" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="9" y1="4" x2="9" y2="18" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
              <line x1="15" y1="7" x2="15" y2="21" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 12, color: '#AAA', margin: '0 0 2px', fontWeight: 600 }}>Total Wilayah Dikuasai</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.02em' }}>{totalTerritoryKm2.toFixed(3)}</span>
              <span style={{ fontSize: 11, color: '#AAA', fontWeight: 600 }}>km²</span>
            </div>
          </div>
        </div>
        {/* Flag SVG */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M5 3V21" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
          <path d="M5 4.5L19 4.5L15 9.5L19 14.5L5 14.5" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Activity list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 120, background: '#fff', borderRadius: 20, border: '1px solid #F5F5F5', opacity: 1 - i * 0.2 }} />
          ))
        ) : sessions.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <RunnerIllustration size={48} color="#C0392B" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>Belum ada aktivitas</p>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Mulai lari pertamamu!</p>
          </div>
        ) : (
          sessions.map((s, i) => <ActivityCard key={s.id} session={s} index={i} />)
        )}
      </div>
    </div>
  )
}
