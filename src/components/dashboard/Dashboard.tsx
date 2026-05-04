/**
 * Dashboard — Behance Running App Style
 * Summary screen: Today Activity, Weekly chart, Distance stats
 */

import { useState, useEffect, useCallback } from 'react'
import { Logo } from '../ui/Logo'
import { RunnerIllustration } from '../ui/Icons'
import type { UserProfile } from '../../types/index'
import {
  getWeeklyStats, getRecentSessions, formatDuration, formatRelativeTime,
  estimateCalories, type WeeklyStats, type RunSessionRecord,
} from '../../services/runSessionService'

interface DashboardProps {
  userId: string
  userProfile: UserProfile | null
  totalTerritoryKm2: number
  onNavigate: (page: string) => void
}

// ─── SVG Line Chart — Behance style (orange bars + line) ─────────────────────
function WeeklyChart({ data, todayIdx }: { data: number[]; todayIdx: number }) {
  // data is Mon=0...Sun=6, display Mon→Sun
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const max = Math.max(...data, 0.1)
  const W = 300, H = 80, padX = 8, barW = 24, gap = (W - padX * 2 - barW * 7) / 6

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 16}`} style={{ overflow: 'visible' }}>
      {data.map((val, i) => {
        const x = padX + i * (barW + gap)
        const barH = Math.max((val / max) * H, 3)
        const isToday = i === todayIdx
        const hasData = val > 0
        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={x} y={H - barH} width={barW} height={barH}
              rx={6}
              fill={isToday ? '#C0392B' : hasData ? '#FADBD8' : '#F5F5F5'}
            />
            {/* Value label on today */}
            {isToday && val > 0 && (
              <text x={x + barW/2} y={H - barH - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="#C0392B" fontFamily="Inter, sans-serif">
                {val.toFixed(1)}km
              </text>
            )}
            {/* Day label */}
            <text x={x + barW/2} y={H + 14} textAnchor="middle" fontSize="9"
              fill={isToday ? '#C0392B' : '#CCCCCC'}
              fontWeight={isToday ? '700' : '400'}
              fontFamily="Inter, sans-serif">
              {days[i]}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ─── Date Selector — like Behance ────────────────────────────────────────────
function DateSelector() {
  const today = new Date()
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - 3 + i)
    return d
  })
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '0 4px' }}>
      {days.map((d, i) => {
        const isToday = i === 3
        return (
          <div key={i} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            padding: '8px 6px',
            background: isToday ? '#C0392B' : 'transparent',
            borderRadius: 12,
            minWidth: 36,
          }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: isToday ? 'rgba(255,255,255,0.8)' : '#CCC', letterSpacing: '0.04em' }}>
              {dayNames[d.getDay()]}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: isToday ? '#fff' : '#AAA', lineHeight: 1 }}>
              {d.getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Stat mini card ───────────────────────────────────────────────────────────
// SVG icons untuk stat cards — dibuat sendiri
function StatIcon({ type }: { type: 'run' | 'fire' | 'clock' | 'map' }) {
  const c = '#C0392B'
  if (type === 'run') return <RunnerIllustration size={16} color={c} />
  if (type === 'fire') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C12 2 7 7.5 7 13C7 16.31 9.24 19 12 19C14.76 19 17 16.31 17 13C17 10.5 15.5 9 15.5 9C15.5 9 14.5 11.5 12.5 11.5C10.5 11.5 10 9.5 10 9.5C10 9.5 12 7 12 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="14.5" r="1.5" fill={c} opacity="0.6"/>
    </svg>
  )
  if (type === 'clock') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="2"/>
      <path d="M12 7V12.5L15.5 15" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
  // map / territory
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2C8.5 2 5.5 4.9 5.5 8.5C5.5 13.5 12 22 12 22C12 22 18.5 13.5 18.5 8.5C18.5 4.9 15.5 2 12 2Z" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="8.5" r="2.5" stroke={c} strokeWidth="2"/>
    </svg>
  )
}

function MiniStat({ label, value, unit, iconType }: { label: string; value: string; unit: string; iconType: 'run' | 'fire' | 'clock' | 'map' }) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 16, padding: '14px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #F5F5F5',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <StatIcon type={iconType} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#CCC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: '#C0392B', fontWeight: 700 }}>{unit}</span>
      </div>
    </div>
  )
}

// ─── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ session }: { session: RunSessionRecord }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '14px 16px',
      border: '1px solid #F5F5F5', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      {/* SVG Runner icon */}
      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <RunnerIllustration size={22} color="#C0392B" />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px' }}>
          {new Date(session.startedAt).toLocaleDateString('id-ID', { weekday: 'long' })} Run
        </p>
        <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>
          {formatRelativeTime(session.startedAt)}
        </p>
      </div>

      {/* Stats */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 900, color: '#C0392B', margin: '0 0 1px', letterSpacing: '-0.02em' }}>
          {session.distanceKm.toFixed(2)} km
        </p>
        <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>
          {formatDuration(session.durationSec)} · {session.caloriesKcal} kcal
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
    setLoading(true)
    setLoadError(null)
    try {
      const [stats, sessions] = await Promise.all([getWeeklyStats(userId), getRecentSessions(userId, 3)])
      setWeeklyStats(stats)
      setRecentSessions(sessions)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void loadData() }, [loadData])

  const username = userProfile?.username ?? 'Runner'
  // getWeeklyStats returns Mon=0...Sun=6, so convert getDay() (Sun=0) accordingly
  const rawDay = new Date().getDay()
  const todayIdx = rawDay === 0 ? 6 : rawDay - 1 // Mon=0, Sun=6
  const todayDist = weeklyStats.dailyDistanceKm[todayIdx] ?? 0
  // Estimate today's calories from today's distance only (not weekly average)
  const todayKcal = estimateCalories(todayDist)
  // Estimate today's time: assume ~8 min/km pace
  const todayMin = Math.round(todayDist * 8)

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100%', paddingBottom: 16 }}>

      {/* ── Error banner ── */}
      {loadError && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2"/><path d="M12 7V13" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round"/><circle cx="12" cy="16.5" r="1.2" fill="#C0392B"/></svg>
          <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 600, flex: 1 }}>{loadError}</span>
          <button type="button" onClick={() => void loadData()} style={{ fontSize: 11, color: '#C0392B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Coba lagi</button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background: '#fff', padding: '16px 20px 14px', borderBottom: '1px solid #F5F5F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div>
            <p style={{ fontSize: 13, color: '#AAA', margin: '0 0 2px', fontWeight: 500 }}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#1A1A1A', margin: 0, letterSpacing: '-0.02em' }}>
              Hello, {username}!
            </h1>
          </div>
          <Logo size="sm" variant="icon" />
        </div>
      </div>

      {/* ── Date selector ── */}
      <div style={{ background: '#fff', padding: '12px 16px 16px', marginBottom: 12, borderBottom: '1px solid #F5F5F5' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
          Today Activity
        </p>
        <DateSelector />
      </div>

      {/* ── Today stats ── */}
      <div style={{ padding: '0 16px', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <MiniStat label="Distance" value={loading ? '—' : todayDist.toFixed(2)} unit="km" iconType="run" />
          <MiniStat label="Burned" value={loading ? '—' : todayKcal.toString()} unit="kcal" iconType="fire" />
          <MiniStat label="Time" value={loading ? '—' : todayMin.toString()} unit="min" iconType="clock" />
        </div>
      </div>

      {/* ── Weekly chart ── */}
      <div style={{ margin: '0 16px 12px', background: '#fff', borderRadius: 20, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #F5F5F5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Weekly Activity</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em' }}>
                {loading ? '—' : weeklyStats.totalDistanceKm.toFixed(2)}
              </span>
              <span style={{ fontSize: 14, color: '#AAA', fontWeight: 600 }}>km</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Burned</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#C0392B' }}>{loading ? '—' : weeklyStats.totalCalories}</span>
              <span style={{ fontSize: 11, color: '#AAA', fontWeight: 600 }}>cal</span>
            </div>
          </div>
        </div>
        {loading ? (
          <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid #FADBD8', borderTopColor: '#C0392B', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <WeeklyChart data={weeklyStats.dailyDistanceKm} todayIdx={todayIdx} />
        )}
      </div>

      {/* ── Territory + Quick actions ── */}
      <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', gap: 8 }}>
        {/* Territory card */}
        <button type="button" onClick={() => onNavigate('map')}
          style={{ flex: 1, background: '#C0392B', borderRadius: 20, padding: '16px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(192,57,43,0.3)' }}>
          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' }}>Territory</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.03em' }}>{totalTerritoryKm2.toFixed(2)}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>km²</span>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Tap to explore →</p>
        </button>

        {/* Quick actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <button type="button" onClick={() => onNavigate('leaderboard')}
            style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '10px 12px', border: '1px solid #F5F5F5', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Trophy SVG */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M7 3H17V12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12V3Z" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 6H4.5C4.5 6 3 6.5 3 8.5C3 10.5 5 11.5 7 11" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M17 6H19.5C19.5 6 21 6.5 21 8.5C21 10.5 19 11.5 17 11" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M12 17V20M9 20H15" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Peringkat</p>
              <p style={{ fontSize: 9, color: '#AAA', margin: 0 }}>Leaderboard</p>
            </div>
          </button>
          <button type="button" onClick={() => onNavigate('notifications')}
            style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '10px 12px', border: '1px solid #F5F5F5', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sword / Invasion SVG */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#FDECEA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {/* Pedang kiri */}
                <path d="M4 4L14 14" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M4 4L6 4L4 6" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 14L12 17L15 16L14 14Z" fill="#C0392B"/>
                {/* Pedang kanan */}
                <path d="M20 4L10 14" stroke="#C0392B" strokeWidth="2" strokeLinecap="round"/>
                <path d="M20 4L18 4L20 6" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10 14L12 17L9 16L10 14Z" fill="#C0392B"/>
                {/* Kilat tengah */}
                <circle cx="12" cy="14" r="1.2" fill="#C0392B" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Invasion</p>
              <p style={{ fontSize: 9, color: '#AAA', margin: 0 }}>Notifikasi</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Recent activities ── */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>Aktivitas Terbaru</p>
          {weeklyStats.sessionCount > 0 && (
            <span style={{ fontSize: 11, color: '#C0392B', fontWeight: 600 }}>{weeklyStats.sessionCount} sesi</span>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2].map(i => (
              <div key={i} style={{ height: 72, background: '#fff', borderRadius: 16, border: '1px solid #F5F5F5', opacity: 1 - i * 0.3 }} />
            ))}
          </div>
        ) : recentSessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '24px 16px', textAlign: 'center', border: '1px solid #F5F5F5' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <RunnerIllustration size={40} color="#C0392B" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>Belum ada aktivitas</p>
            <p style={{ fontSize: 12, color: '#AAA', margin: '0 0 16px' }}>Mulai lari pertamamu!</p>
            <button type="button" onClick={() => onNavigate('map')}
              style={{ padding: '10px 24px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(192,57,43,0.3)' }}>
              Mulai Lari
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.map(s => <ActivityItem key={s.id} session={s} />)}
          </div>
        )}
      </div>

      {/* ── CTA buttons ── */}
      {recentSessions.length > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => onNavigate('history')}
            style={{ flex: 1, padding: '13px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(192,57,43,0.3)' }}>
            Lihat Riwayat
          </button>
          <button type="button" onClick={() => onNavigate('map')}
            style={{ flex: 1, padding: '13px', background: '#fff', color: '#C0392B', border: '2px solid #C0392B', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Buka Peta
          </button>
        </div>
      )}
    </div>
  )
}
