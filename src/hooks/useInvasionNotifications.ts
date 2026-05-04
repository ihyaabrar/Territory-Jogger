/**
 * useInvasionNotifications — Territory Runner
 *
 * Hook untuk subscribe ke tabel `invasion_notifications` via Supabase Realtime,
 * mengelola state notifikasi (unread count, list), dan mengirim browser
 * notification jika tab tidak aktif.
 *
 * Fitur:
 * - Subscribe ke INSERT baru di invasion_notifications (filter: victim_id = user)
 * - Memuat riwayat notifikasi dari database saat mount
 * - Mengelola unread count
 * - Mengirim browser Notification API jika tab tidak aktif (Persyaratan 9.1)
 * - Mendukung toggle aktifkan/nonaktifkan notifikasi (Persyaratan 9.4)
 * - Menandai notifikasi sebagai sudah dibaca
 *
 * Persyaratan: 9.3, 9.4, 9.5
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { InvasionNotification } from '../types'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Jumlah notifikasi yang dimuat saat pertama kali */
const INITIAL_LOAD_LIMIT = 50

/** Key localStorage untuk preferensi notifikasi */
const NOTIF_ENABLED_KEY = 'invasion_notifications_enabled'

// ─── Tipe Data Realtime ───────────────────────────────────────────────────────

/**
 * Row dari tabel invasion_notifications di database.
 */
interface InvasionNotificationRow {
  id: string
  victim_id: string
  attacker_id: string
  area_lost_km2: number
  location: string | null
  is_read: boolean
  created_at: string
}

/**
 * Payload dari event Supabase Realtime postgres_changes.
 */
interface RealtimeInsertPayload {
  eventType: 'INSERT'
  new: InvasionNotificationRow
  old: Record<string, never>
  schema: string
  table: string
  commit_timestamp: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Mengkonversi row database ke interface InvasionNotification frontend.
 * Mengambil attacker_username dari join dengan profiles.
 */
function rowToNotification(
  row: InvasionNotificationRow,
  attackerUsername: string
): InvasionNotification {
  // Parse lokasi dari WKT/EWKT format "SRID=4326;POINT(lng lat)"
  let location: [number, number] | undefined
  if (row.location) {
    const match = row.location.match(/POINT\(([^\s]+)\s+([^\s)]+)\)/)
    if (match) {
      const lng = parseFloat(match[1])
      const lat = parseFloat(match[2])
      if (!isNaN(lng) && !isNaN(lat)) {
        location = [lng, lat]
      }
    }
  }

