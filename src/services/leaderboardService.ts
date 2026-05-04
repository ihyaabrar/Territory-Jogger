/**
 * LeaderboardService — mengambil data peringkat dari materialized view `leaderboard_cache`
 * via Supabase dan mengimplementasikan polling setiap 60 detik.
 *
 * Feature: territory-jogger
 * Persyaratan: 7.1, 7.5
 */

import { supabase } from '../lib/supabase'
import type { LeaderboardEntry, LeaderboardLevel, LeaderboardService } from '../types'

// ─── Row type dari leaderboard_cache ─────────────────────────────────────────

interface LeaderboardCacheRow {
  user_id: string
  username: string
  user_color: string
  avatar_url: string | null
  total_area_km2: number
  region_id: string
  region_level: string
  region_name: string
}

// ─── Implementasi ─────────────────────────────────────────────────────────────

/**
 * Mengambil data leaderboard dari materialized view `leaderboard_cache`.
 *
 * Query difilter berdasarkan `region_level` dan `region_id`, lalu diurutkan
 * dari `total_area_km2` terbesar ke terkecil. Rank dihitung di sisi klien
 * berdasarkan urutan hasil query.
 *
 * Persyaratan: 7.1, 7.3
 */
async function getLeaderboard(
  level: LeaderboardLevel,
  regionId: string,
): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('leaderboard_cache')
    .select('user_id, username, user_color, avatar_url, total_area_km2')
    .eq('region_level', level)
    .eq('region_id', regionId)
    .order('total_area_km2', { ascending: false })

  if (error) {
    throw new Error(`Gagal mengambil leaderboard: ${error.message}`)
  }

  const rows = (data ?? []) as LeaderboardCacheRow[]

  return rows.map((row, index): LeaderboardEntry => ({
    rank: index + 1,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url ?? '',
    userColor: row.user_color,
    totalAreaKm2: row.total_area_km2,
  }))
}

/**
 * Implementasi `LeaderboardService` yang memenuhi interface dari `src/types/index.ts`.
 * Persyaratan: 7.1, 7.5
 */
export const leaderboardService: LeaderboardService = {
  getLeaderboard,
}

// ─── Polling Hook ─────────────────────────────────────────────────────────────

/** Interval polling dalam milidetik (60 detik). Persyaratan: 7.5 */
export const LEADERBOARD_POLL_INTERVAL_MS = 60_000

/**
 * Memulai polling leaderboard setiap 60 detik.
 *
 * @param level   - Level administratif ('kelurahan' | 'kecamatan' | 'kota')
 * @param regionId - ID region yang dipilih
 * @param onData  - Callback dipanggil setiap kali data baru tersedia
 * @param onError - Callback dipanggil jika terjadi error saat polling
 * @returns Fungsi `stop` untuk menghentikan polling
 *
 * Persyaratan: 7.5
 */
export function startLeaderboardPolling(
  level: LeaderboardLevel,
  regionId: string,
  onData: (entries: LeaderboardEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  let stopped = false

  async function fetchAndNotify() {
    if (stopped) return
    try {
      const entries = await getLeaderboard(level, regionId)
      if (!stopped) onData(entries)
    } catch (err) {
      if (!stopped) onError(err instanceof Error ? err : new Error(String(err)))
    }
  }

  // Fetch segera saat pertama kali dipanggil
  void fetchAndNotify()

  const intervalId = setInterval(() => {
    void fetchAndNotify()
  }, LEADERBOARD_POLL_INTERVAL_MS)

  return () => {
    stopped = true
    clearInterval(intervalId)
  }
}
