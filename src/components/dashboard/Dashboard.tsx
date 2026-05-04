/**
 * Dashboard — Behance Running App Style
 * Summary screen: Today Activity, Weekly chart, Distance stats
 */

import { useState, useEffect, useCallback } from 'react'
import { Logo } from '../ui/Logo'
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
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
              fill={isToday ? '#FF6B35' : hasData ? '#FFE0D6' : '#F5F5F5'}
            />
            {/* Value label on today */}
            {isToday && val > 0 && (
              <text x={x + barW/2} y={H - barH - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="#FF6B35" fontFamily="Inter, sans-serif">
                {val.toFixed(1)}km
              </text>
            )}
            {/* Day label */}
            <text x={x + barW/2} y={H + 14} textAnchor="middle" fontSize="9"
              fill={isToday ? '#FF6B35' : '#CCCCCC'}
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
            background: isToday ? '#FF6B35' : 'transparent',
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
function MiniStat({ label, value, unit, icon }: { label: string; value: string; unit: string; icon: string }) {
  return (
    <div style={{
      flex: 1, background: '#fff', borderRadius: 16, padding: '14px 10px',
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #F5F5F5',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#CCC', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 10, color: '#FF6B35', fontWeight: 700 }}>{unit}</span>
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
      {/* Icon */}
      <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🏃</span>
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
        <p style={{ fontSize: 16, fontWeight: 900, color: '#FF6B35', margin: '0 0 1px', letterSpacing: '-0.02em' }}>
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

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [stats, sessions] = await Promise.all([getWeeklyStats(userId), getRecentSessions(userId, 3)])
      setWeeklyStats(stats)
      setRecentSessions(sessions)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { void loadData() }, [loadData])

  const username = userProfile?.username ?? 'Runner'
  const rawDay = new Date().getDay()
  const todayIdx = rawDay // Sun=0 ... Sat=6 (matches days array)
  const todayDist = weeklyStats.dailyDistanceKm[todayIdx] ?? 0
  const todayKcal = estimateCalories(todayDist)
  const todayMin = Math.round(todayDist * 8)

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100%', paddingBottom: 16 }}>

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
          <MiniStat label="Distance" value={loading ? '—' : todayDist.toFixed(2)} unit="km" icon="🏃" />
          <MiniStat label="Burned" value={loading ? '—' : todayKcal.toString()} unit="kcal" icon="🔥" />
          <MiniStat label="Time" value={loading ? '—' : todayMin.toString()} unit="min" icon="⏱" />
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
              <span style={{ fontSize: 20, fontWeight: 800, color: '#FF6B35' }}>{loading ? '—' : weeklyStats.totalCalories}</span>
              <span style={{ fontSize: 11, color: '#AAA', fontWeight: 600 }}>cal</span>
            </div>
          </div>
        </div>
        {loading ? (
          <div style={{ height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2.5px solid #FFE0D6', borderTopColor: '#FF6B35', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : (
          <WeeklyChart data={weeklyStats.dailyDistanceKm} todayIdx={todayIdx} />
        )}
      </div>

      {/* ── Territory + Quick actions ── */}
      <div style={{ padding: '0 16px', marginBottom: 12, display: 'flex', gap: 8 }}>
        {/* Territory card */}
        <button type="button" onClick={() => onNavigate('map')}
          style={{ flex: 1, background: '#FF6B35', borderRadius: 20, padding: '16px 14px', border: 'none', cursor: 'pointer', textAlign: 'left', boxShadow: '0 4px 16px rgba(255,107,53,0.3)' }}>
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
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#1A1A1A', margin: 0 }}>Peringkat</p>
              <p style={{ fontSize: 9, color: '#AAA', margin: 0 }}>Leaderboard</p>
            </div>
          </button>
          <button type="button" onClick={() => onNavigate('notifications')}
            style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '10px 12px', border: '1px solid #F5F5F5', cursor: 'pointer', textAlign: 'left', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⚔️</span>
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
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', margin: 0 }}>My Walk List</p>
          {weeklyStats.sessionCount > 0 && (
            <span style={{ fontSize: 11, color: '#FF6B35', fontWeight: 600 }}>{weeklyStats.sessionCount} sesi</span>
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
            <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏃</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', margin: '0 0 4px' }}>Belum ada aktivitas</p>
            <p style={{ fontSize: 12, color: '#AAA', margin: '0 0 16px' }}>Mulai lari pertamamu!</p>
            <button type="button" onClick={() => onNavigate('map')}
              style={{ padding: '10px 24px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,107,53,0.3)' }}>
              Mulai Lari
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentSessions.map(s => <ActivityItem key={s.id} session={s} />)}
          </div>
        )}
      </div>

      {/* ── CTA buttons like Behance ── */}
      {recentSessions.length > 0 && (
        <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10 }}>
          <button type="button" onClick={() => onNavigate('map')}
            style={{ flex: 1, padding: '13px', background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(255,107,53,0.3)' }}>
            Distance Charts
          </button>
          <button type="button" onClick={() => onNavigate('leaderboard')}
            style={{ flex: 1, padding: '13px', background: '#fff', color: '#FF6B35', border: '2px solid #FF6B35', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            My Walk List
          </button>
        </div>
      )}
    </div>
  )
}
