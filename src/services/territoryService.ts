/**
 * Territory Service — Territory Jogger
 *
 * Service frontend untuk klaim wilayah, query viewport, dan sinkronisasi offline.
 * Memanggil RPC Supabase: `claim_territory` dan `territories_in_viewport`.
 *
 * Fitur:
 * - Retry logic: maks 3 kali dengan exponential backoff (1s, 2s, 4s)
 * - Offline sync: simpan klaim gagal ke IndexedDB; sinkronisasi saat koneksi pulih
 *
 * Persyaratan: 4.6, 5.6
 */

import type { Feature, Polygon } from 'geojson'
import { supabase } from '../lib/supabase'
import type { Territory } from '../types/index'
import { getCached, setCached } from '../utils/territoryCache'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Timeout request dalam milidetik (10 detik) */
const REQUEST_TIMEOUT_MS = 10_000

/** Jumlah maksimum percobaan ulang */
const MAX_RETRIES = 3

/** Delay awal exponential backoff dalam milidetik */
const BACKOFF_BASE_MS = 1_000

/** Nama database IndexedDB untuk offline sync */
const IDB_DB_NAME = 'territory-jogger-offline'

/** Versi database IndexedDB */
const IDB_DB_VERSION = 1

/** Nama object store untuk klaim yang tertunda */
const IDB_STORE_PENDING = 'pending_claims'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

/**
 * Klaim yang tersimpan di IndexedDB saat offline.
 */
export interface PendingClaim {
  id: string          // UUID lokal untuk identifikasi
  userId: string
  polygon: Feature<Polygon>
  createdAt: number   // timestamp Unix (ms)
  retryCount: number
}

/**
 * Respons dari RPC `claim_territory`.
 */
export interface ClaimTerritoryResponse {
  success: boolean
  newTerritoryId: string
  slicedTerritories: Array<{
    id: string
    remainderGeom: Feature<Polygon> | null
    areaKm2: number
  }>
}

/**
 * Bounding box untuk query viewport.
 */
export interface ViewportBBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

// ─── Helper: Timeout Promise ──────────────────────────────────────────────────

/**
 * Membungkus promise dengan timeout.
 * Melempar error jika promise tidak selesai dalam `ms` milidetik.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Request timeout setelah ${ms}ms`))
    }, ms)

    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

// ─── Helper: Exponential Backoff ──────────────────────────────────────────────

/**
 * Menunggu selama `ms` milidetik.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Menghitung delay backoff untuk percobaan ke-`attempt` (0-indexed).
 * Delay: 1s, 2s, 4s untuk attempt 0, 1, 2.
 */
function backoffDelay(attempt: number): number {
  return BACKOFF_BASE_MS * Math.pow(2, attempt)
}

// ─── Helper: Deteksi Error yang Perlu Retry ───────────────────────────────────

/**
 * Menentukan apakah error layak untuk di-retry.
 * Retry jika: timeout, network error, atau status 5xx.
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch')) {
      return true
    }
  }
  // PostgrestError dengan status 5xx
  if (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status
    return status >= 500
  }
  return false
}

// ─── IndexedDB Helper ─────────────────────────────────────────────────────────

/**
 * Membuka koneksi ke IndexedDB.
 * Membuat object store `pending_claims` jika belum ada.
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_DB_NAME, IDB_DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(IDB_STORE_PENDING)) {
        const store = db.createObjectStore(IDB_STORE_PENDING, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result)
    }

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error)
    }
  })
}

/**
 * Menyimpan klaim yang tertunda ke IndexedDB.
 */
async function savePendingClaim(claim: PendingClaim): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PENDING, 'readwrite')
    const store = tx.objectStore(IDB_STORE_PENDING)
    const request = store.put(claim)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Mengambil semua klaim yang tertunda dari IndexedDB.
 */
async function getAllPendingClaims(): Promise<PendingClaim[]> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PENDING, 'readonly')
    const store = tx.objectStore(IDB_STORE_PENDING)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as PendingClaim[])
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Menghapus klaim yang tertunda dari IndexedDB berdasarkan ID.
 */
async function deletePendingClaim(id: string): Promise<void> {
  const db = await openIDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE_PENDING, 'readwrite')
    const store = tx.objectStore(IDB_STORE_PENDING)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

/**
 * Menghasilkan UUID sederhana untuk identifikasi klaim lokal.
 */
function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Fungsi Utama ─────────────────────────────────────────────────────────────

/**
 * Mengklaim wilayah baru dengan memanggil RPC `claim_territory`.
 *
 * Alur:
 * 1. Panggil RPC dengan timeout 10 detik
 * 2. Jika gagal karena timeout/network error, retry maks 3 kali dengan backoff
 * 3. Jika semua retry gagal, simpan klaim ke IndexedDB untuk sinkronisasi nanti
 *
 * @param userId - UUID pengguna yang mengklaim
 * @param polygon - Poligon klaim dalam format GeoJSON Feature<Polygon>
 * @returns Respons klaim dari server, atau null jika disimpan offline
 *
 * Persyaratan: 4.6, 5.6
 */