  return {
    id: row.id,
    victimId: row.victim_id,
    attackerId: row.attacker_id,
    attackerUsername: attackerUsername,
    areaLostKm2: row.area_lost_km2,
    location,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

/**
 * Meminta izin browser notification dan mengirim notifikasi.
 * Hanya dikirim jika tab tidak aktif (document.hidden).
 * Persyaratan: 9.1
 */
async function sendBrowserNotification(
  notification: InvasionNotification
): Promise<void> {
  // Hanya kirim jika tab tidak aktif
  if (!document.hidden) return

  // Cek dukungan browser
  if (!('Notification' in window)) return

  // Minta izin jika belum diberikan
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }

  if (Notification.permission !== 'granted') return

  const areaText = notification.areaLostKm2.toFixed(4)
  new Notification('Wilayahmu diserang! 🚨', {
    body: `${notification.attackerUsername} mengambil ${areaText} km² wilayahmu`,
    icon: '/favicon.ico',
    tag: `invasion-${notification.id}`,
    requireInteraction: false,
  })
}

// ─── Return Type ──────────────────────────────────────────────────────────────

export interface UseInvasionNotificationsReturn {
  /** Daftar notifikasi invasion (terbaru di atas) */
  notifications: InvasionNotification[]
  /** Jumlah notifikasi yang belum dibaca */
  unreadCount: number
  /** Apakah sedang memuat notifikasi awal */
  isLoading: boolean
  /** Error jika ada */
  error: string | null
  /** Apakah notifikasi diaktifkan */
  notificationsEnabled: boolean
  /** Toggle aktifkan/nonaktifkan notifikasi */
  toggleNotifications: () => void
  /** Tandai satu notifikasi sebagai sudah dibaca */
  markAsRead: (notificationId: string) => Promise<void>
  /** Tandai semua notifikasi sebagai sudah dibaca */
  markAllAsRead: () => Promise<void>
  /** Notifikasi invasion terbaru (untuk in-app alert) */
  latestUnread: InvasionNotification | null
  /** Dismiss notifikasi terbaru dari in-app alert */
  dismissLatest: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseInvasionNotificationsOptions {
  /** ID pengguna yang sedang login. Jika null, hook tidak aktif. */
  userId: string | null
  /** Apakah sedang dalam sesi lari aktif (untuk in-app alert). */
  isRunning?: boolean
}

/**
 * Hook untuk mengelola notifikasi invasion secara real-time.
 *
 * Subscribe ke Supabase Realtime untuk menerima notifikasi baru,
 * mengelola state unread count, dan mengirim browser notification
 * jika tab tidak aktif.
 */
export function useInvasionNotifications({
  userId,
  isRunning = false,
}: UseInvasionNotificationsOptions): UseInvasionNotificationsReturn {
  const [notifications, setNotifications] = useState<InvasionNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(NOTIF_ENABLED_KEY)
      return stored === null ? true : stored === 'true'
    } catch {
      return true
    }
  })
  const [latestUnread, setLatestUnread] = useState<InvasionNotification | null>(null)

  const channelRef = useRef<RealtimeChannel | null>(null)
  // Use refs for values used inside subscribe callback to avoid recreating channel
  const isRunningRef = useRef(isRunning)
  const notificationsEnabledRef = useRef(notificationsEnabled)
  useEffect(() => { isRunningRef.current = isRunning }, [isRunning])
  useEffect(() => { notificationsEnabledRef.current = notificationsEnabled }, [notificationsEnabled])

  // ─── Computed: unread count ─────────────────────────────────────────────────

  const unreadCount = notifications.filter(n => !n.isRead).length

  // ─── Muat riwayat notifikasi awal ──────────────────────────────────────────

  const loadNotifications = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      // Query dengan join ke profiles untuk mendapatkan attacker_username
      const { data, error: queryError } = await supabase
        .from('invasion_notifications')
        .select(`
          id,
          victim_id,
          attacker_id,
          area_lost_km2,
          location,
          is_read,
          created_at,
          attacker:profiles!invasion_notifications_attacker_id_fkey(username)
        `)
        .eq('victim_id', userId)
        .order('created_at', { ascending: false })
        .limit(INITIAL_LOAD_LIMIT)

      if (queryError) {
        console.error('[useInvasionNotifications] Error memuat notifikasi:', queryError)
        setError('Gagal memuat riwayat notifikasi')
        return
      }

      if (data) {
        const mapped = data.map(row => {
          // Supabase join mengembalikan attacker sebagai object atau array
          const attackerData = row.attacker as { username: string } | { username: string }[] | null
          let attackerUsername = 'Unknown'
          if (Array.isArray(attackerData) && attackerData.length > 0) {
            attackerUsername = attackerData[0].username
          } else if (attackerData && !Array.isArray(attackerData)) {
            attackerUsername = attackerData.username
          }

          return rowToNotification(
            row as unknown as InvasionNotificationRow,
            attackerUsername
          )
        })
        setNotifications(mapped)
      }
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // ─── Subscribe ke Realtime ──────────────────────────────────────────────────

  const subscribe = useCallback(() => {
    if (!userId) return
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    const channel = supabase
      .channel(`invasion-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invasion_notifications',
          filter: `victim_id=eq.${userId}`,
        },
        async (payload) => {
          const raw = payload as unknown as RealtimeInsertPayload
          const row = raw.new

          // Ambil username penyerang
          let attackerUsername = 'Unknown'
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', row.attacker_id)
              .single()
            if (profile) {
              attackerUsername = profile.username
            }
          } catch {
            // Gunakan fallback 'Unknown'
          }

          const newNotification = rowToNotification(row, attackerUsername)

          // Tambahkan ke state (terbaru di atas)
          setNotifications(prev => [newNotification, ...prev])

          // Set sebagai latest unread untuk in-app alert (Persyaratan 9.5)
          if (isRunningRef.current) {
            setLatestUnread(newNotification)
          }

          // Kirim browser notification jika diaktifkan dan tab tidak aktif
          if (notificationsEnabledRef.current) {
            await sendBrowserNotification(newNotification)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.info('[useInvasionNotifications] Realtime terhubung')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[useInvasionNotifications] Koneksi Realtime bermasalah:', status)
        }
      })

    channelRef.current = channel
  }, [userId]) // isRunning and notificationsEnabled accessed via refs — no need in deps

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setLatestUnread(null)
      return
    }

    void loadNotifications()
    subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, loadNotifications, subscribe])

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Toggle aktifkan/nonaktifkan notifikasi invasion.
   * Persyaratan: 9.4
   */
  const toggleNotifications = useCallback(() => {
    setNotificationsEnabled(prev => {
      const next = !prev
      try {
        localStorage.setItem(NOTIF_ENABLED_KEY, String(next))
      } catch {
        // localStorage tidak tersedia
      }

      // Minta izin browser notification saat diaktifkan
      if (next && 'Notification' in window && Notification.permission === 'default') {
        void Notification.requestPermission()
      }

      return next
    })
  }, [])

  /**
   * Tandai satu notifikasi sebagai sudah dibaca.
   * Persyaratan: 9.3
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!userId) return

    const { error: updateError } = await supabase
      .from('invasion_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('victim_id', userId)

    if (updateError) {
      console.error('[useInvasionNotifications] Gagal menandai sebagai dibaca:', updateError)
      return
    }

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    )
  }, [userId])

  /**
   * Tandai semua notifikasi sebagai sudah dibaca.
   * Persyaratan: 9.3
   */
  const markAllAsRead = useCallback(async () => {
    if (!userId) return

    const { error: updateError } = await supabase
      .from('invasion_notifications')
      .update({ is_read: true })
      .eq('victim_id', userId)
      .eq('is_read', false)

    if (updateError) {
      console.error('[useInvasionNotifications] Gagal menandai semua sebagai dibaca:', updateError)
      return
    }

    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }, [userId])

  /**
   * Dismiss notifikasi terbaru dari in-app alert.
   * Persyaratan: 9.5
   */
  const dismissLatest = useCallback(() => {
    setLatestUnread(null)
  }, [])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    notificationsEnabled,
    toggleNotifications,
    markAsRead,
    markAllAsRead,
    latestUnread,
    dismissLatest,
  }
}
