/**
 * Dashboard — Territory Runner
 * Modern design: gradient hero, clean cards, no calories in stats
 */

import { useState, useEffect, useCallback } from 'react'
import { Logo } from '../ui/Logo'
import { RunnerIllustration } from '../ui/Icons'
import type { UserProfile } from '../../types/index'
import {
  getWeeklyStats, getRecentSessions, formatDuration, formatRelativeTime,
  type WeeklyStats, type RunSessionRecord,
} from '../../services/runSessionService'

const ROSE = '#C0392B'
const ROSE_DEEP = '#96281B'

interface DashboardProps {
  userId: string
  userProfile: UserProfile | null
  totalTerritoryKm2: number
  onNavigate: (page: string) => void
}

// ─── Date Selector ───────────────────────────────────────────────────────────
function DateSelector() {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 3 + i)
    return d
  })
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
      {days.map((d, i) => {
        const isToday = i === 3
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 6px',
            background: isToday ? 'rgba(255,255,255,0.2)' : 'transparent',
            borderRadius: 12, minWidth: 34,
            border: isToday ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: isToday ? '#fff' : 'rgba(255,255,255,0.5)', letterSpacing: '0.04em' }}>
              {dayNames[d.getDay()]}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: isToday ? '#fff' : 'rgba(255,255,255,0.6)', lineHeight: 1 }}>
              {d.getDate()}
            </span>
            {isToday && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyChart({ data, todayIdx }: { data: number[]; todayIdx: number }) {
  const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  const max = Math.max(...data, 0.1)
  const W = 300, H = 72, padX = 4, barW = 28, gap = (W - padX * 2 - barW * 7) / 6

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 18}`} style={{ overflow: 'visible' }}>
      {data.map((val, i) => {
        const x = padX + i * (barW + gap)
        const barH = Math.max((val / max) * H, 4)
        const isToday = i === todayIdx
        const hasData = val > 0
        return (
          <g key={i}>
            {/* Bar background */}
            <rect x={x} y={0} width={barW} height={H} rx={8} fill={isToday ? 'rgba(192,57,43,0.06)' : '#F8F6F6'} />
            {/* Bar fill */}
            <rect
              x={x} y={H - barH} width={barW} height={barH} rx={8}
              fill={isToday ? `url(#barGrad${i})` : hasData ? 'rgba(192,57,43,0.25)' : 'transparent'}
            />
            {isToday && (
              <defs>
                <linearGradient id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E74C3C"/>
                  <stop offset="100%" stopColor="#C0392B"/>
                </linearGradient>
              </defs>
            )}
            {/* Value label */}
            {isToday && val > 0 && (
              <text x={x + barW / 2} y={H - barH - 5} textAnchor="middle" fontSize="8" fontWeight="700" fill={ROSE} fontFamily="Inter,sans-serif">
                {val.toFixed(1)}
              </text>
            )}
            {/* Day label */}
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="9"
              fill={isToday ? ROSE : '#BBBBBB'}
              fontWeight={isToday ? '700' : '400'}
              fontFamily="Inter,sans-serif">
              {days[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ session, index }: { session: RunSessionRecord; index: number }) {
  const pace = session.durationSec > 0 && session.distanceKm > 0
    ? (() => {
        const s = session.durationSec / session.distanceKm
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      })()
    : null

  return (
    <div style={{
      background: '#fff', borderRadius: 18, padding: '14px 16px',
      border: '1px solid #F0EEEE',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      display: 'flex', alignItems: 'center', gap: 14,
      animation: 'fade-in 0.3s ease',
      animationDelay: `${index * 0.06}s`,
      animationFillMode: 'both',
    }}>
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: `linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <RunnerIllustration size={22} color={ROSE} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>
          {new Date(session.startedAt).toLocaleDateString('id-ID', { weekday: 'long' })} Run
        </p>
        <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>
          {formatRelativeTime(session.startedAt)}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 17, fontWeight: 900, color: ROSE, margin: '0 0 1px', letterSpacing: '-0.02em' }}>
          {session.distanceKm.toFixed(2)} km
        </p>
        <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>
          {formatDuration(session.durationSec)}{pace ? ` · ${pace}/km` : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function Dashboard({ userId, userProfile, totalTerritoryKm2, onNavigate }: DashboardProps) {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    dailyDistanceKm: [0, 0, 0, 0, 0, 0, 0],
    totalDistanceKm: 0, totalCalories: 0, totalDurationSec: 0, sessionCount: 0,
  })
  const [recentSessions, setRecentSessions] = useState<RunSessionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true); setLoadError(null)
    try {
      const [stats, sessions] = await Promise.all([getWeeklyStats(userId), getRecentSessions(userId, 3)])
      setWeeklyStats(stats); setRecentSessions(sessions)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally { setLoading(false) }
  }, [userId])

  useEffect(() => { void loadData() }, [loadData])

  const username = userProfile?.username ?? 'Runner'
  const rawDay = new Date().getDay()
  const todayIdx = rawDay === 0 ? 6 : rawDay - 1
  const todayDist = weeklyStats.dailyDistanceKm[todayIdx] ?? 0

  // Pace mingguan rata-rata
  const weeklyPace = weeklyStats.totalDistanceKm > 0 && weeklyStats.totalDurationSec > 0
    ? (() => {
        const s = weeklyStats.totalDurationSec / weeklyStats.totalDistanceKm
        return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`
      })()
    : '--:--'

  return (
    <div style={{ background: '#F5F4F4', minHeight: '100%', paddingBottom: 20 }}>

      {/* ── Hero Header dengan gradasi ── */}
      <div style={{
        background: `linear-gradient(135deg, ${ROSE} 0%, ${ROSE_DEEP} 60%, #7B1F14 100%)`,
        padding: '52px 20px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', fontWeight: 500 }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-0.03em' }}>
              Halo, {username}! 👋
            </h1>
            {/* Today quick stats */}
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
                  {loading ? '—' : todayDist.toFixed(2)}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>km hari ini</p>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>
                  {loading ? '—' : weeklyStats.totalDistanceKm.toFixed(1)}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', margin: 0, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>km minggu ini</p>
              </div>
            </div>
          </div>
          <Logo size="sm" variant="icon" />
        </div>
      </div>

      {/* ── Date selector (kembali) ── */}
      <div style={{ padding: '0 16px 14px', background: '#fff', marginBottom: 0, borderBottom: '1px solid #F0EEEE' }}>
        <DateSelector />
      </div>

      {/* Error banner */}
      {loadError && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={ROSE} strokeWidth="2"/><path d="M12 7V13" stroke={ROSE} strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill={ROSE}/></svg>
          <span style={{ fontSize: 12, color: ROSE, fontWeight: 600, flex: 1 }}>{loadError}</span>
          <button type="button" onClick={() => void loadData()} style={{ fontSize: 11, color: ROSE, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Coba lagi</button>
        </div>
      )}

      {/* ── Quick action cards ── */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        {/* Start run CTA */}
        <button type="button" onClick={() => onNavigate('map')}
          style={{
            flex: 2, background: 'linear-gradient(135deg, #C0392B 0%, #96281B 100%)',
            borderRadius: 20, padding: '16px 16px', border: 'none', cursor: 'pointer',
            textAlign: 'left', boxShadow: '0 6px 24px rgba(192,57,43,0.35)',
            position: 'relative', overflow: 'hidden',
          }}>
          <div style={{ position: 'absolute', top: -10, right: -10, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 4px' }}>Wilayah</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{totalTerritoryKm2.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>km²</span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
            Buka peta →
          </p>
        </button>

        {/* Quick actions */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" onClick={() => onNavigate('leaderboard')}
            style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '12px', border: '1px solid #F0EEEE', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M7 3H17V12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12V3Z" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 6H4.5C4.5 6 3 6.5 3 8.5C3 10.5 5 11.5 7 11" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 6H19.5C19.5 6 21 6.5 21 8.5C21 10.5 19 11.5 17 11" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 17V20M9 20H15" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A' }}>Peringkat</span>
          </button>
          <button type="button" onClick={() => onNavigate('notifications')}
            style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '12px', border: '1px solid #F0EEEE', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M4 4L14 14" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 4L6 4L4 6" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14L12 17L15 16L14 14Z" fill={ROSE}/>
                <path d="M20 4L10 14" stroke={ROSE} strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 4L18 4L20 6" stroke={ROSE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L12 17L9 16L10 14Z" fill={ROSE}/>
              </svg>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1A1A' }}>Invasion</span>
          </button>
        </div>
      </div>

      {/* ── Weekly chart card ── */}
      <div style={{ margin: '14px 16px 0', background: '#fff', borderRadius: 22, padding: '18px 16px 14px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', border: '1px solid #F0EEEE' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#BBBBBB', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Aktivitas Mingguan</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 30, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {loading ? '—' : weeklyStats.totalDistanceKm.toFixed(2)}
              </span>
              <span style={{ fontSize: 14, color: '#AAA', fontWeight: 600 }}>km</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#BBBBBB', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 3px' }}>Pace Rata-rata</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: ROSE, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : weeklyPace}</span>
              {!loading && weeklyStats.totalDistanceKm > 0 && <span style={{ fontSize: 11, color: '#AAA', fontWeight: 600 }}>/km</span>}
            </div>
          </div>
        </div>
        {loading ? (
          <div style={{ height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2.5px solid rgba(192,57,43,0.15)`, borderTopColor: ROSE, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <WeeklyChart data={weeklyStats.dailyDistanceKm} todayIdx={todayIdx} />
        )}
      </div>

      {/* ── Recent activities ── */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: 0, letterSpacing: '-0.01em' }}>Aktivitas Terbaru</p>
          {weeklyStats.sessionCount > 0 && (
            <button type="button" onClick={() => onNavigate('history')}
              style={{ fontSize: 12, color: ROSE, fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Lihat semua →
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2].map(i => (
              <div key={i} className="skeleton" style={{ height: 74, borderRadius: 18, opacity: 1 - i * 0.25 }} />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div style={{
            background: '#fff', borderRadius: 22, padding: '28px 20px', textAlign: 'center',
            border: '1px solid #F0EEEE', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #FDECEA 0%, #FAD7D3 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RunnerIllustration size={32} color={ROSE} />
              </div>
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', margin: '0 0 6px' }}>Belum ada aktivitas</p>
            <p style={{ fontSize: 13, color: '#AAA', margin: '0 0 18px' }}>Mulai lari pertamamu sekarang!</p>
            <button type="button" onClick={() => onNavigate('map')}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #C0392B 0%, #96281B 100%)',
                color: '#fff', border: 'none', borderRadius: 99,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(192,57,43,0.35)',
              }}>
              Mulai Lari
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentSessions.map((s, i) => <ActivityItem key={s.id} session={s} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