export async function claimTerritory(
  userId: string,
  polygon: Feature<Polygon>,
): Promise<ClaimTerritoryResponse | null> {
  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Panggil RPC dengan timeout
      const rpcPromise = Promise.resolve(supabase.rpc('claim_territory', {
        p_user_id: userId,
        p_polygon: polygon.geometry,
      }))

      const { data, error } = await withTimeout(rpcPromise, REQUEST_TIMEOUT_MS)

      if (error) {
        // Jika error dari server (bukan network), lempar langsung
        if (!isRetryableError(error)) {
          throw error
        }
        lastError = error
      } else {
        // Berhasil — kembalikan respons
        return data as ClaimTerritoryResponse
      }
    } catch (err) {
      lastError = err

      // Jika bukan error yang layak di-retry, hentikan
      if (!isRetryableError(err)) {
        break
      }
    }

    // Tunggu sebelum retry berikutnya (kecuali percobaan terakhir)
    if (attempt < MAX_RETRIES - 1) {
      await sleep(backoffDelay(attempt))
    }
  }

  // Semua retry gagal — simpan ke IndexedDB untuk sinkronisasi nanti
  console.warn(
    '[TerritoryService] claimTerritory gagal setelah',
    MAX_RETRIES,
    'percobaan. Menyimpan ke IndexedDB.',
    lastError,
  )

  const pendingClaim: PendingClaim = {
    id: generateLocalId(),
    userId,
    polygon,
    createdAt: Date.now(),
    retryCount: 0,
  }

  try {
    await savePendingClaim(pendingClaim)
  } catch (idbError) {
    console.error('[TerritoryService] Gagal menyimpan ke IndexedDB:', idbError)
  }

  return null
}

/**
 * Mengambil semua wilayah dalam viewport yang diberikan.
 *
 * Alur:
 * 1. Cek cache in-memory terlebih dahulu (target respons ≤ 200ms untuk cache hit)
 * 2. Jika cache miss atau expired, query ke Supabase
 * 3. Simpan hasil ke cache sebelum dikembalikan
 *
 * @param bbox - Bounding box viewport (minLng, minLat, maxLng, maxLat)
 * @returns Array Territory dalam viewport, atau array kosong jika gagal
 *
 * Persyaratan: 6.3, 11.5
 */
export async function getTerritoriesInViewport(
  bbox: ViewportBBox,
): Promise<Territory[]> {
  // ── 1. Cek cache terlebih dahulu ──────────────────────────────────────────
  const cached = getCached(bbox)
  if (cached !== null) {
    return cached
  }

  // ── 2. Cache miss — query ke Supabase ─────────────────────────────────────
  const { data, error } = await supabase.rpc('territories_in_viewport', {
    min_lng: bbox.minLng,
    min_lat: bbox.minLat,
    max_lng: bbox.maxLng,
    max_lat: bbox.maxLat,
  })

  if (error) {
    console.error('[TerritoryService] getTerritoriesInViewport error:', error)
    return []
  }

  if (!data || !Array.isArray(data)) {
    return []
  }

  // Transformasi respons server ke interface Territory frontend
  const territories = (data as Array<{
    id: string
    user_id: string
    user_color: string
    username: string
    avatar_url?: string
    geom: object
    area_km2: number
    updated_at?: string
  }>).map((row) => ({
    id: row.id,
    userId: row.user_id,
    userColor: row.user_color,
    username: row.username,
    avatarUrl: row.avatar_url,
    geom: row.geom as Feature<Polygon>,
    areaKm2: row.area_km2,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }))

  // ── 3. Simpan ke cache sebelum dikembalikan ───────────────────────────────
  setCached(bbox, territories)

  return territories
}

/**
 * Menyinkronisasi klaim yang tersimpan di IndexedDB ke server.
 *
 * Dipanggil saat koneksi jaringan pulih.
 * Untuk setiap klaim yang tertunda:
 * 1. Coba kirim ke server
 * 2. Jika berhasil, hapus dari IndexedDB
 * 3. Jika gagal, biarkan di IndexedDB untuk percobaan berikutnya
 *
 * @returns Jumlah klaim yang berhasil disinkronisasi
 *
 * Persyaratan: 4.6, 5.6
 */
export async function syncPendingClaims(): Promise<number> {
  let pendingClaims: PendingClaim[]

  try {
    pendingClaims = await getAllPendingClaims()
  } catch (err) {
    console.error('[TerritoryService] Gagal membaca IndexedDB:', err)
    return 0
  }

  if (pendingClaims.length === 0) {
    return 0
  }

  let syncedCount = 0

  for (const claim of pendingClaims) {
    try {
      const rpcPromise = Promise.resolve(supabase.rpc('claim_territory', {
        p_user_id: claim.userId,
        p_polygon: claim.polygon.geometry,
      }))

      const { data, error } = await withTimeout(rpcPromise, REQUEST_TIMEOUT_MS)

      if (error) {
        console.warn(
          '[TerritoryService] syncPendingClaims: klaim',
          claim.id,
          'gagal:',
          error,
        )
        continue
      }

      if (data) {
        // Berhasil — hapus dari IndexedDB
        await deletePendingClaim(claim.id)
        syncedCount++
      }
    } catch (err) {
      console.warn(
        '[TerritoryService] syncPendingClaims: klaim',
        claim.id,
        'error:',
        err,
      )
    }
  }

  return syncedCount
}

/**
 * Mendaftarkan listener untuk event online/offline browser.
 * Saat koneksi pulih, otomatis memanggil `syncPendingClaims()`.
 *
 * Kembalikan fungsi cleanup untuk melepas listener.
 *
 * Persyaratan: 4.6, 5.6
 */
export function registerOfflineSyncListener(): () => void {
  const handleOnline = () => {
    console.info('[TerritoryService] Koneksi pulih — menyinkronisasi klaim tertunda...')
    syncPendingClaims().then((count) => {
      if (count > 0) {
        console.info(`[TerritoryService] ${count} klaim berhasil disinkronisasi.`)
      }
    }).catch((err) => {
      console.error('[TerritoryService] Sinkronisasi gagal:', err)
    })
  }

  window.addEventListener('online', handleOnline)

  return () => {
    window.removeEventListener('online', handleOnline)
  }
}
