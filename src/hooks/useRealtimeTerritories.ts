/**
 * useRealtimeTerritories — Territory Jogger
 *
 * Hook untuk subscribe ke Supabase Realtime dan menerima pembaruan
 * wilayah secara live (INSERT/UPDATE/DELETE pada tabel `territories`).
 *
 * Fitur:
 * - Subscribe ke channel Supabase Realtime untuk event INSERT/UPDATE/DELETE
 * - Perbarui useTerritoryStore secara inkremental saat menerima event
 * - Reconnect otomatis dengan exponential backoff
 * - Fallback ke polling setiap 5 detik jika Realtime terputus
 *
 * Persyaratan: 6.5
 */

import { useEffect, useRef, useCallback } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Feature, Polygon } from 'geojson'
import { supabase } from '../lib/supabase'
import { useTerritoryStore } from '../stores/territoryStore'
import { getTerritoriesInViewport } from '../services/territoryService'
import type { ViewportBBox } from '../services/territoryService'
import type { Territory } from '../types/index'
import { invalidate as invalidateCacheEntry, invalidateAll as invalidateCacheAll } from '../utils/territoryCache'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Interval polling fallback dalam milidetik (5 detik) */
const POLLING_INTERVAL_MS = 5_000

/** Delay awal reconnect backoff dalam milidetik */
const BACKOFF_BASE_MS = 1_000

/** Delay maksimum reconnect backoff dalam milidetik (30 detik) */
const BACKOFF_MAX_MS = 30_000

/** Jumlah maksimum percobaan reconnect sebelum beralih ke polling */
const MAX_RECONNECT_ATTEMPTS = 5

// ─── Tipe Data Realtime ───────────────────────────────────────────────────────

/**
 * Payload row dari Supabase Realtime untuk tabel territories.
 * Sesuai dengan skema database di design.md.
 */
interface TerritoryRow {
  id: string
  user_id: string
  geom: object
  area_km2: number
  created_at?: string
  updated_at?: string
}

/**
 * Payload dari event Supabase Realtime postgres_changes.
 */
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: TerritoryRow | Record<string, never>
  old: Partial<TerritoryRow>
  schema: string
  table: string
  commit_timestamp: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Menghitung delay backoff untuk percobaan ke-`attempt` (0-indexed).
 * Menggunakan exponential backoff dengan jitter untuk menghindari thundering herd.
 */
function calcBackoffDelay(attempt: number): number {
  const base = BACKOFF_BASE_MS * Math.pow(2, attempt)
  const jitter = Math.random() * 500
  return Math.min(base + jitter, BACKOFF_MAX_MS)
}

/**
 * Mengkonversi row database ke interface Territory frontend.
 * Memerlukan data profil pengguna yang di-join dari server.
 */
