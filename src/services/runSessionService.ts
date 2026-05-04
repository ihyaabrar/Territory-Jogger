/**
 * Run Session Service — Territory Jogger
 * Fetch dan simpan data sesi lari dari/ke Supabase
 */

import { supabase } from '../lib/supabase'

export interface RunSessionRecord {
  id: string
  userId: string
  distanceKm: number
  durationSec: number
  caloriesKcal: number
  startedAt: string
  endedAt: string
}

export interface WeeklyStats {
  /** Array 7 elemen: [Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu] */
  dailyDistanceKm: number[]
  totalDistanceKm: number
  totalCalories: number
  totalDurationSec: number
  sessionCount: number
}

/** Estimasi kalori: MET 7 × 65kg × jam = ~7.6 kcal/min, ~60 kcal/km */
export function estimateCalories(distanceKm: number, durationSec?: number): number {
  if (durationSec && durationSec > 0) {
    // MET 7 × 65kg / 60 = 7.58 kcal/min
    return Math.round((durationSec / 60) * 7.58)
  }
  return Math.round(distanceKm * 60)
}

/**
 * Simpan sesi lari ke database setelah selesai
 */
export async function saveRunSession(
  userId: string,
  distanceKm: number,
  durationSec: number,
  startedAt: Date,
  endedAt: Date,
): Promise<{ data: RunSessionRecord | null; error: string | null }> {
  const calories = estimateCalories(distanceKm, durationSec)

  const { data, error } = await supabase
    .from('run_sessions')
    .insert({
      user_id: userId,
      distance_km: distanceKm,
      duration_sec: durationSec,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
    })
    .select('id, user_id, distance_km, duration_sec, started_at, ended_at')
    .single()

  if (error) {
    console.error('[runSessionService] saveRunSession error:', error)
    return { data: null, error: error.message }
  }

  return {
    data: {
      id: data.id,
      userId: data.user_id,
      distanceKm: data.distance_km,
      durationSec: data.duration_sec,
      caloriesKcal: calories,
      startedAt: data.started_at,
      endedAt: data.ended_at,
    },
    error: null,
  }
}

/**
 * Ambil statistik mingguan (7 hari terakhir) untuk user
 */
export async function getWeeklyStats(userId: string): Promise<WeeklyStats> {
  // Hitung range: Senin minggu ini sampai hari ini
  const now = new Date()
  const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('run_sessions')
    .select('distance_km, duration_sec, started_at')
    .eq('user_id', userId)
    .gte('started_at', monday.toISOString())
    .lte('started_at', sunday.toISOString())
    .order('started_at', { ascending: true })

  const dailyDistanceKm = [0, 0, 0, 0, 0, 0, 0] // Mon-Sun

  if (error || !data) {
    return { dailyDistanceKm, totalDistanceKm: 0, totalCalories: 0, totalDurationSec: 0, sessionCount: 0 }
  }

  let totalDistanceKm = 0
  let totalDurationSec = 0
  let sessionCount = 0

  for (const session of data) {
    const sessionDate = new Date(session.started_at)
    const sessionDay = sessionDate.getDay() // 0=Sun
    // Convert to Mon=0 index
    const idx = sessionDay === 0 ? 6 : sessionDay - 1
    dailyDistanceKm[idx] += session.distance_km ?? 0
    totalDistanceKm += session.distance_km ?? 0
    totalDurationSec += session.duration_sec ?? 0
    sessionCount++
  }

  const totalCalories = estimateCalories(totalDistanceKm, totalDurationSec)

  return { dailyDistanceKm, totalDistanceKm, totalCalories, totalDurationSec, sessionCount }
}

/**
 * Ambil sesi lari terbaru untuk activity feed
 */
export async function getRecentSessions(userId: string, limit = 5): Promise<RunSessionRecord[]> {
  const { data, error } = await supabase
    .from('run_sessions')
    .select('id, user_id, distance_km, duration_sec, started_at, ended_at')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    distanceKm: row.distance_km ?? 0,
    durationSec: row.duration_sec ?? 0,
    caloriesKcal: estimateCalories(row.distance_km ?? 0, row.duration_sec ?? 0),
    startedAt: row.started_at,
    endedAt: row.ended_at ?? row.started_at,
  }))
}

/**
 * Format durasi detik ke MM:SS atau HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Format waktu relatif
 */
export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay === 1) return 'Kemarin'
  if (diffDay < 7) return `${diffDay} hari lalu`
  return new Date(isoString).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
