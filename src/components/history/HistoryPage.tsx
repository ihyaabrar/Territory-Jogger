/**
 * HistoryPage — Territory Runner
 * Konsisten dengan Dashboard: gradient hero, modern cards
 */

import { useState, useEffect, useCallback } from 'react'
import { getRecentSessions, formatDuration, formatRelativeTime, type RunSessionRecord } from '../../services/runSessionService'
import { RunnerIllustration } from '../ui/Icons'

const ROSE = '#C0392B'
const ROSE_DEEP = '#96281B'

interface HistoryPageProps {
  userId: string
  totalTerritoryKm2: number
}

function ActivityCard({ session, index }: { session: RunSessionRecord; index: number }) {
  const pace = session.durationSec > 0 && session.distanceKm > 0
    ? (() => {
        const s = session.durationSec / session.distanceKm
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      })()
    : '—'

  const date = new Date(session.startedAt)
  const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' })
  const dateStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: '#fff', borderRadius: 20, overflow: 'hidden',
      boxShadow: '0 2px 14px rgba(0,0,0,0.06)', border: '1px solid #F0EEEE',
      animation: 'fade-in 0.3s ease',
      animationDelay: `${index * 0.05}s`, animationFillMode: 'both',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid #F8F6F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RunnerIllustration size={20} color={ROSE} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 2px' }}>{dayName} Run</p>
              <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>{dateStr} · {timeStr}</p>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#CCC', fontWeight: 500 }}>{formatRelativeTime(session.startedAt)}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr', alignItems: 'center', gap: 0 }}>
        <StatPill label="Jarak" value={`${session.distanceKm.toFixed(2)}`} unit="km" color={ROSE} />
        <div style={{ height: 28, background: '#F0EEEE' }} />
        <StatPill label="Durasi" value={formatDuration(session.durationSec)} color="#1A1A1A" />
        <div style={{ height: 28, background: '#F0EEEE' }} />
        <StatPill label="Pace" value={pace} unit="/km" color="#1A1A1A" />
        <div style={{ height: 28, background: '#F0EEEE' }} />
        <StatPill label="Kalori" value={`${session.caloriesKcal}`} unit="kkal" color="#F59E0B" />
      </div>
    </div>
  )
}

function StatPill({ label, value, unit, color }: { label: string; value: string; unit?: string; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 900, color, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontSize: 9, color: '#BBB', fontWeight: 600 }}>{unit}</span>}
      </div>
      <span style={{ fontSize: 9, fontWeight: 600, color: '#BBB', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  )
}

function TotalStats({ sessions }: { sessions: RunSessionRecord[] }) {
  const totalDist = sessions.reduce((s, r) => s + r.distanceKm, 0)
  const totalDur = sessions.reduce((s, r) => s + r.durationSec, 0)
  const avgPace = totalDist > 0 && totalDur > 0
    ? (() => { const s = totalDur / totalDist; return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}` })()
    : '--:--'

  return (
    <div style={{
      margin: '0 16px 14px',
      background: `linear-gradient(135deg, ${ROSE} 0%, ${ROSE_DEEP} 100%)`,
      borderRadius: 20, padding: '16px 20px',
      boxShadow: '0 6px 24px rgba(192,57,43,0.3)',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Total {sessions.length} Aktivitas
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{totalDist.toFixed(1)}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>km</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', height: 40, alignSelf: 'center' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{avgPace}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>pace avg</p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.15)', height: 40, alignSelf: 'center' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: '0 0 2px', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(totalDur)}</p>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>waktu</p>
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
    setLoading(true); setLoadError(null)
    try {
      let since: Date | undefined
      const now = new Date()
      if (f === 'week') { since = new Date(now); since.setDate(now.getDate() - 7) }
      else if (f === 'month') { since = new Date(now); since.setMonth(now.getMonth() - 1) }
      setSessions(await getRecentSessions(userId, 100, since))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat riwayat')
    } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void loadSessions(filter) }, [loadSessions, filter])

  return (
    <div style={{ background: '#F5F4F4', minHeight: '100%', paddingBottom: 20 }}>

      {/* Gradient hero */}
      <div style={{
        background: `linear-gradient(135deg, ${ROSE} 0%, ${ROSE_DEEP} 60%, #7B1F14 100%)`,
        padding: '52px 20px 24px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '0 0 4px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Riwayat</p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.03em' }}>Aktivitas Lari</h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
            {loading ? '...' : `${sessions.length} sesi tercatat`}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
        {(['all', 'week', 'month'] as const).map(f => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            style={{
              padding: '8px 18px', borderRadius: 99,
              background: filter === f ? `linear-gradient(135deg, ${ROSE} 0%, ${ROSE_DEEP} 100%)` : '#fff',
              border: filter === f ? 'none' : '1px solid #EEEBEB',
              color: filter === f ? '#fff' : '#888',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              boxShadow: filter === f ? '0 3px 12px rgba(192,57,43,0.3)' : '0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.15s',
            }}>
            {f === 'all' ? 'Semua' : f === 'week' ? '7 Hari' : '30 Hari'}
          </button>
        ))}
      </div>

      {/* Error */}
      {loadError && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={ROSE} strokeWidth="2"/><path d="M12 7V13" stroke={ROSE} strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill={ROSE}/></svg>
          <span style={{ fontSize: 12, color: ROSE, fontWeight: 600, flex: 1 }}>{loadError}</span>
          <button type="button" onClick={() => void loadSessions(filter)} style={{ fontSize: 11, color: ROSE, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Coba lagi</button>
        </div>
      )}

      {/* Total stats */}
      {!loading && sessions.length > 0 && <TotalStats sessions={sessions} />}

      {/* Territory card */}
      <div style={{ margin: '0 16px 14px', background: '#fff', borderRadius: 18, padding: '14px 16px', border: '1px solid #F0EEEE', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6L9 4L15 7L21 5V19L15 21L9 18L3 20V6Z" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="9" y1="4" x2="9" y2="18" stroke={ROSE} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
              <line x1="15" y1="7" x2="15" y2="21" stroke={ROSE} strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 11, color: '#AAA', margin: '0 0 2px', fontWeight: 600 }}>Total Wilayah Dikuasai</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: ROSE, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{totalTerritoryKm2.toFixed(3)}</span>
              <span style={{ fontSize: 11, color: '#AAA', fontWeight: 600 }}>km²</span>
            </div>
          </div>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M5 3V21" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
          <path d="M5 4.5L19 4.5L15 9.5L19 14.5L5 14.5" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Activity list */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 110, borderRadius: 20, opacity: 1 - i * 0.2 }} />
          ))
        ) : sessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 22, padding: '36px 20px', textAlign: 'center', border: '1px solid #F0EEEE', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <RunnerIllustration size={30} color={ROSE} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>Belum ada aktivitas</p>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Mulai lari pertamamu!</p>
          </div>
        ) : (
          sessions.map((s, i) => <ActivityCard key={s.id} session={s} index={i} />)
        )}
      </div>
    </div>
  )
}