function rowToTerritory(
  row: TerritoryRow,
  existingTerritories: Map<string, Territory>
): Territory | null {
  // Coba ambil data profil dari wilayah yang sudah ada di store
  const existing = existingTerritories.get(row.id)

  return {
    id: row.id,
    userId: row.user_id,
    // Gunakan data profil dari store jika tersedia, fallback ke default
    userColor: existing?.userColor ?? '#6B7280',
    username: existing?.username ?? 'Unknown',
    avatarUrl: existing?.avatarUrl,
    geom: row.geom as Feature<Polygon>,
    areaKm2: row.area_km2,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseRealtimeTerritoriesOptions {
  /**
   * Viewport saat ini untuk polling fallback.
   * Jika tidak disediakan, polling tidak akan memuat data baru.
   */
  currentViewport?: ViewportBBox | null

  /**
   * Apakah hook aktif. Default: true.
   * Set ke false untuk menonaktifkan subscription (misalnya saat tidak ada sesi lari).
   */
  enabled?: boolean
}

/**
 * Hook untuk subscribe ke Supabase Realtime dan menerima pembaruan wilayah live.
 *
 * Menggunakan strategi reconnect dengan exponential backoff.
 * Jika Realtime terputus setelah MAX_RECONNECT_ATTEMPTS, beralih ke polling.
 */
export function useRealtimeTerritories({
  currentViewport,
  enabled = true,
}: UseRealtimeTerritoriesOptions = {}) {
  const addTerritory = useTerritoryStore((state) => state.addTerritory)
  const updateTerritory = useTerritoryStore((state) => state.updateTerritory)
  const removeTerritory = useTerritoryStore((state) => state.removeTerritory)
  // Access territories via getState() to avoid recreating handlers on every territory change
  const setTerritories = useTerritoryStore((state) => state.setTerritories)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const isPollingModeRef = useRef(false)
  const isSubscribedRef = useRef(false)
  const currentViewportRef = useRef<ViewportBBox | null>(currentViewport ?? null)

  // Perbarui ref viewport saat prop berubah
  useEffect(() => {
    currentViewportRef.current = currentViewport ?? null
  }, [currentViewport])

  // ─── Handler Event Realtime ─────────────────────────────────────────────────

  const handleInsert = useCallback(
    (payload: RealtimePayload) => {
      const row = payload.new as TerritoryRow
      if (!row.id) return

      // Invalidasi cache untuk territory yang baru masuk
      invalidateCacheEntry(row.id)

      // Access current territories via store getState to avoid stale closure
      const currentTerritories = useTerritoryStore.getState().territories
      const territory = rowToTerritory(row, currentTerritories)
      if (territory) {
        addTerritory(territory)
      }
    },
    [addTerritory]
  )

  const handleUpdate = useCallback(
    (payload: RealtimePayload) => {
      const row = payload.new as TerritoryRow
      if (!row.id) return

      // Invalidasi cache untuk territory yang diperbarui
      invalidateCacheEntry(row.id)

      const currentTerritories = useTerritoryStore.getState().territories
      const territory = rowToTerritory(row, currentTerritories)
      if (territory) {
        updateTerritory(row.id, {
          geom: territory.geom,
          areaKm2: territory.areaKm2,
          updatedAt: territory.updatedAt,
        })
      }
    },
    [updateTerritory]
  )

  const handleDelete = useCallback(
    (payload: RealtimePayload) => {
      const oldRow = payload.old
      if (oldRow.id) {
        // Invalidasi cache untuk territory yang dihapus
        invalidateCacheEntry(oldRow.id)
        removeTerritory(oldRow.id)
      }
    },
    [removeTerritory]
  )

  // ─── Polling Fallback ───────────────────────────────────────────────────────

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return // Sudah polling

    console.info('[useRealtimeTerritories] Beralih ke mode polling (5 detik)')
    isPollingModeRef.current = true

    // Invalidasi seluruh cache saat beralih ke polling — data mungkin sudah stale
    invalidateCacheAll()

    pollingTimerRef.current = setInterval(async () => {
      const viewport = currentViewportRef.current
      if (!viewport) return

      try {
        const newTerritories = await getTerritoriesInViewport(viewport)
        setTerritories(newTerritories)
      } catch (error) {
        console.error('[useRealtimeTerritories] Polling error:', error)
      }
    }, POLLING_INTERVAL_MS)
  }, [setTerritories])

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
    isPollingModeRef.current = false
  }, [])

  // ─── Subscribe ke Realtime ──────────────────────────────────────────────────

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      // Hapus channel lama sebelum membuat yang baru
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel('territories-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'territories',
        },
        (payload) => handleInsert(payload as unknown as RealtimePayload)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'territories',
        },
        (payload) => handleUpdate(payload as unknown as RealtimePayload)
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'territories',
        },
        (payload) => handleDelete(payload as unknown as RealtimePayload)
      )
      .subscribe((status, err) => {
        switch (status) {
          case 'SUBSCRIBED':
            console.info('[useRealtimeTerritories] Realtime terhubung')
            isSubscribedRef.current = true
            reconnectAttemptsRef.current = 0
            // Hentikan polling jika sebelumnya dalam mode polling
            stopPolling()
            break

          case 'CHANNEL_ERROR':
            console.warn('[useRealtimeTerritories] Channel error:', err)
            isSubscribedRef.current = false
            handleReconnect()
            break

          case 'CLOSED':
            console.info('[useRealtimeTerritories] Channel ditutup')
            isSubscribedRef.current = false
            break

          case 'TIMED_OUT':
            console.warn('[useRealtimeTerritories] Koneksi timeout')
            isSubscribedRef.current = false
            handleReconnect()
            break
        }
      })

    channelRef.current = channel
  }, [handleInsert, handleUpdate, handleDelete, stopPolling]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Reconnect dengan Backoff ───────────────────────────────────────────────

  const handleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
    }

    const attempt = reconnectAttemptsRef.current

    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `[useRealtimeTerritories] Gagal reconnect setelah ${MAX_RECONNECT_ATTEMPTS} percobaan. Beralih ke polling.`
      )
      startPolling()
      return
    }

    const delay = calcBackoffDelay(attempt)
    console.info(
      `[useRealtimeTerritories] Mencoba reconnect ke-${attempt + 1} dalam ${Math.round(delay)}ms...`
    )

    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1
      subscribe()
    }, delay)
  }, [startPolling, subscribe])

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) {
      // Bersihkan semua koneksi jika hook dinonaktifkan
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      stopPolling()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      return
    }

    // Mulai subscription
    subscribe()

    // Cleanup saat unmount atau enabled berubah
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      stopPolling()
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      isSubscribedRef.current = false
      reconnectAttemptsRef.current = 0
    }
  }, [enabled, subscribe, stopPolling])

  return {
    /** Apakah sedang terhubung ke Realtime */
    isConnected: isSubscribedRef.current,
    /** Apakah sedang dalam mode polling fallback */
    isPolling: isPollingModeRef.current,
  }
}
