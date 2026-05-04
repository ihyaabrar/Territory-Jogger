/**
 * Territory Cache — Territory Jogger
 *
 * Cache in-memory untuk data wilayah yang sering diakses.
 * Mengurangi query berulang ke Supabase dan memastikan waktu respons ≤ 200ms
 * untuk data yang sudah di-cache.
 *
 * Fitur:
 * - Cache keyed berdasarkan serialisasi ViewportBBox
 * - TTL (time-to-live) 60 detik per entry
 * - Invalidasi per territory ID (saat menerima event Realtime)
 * - Invalidasi seluruh cache (misalnya saat logout)
 *
 * Persyaratan: 11.5
 */

import type { Territory } from '../types/index'
import type { ViewportBBox } from '../services/territoryService'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** TTL default untuk setiap cache entry dalam milidetik (60 detik) */
const DEFAULT_TTL_MS = 60_000

/** Maximum number of cache entries to prevent unbounded memory growth */
const MAX_CACHE_SIZE = 50

// ─── Tipe Data ────────────────────────────────────────────────────────────────

/**
 * Satu entry dalam cache.
 */
interface CacheEntry {
  /** Data wilayah yang di-cache */
  territories: Territory[]
  /** Timestamp saat entry dibuat (Unix ms) */
  createdAt: number
  /** Timestamp kedaluwarsa entry (Unix ms) */
  expiresAt: number
}

// ─── State Cache ──────────────────────────────────────────────────────────────

/**
 * Map utama cache: bbox key → CacheEntry.
 * Menggunakan Map untuk O(1) lookup dan iterasi yang efisien.
 */
const cache = new Map<string, CacheEntry>()

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Menghasilkan cache key dari ViewportBBox.
 * Membulatkan koordinat ke 5 desimal untuk mengurangi cache miss
 * akibat perbedaan floating-point yang tidak signifikan.
 */
function bboxToKey(bbox: ViewportBBox): string {
  const round = (n: number) => Math.round(n * 1e5) / 1e5
  return `${round(bbox.minLng)},${round(bbox.minLat)},${round(bbox.maxLng)},${round(bbox.maxLat)}`
}

/**
 * Menghapus semua entry yang sudah kedaluwarsa dari cache.
 * Dipanggil secara lazy saat operasi cache dilakukan.
 */
function evictExpired(): void {
  const now = Date.now()
  for (const [key, entry] of cache) {
    if (now >= entry.expiresAt) {
      cache.delete(key)
    }
  }
}

// ─── API Publik ───────────────────────────────────────────────────────────────

/**
 * Mengambil data wilayah dari cache untuk viewport yang diberikan.
 *
 * Mengembalikan `null` jika:
 * - Tidak ada entry untuk bbox tersebut
 * - Entry sudah kedaluwarsa (TTL terlampaui)
 *
 * @param bbox - Bounding box viewport
 * @returns Array Territory jika cache hit, null jika cache miss
 *
 * Persyaratan: 11.5
 */
export function getCached(bbox: ViewportBBox): Territory[] | null {
  evictExpired()

  const key = bboxToKey(bbox)
  const entry = cache.get(key)

  if (!entry) return null

  const now = Date.now()
  if (now >= entry.expiresAt) {
    cache.delete(key)
    return null
  }

  return entry.territories
}

/**
 * Menyimpan data wilayah ke cache untuk viewport yang diberikan.
 *
 * @param bbox - Bounding box viewport sebagai cache key
 * @param territories - Data wilayah yang akan di-cache
 * @param ttlMs - TTL dalam milidetik (default: 60 detik)
 *
 * Persyaratan: 11.5
 */
export function setCached(
  bbox: ViewportBBox,
  territories: Territory[],
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  const key = bboxToKey(bbox)
  const now = Date.now()

  cache.set(key, {
    territories,
    createdAt: now,
    expiresAt: now + ttlMs,
  })

  // Evict oldest entries if cache exceeds max size
  if (cache.size > MAX_CACHE_SIZE) {
    // Find and delete the entry with the earliest createdAt
    let oldestKey = ''
    let oldestTime = Infinity
    for (const [k, entry] of cache) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt
        oldestKey = k
      }
    }
    if (oldestKey) cache.delete(oldestKey)
  }
}

/**
 * Menginvalidasi semua cache entry yang mengandung wilayah dengan ID tertentu.
 *
 * Dipanggil saat menerima event Realtime INSERT/UPDATE/DELETE untuk territory
 * tertentu, sehingga query berikutnya akan mengambil data terbaru dari server.
 *
 * @param id - ID territory yang berubah
 *
 * Persyaratan: 11.5
 */
export function invalidate(id: string): void {
  for (const [key, entry] of cache) {
    const hasTerritory = entry.territories.some((t) => t.id === id)
    if (hasTerritory) {
      cache.delete(key)
    }
  }
}

/**
 * Menginvalidasi seluruh cache.
 *
 * Dipanggil saat:
 * - Pengguna logout
 * - Koneksi Realtime terputus dan data mungkin sudah stale
 * - Perlu force-refresh seluruh data
 *
 * Persyaratan: 11.5
 */
export function invalidateAll(): void {
  cache.clear()
}

/**
 * Mengembalikan jumlah entry yang saat ini ada di cache (termasuk yang expired).
 * Berguna untuk debugging dan monitoring.
 */
export function getCacheSize(): number {
  return cache.size
}
