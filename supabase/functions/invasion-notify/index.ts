/**
 * invasion-notify — Supabase Edge Function
 *
 * Menerima payload invasion dari database webhook (dipanggil setelah
 * pg_notify dari fungsi claim_territory), menyimpan notifikasi ke tabel
 * invasion_notifications, dan mengirim browser push notification sebagai
 * placeholder (web mode — FCM/APNs memerlukan native setup).
 *
 * Persyaratan: 9.1, 9.2
 *
 * Cara kerja:
 * 1. Database webhook memanggil Edge Function ini via HTTP POST setelah
 *    terjadi invasion (trigger dari claim_territory RPC).
 * 2. Edge Function memvalidasi payload, menyimpan notifikasi ke DB,
 *    dan mengembalikan respons sukses.
 * 3. Di sisi klien, Supabase Realtime akan mendeteksi INSERT baru di
 *    invasion_notifications dan menampilkan browser notification.
 *
 * Payload yang diterima (dari pg_notify / database webhook):
 * {
 *   victim_id: string (UUID)
 *   attacker_id: string (UUID)
 *   attacker_username: string
 *   area_lost_km2: number
 *   location_lng?: number
 *   location_lat?: number
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

interface InvasionPayload {
  victim_id: string
  attacker_id: string
  attacker_username: string
  area_lost_km2: number
  location_lng?: number
  location_lat?: number
}

interface WebhookBody {
  type: string
  table?: string
  record?: Record<string, unknown>
  // Payload langsung dari pg_notify via webhook
  payload?: InvasionPayload
  // Atau payload di root level (dari database webhook)
  victim_id?: string
  attacker_id?: string
  attacker_username?: string
  area_lost_km2?: number
  location_lng?: number
  location_lat?: number
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Helper: Validasi Payload ─────────────────────────────────────────────────

function extractInvasionPayload(body: WebhookBody): InvasionPayload | null {
  // Coba ambil dari field payload (pg_notify format)
  if (body.payload) {
    const p = body.payload
    if (p.victim_id && p.attacker_id && typeof p.area_lost_km2 === 'number') {
      return p
    }
  }

  // Coba ambil dari root level (database webhook format)
  if (
    body.victim_id &&
    body.attacker_id &&
    typeof body.area_lost_km2 === 'number'
  ) {
    return {
      victim_id: body.victim_id,
      attacker_id: body.attacker_id,
      attacker_username: body.attacker_username ?? 'Unknown',
      area_lost_km2: body.area_lost_km2,
      location_lng: body.location_lng,
      location_lat: body.location_lat,
    }
  }

  return null
}

// ─── Handler Utama ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Parse request body
    const body: WebhookBody = await req.json()

    // Ekstrak payload invasion
    const invasionPayload = extractInvasionPayload(body)
    if (!invasionPayload) {
      console.error('[invasion-notify] Payload tidak valid:', JSON.stringify(body))
      return new Response(
        JSON.stringify({ error: 'Invalid payload: missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const {
      victim_id,
      attacker_id,
      attacker_username,
      area_lost_km2,
      location_lng,
      location_lat,
    } = invasionPayload

    // Inisialisasi Supabase admin client (service role untuk bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Bangun nilai location sebagai PostGIS point jika koordinat tersedia
    let locationValue: string | null = null
    if (
      typeof location_lng === 'number' &&
      typeof location_lat === 'number' &&
      !isNaN(location_lng) &&
      !isNaN(location_lat)
    ) {
      locationValue = `SRID=4326;POINT(${location_lng} ${location_lat})`
    }

    // Simpan notifikasi ke tabel invasion_notifications (Persyaratan 9.1, 9.2)
    const { data: notification, error: insertError } = await supabaseAdmin
      .from('invasion_notifications')
      .insert({
        victim_id,
        attacker_id,
        area_lost_km2,
        location: locationValue,
        is_read: false,
      })
      .select('id, created_at')
      .single()

    if (insertError) {
      console.error('[invasion-notify] Gagal menyimpan notifikasi:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to save notification', details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.info(
      `[invasion-notify] Notifikasi tersimpan: id=${notification?.id}, ` +
      `victim=${victim_id}, attacker=${attacker_username}, area=${area_lost_km2}km²`
    )

    /**
     * Web Push Notification (Browser Notification API — Placeholder)
     *
     * Untuk web mode, push notification dikirim via Supabase Realtime:
     * klien yang subscribe ke tabel invasion_notifications akan menerima
     * event INSERT dan menampilkan browser Notification API secara lokal.
     *
     * Untuk native push (FCM/APNs), implementasi berikut diperlukan:
     * - Simpan FCM/APNs token di tabel user_push_tokens
     * - Kirim via Firebase Admin SDK atau APNs HTTP/2 API
     * - Contoh FCM:
     *   await fetch('https://fcm.googleapis.com/v1/projects/{project}/messages:send', {
     *     method: 'POST',
     *     headers: { Authorization: `Bearer ${fcmToken}` },
     *     body: JSON.stringify({
     *       message: {
     *         token: userDeviceToken,
     *         notification: {
     *           title: 'Wilayahmu diserang!',
     *           body: `${attacker_username} mengambil ${area_lost_km2.toFixed(4)} km² wilayahmu`,
     *         },
     *       },
     *     }),
     *   })
     *
     * Saat ini, notifikasi dikirim via Supabase Realtime ke klien yang aktif.
     * Klien yang tidak aktif akan melihat notifikasi saat membuka aplikasi.
     */

    return new Response(
      JSON.stringify({
        success: true,
        notification_id: notification?.id,
        message: `Notifikasi invasion tersimpan untuk victim ${victim_id}`,
        attacker_username,
        area_lost_km2,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[invasion-notify] Error tidak terduga:', message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
