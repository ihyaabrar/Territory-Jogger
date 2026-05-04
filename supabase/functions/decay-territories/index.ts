/**
 * decay-territories — Supabase Edge Function
 *
 * Alternatif pg_cron untuk menjalankan decay wilayah secara terjadwal.
 * Dapat dipanggil via:
 *   1. Supabase Cron (Dashboard → Edge Functions → Schedule)
 *   2. HTTP POST langsung (dengan Authorization header service role)
 *   3. External cron service (misalnya GitHub Actions, Vercel Cron)
 *
 * Alur kerja:
 * 1. Panggil fungsi PostgreSQL `apply_territory_decay()` via RPC
 * 2. Fungsi tersebut:
 *    a. Mengirim peringatan pre-decay (24 jam sebelum decay pertama) — Persyaratan 10.4
 *    b. Mengurangi luas wilayah 10% per hari setelah 7 hari tidak aktif — Persyaratan 10.1, 10.2
 *    c. Menghapus wilayah < 0.001 km² — Persyaratan 10.3
 * 3. Memproses notifikasi pre-decay dari tabel decay_warnings dan
 *    menyimpannya ke invasion_notifications agar terlihat di UI — Persyaratan 10.4
 *
 * Persyaratan: 10.1, 10.2, 10.3, 10.4
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

interface DecayResult {
  executed_at: string
  decayed_count: number
  deleted_count: number
  warned_count: number
}

interface DecayWarning {
  id: string
  user_id: string
  warned_at: string
  decay_due_at: string
  is_sent: boolean
}

// ─── CORS Headers ─────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Handler Utama ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    // Inisialisasi Supabase admin client (service role untuk bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    console.info('[decay-territories] Memulai proses decay wilayah...')

    // ── Langkah 1: Jalankan fungsi decay di PostgreSQL ────────────────────────
    // Fungsi ini menangani: decay area, hapus wilayah kecil, dan catat peringatan
    const { data: decayResult, error: decayError } = await supabaseAdmin
      .rpc('apply_territory_decay')

    if (decayError) {
      console.error('[decay-territories] Error saat menjalankan decay:', decayError)
      return new Response(
        JSON.stringify({
          error: 'Gagal menjalankan decay',
          details: decayError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const result = decayResult as DecayResult
    console.info(
      `[decay-territories] Decay selesai: ` +
      `decayed=${result.decayed_count}, deleted=${result.deleted_count}, ` +
      `warned=${result.warned_count}`
    )

    // ── Langkah 2: Proses notifikasi pre-decay (Persyaratan 10.4) ────────────
    // Ambil peringatan yang baru saja dibuat (is_sent = true, belum ada di
    // invasion_notifications) dan simpan sebagai notifikasi khusus decay.
    //
    // Strategi: simpan ke tabel decay_warnings sudah dilakukan oleh fungsi SQL.
    // Di sini kita buat entri di invasion_notifications dengan attacker_id = victim_id
    // dan area_lost_km2 = 0 sebagai penanda notifikasi decay warning.
    // Ini memungkinkan UI yang sudah ada untuk menampilkan peringatan decay.

    if (result.warned_count > 0) {
      // Ambil peringatan yang baru dibuat dalam 5 menit terakhir
      const { data: newWarnings, error: warningsError } = await supabaseAdmin
        .from('decay_warnings')
        .select('id, user_id, decay_due_at, warned_at')
        .eq('is_sent', true)
        .gte('warned_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .returns<DecayWarning[]>()

      if (warningsError) {
        console.error('[decay-territories] Error mengambil peringatan:', warningsError)
        // Lanjutkan meskipun ada error di sini — decay utama sudah berhasil
      } else if (newWarnings && newWarnings.length > 0) {
        console.info(
          `[decay-territories] Memproses ${newWarnings.length} peringatan pre-decay...`
        )

        // Simpan setiap peringatan sebagai notifikasi di invasion_notifications
        // Gunakan area_lost_km2 = -1 sebagai penanda khusus "decay warning"
        // sehingga UI dapat membedakannya dari notifikasi invasion biasa.
        const notificationInserts = newWarnings.map((warning) => ({
          victim_id: warning.user_id,
          attacker_id: warning.user_id, // Diri sendiri = penanda decay warning
          area_lost_km2: -1,            // Nilai khusus: -1 = decay warning
          is_read: false,
          // Simpan decay_due_at di field location sebagai metadata
          // (null karena tidak ada lokasi geografis untuk decay warning)
          location: null,
        }))

        const { error: notifError } = await supabaseAdmin
          .from('invasion_notifications')
          .insert(notificationInserts)

        if (notifError) {
          console.error(
            '[decay-territories] Error menyimpan notifikasi pre-decay:',
            notifError
          )
        } else {
          console.info(
            `[decay-territories] ${newWarnings.length} notifikasi pre-decay tersimpan`
          )
        }
      }
    }

    // ── Respons sukses ────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        result: {
          executed_at:   result.executed_at,
          decayed_count: result.decayed_count,
          deleted_count: result.deleted_count,
          warned_count:  result.warned_count,
        },
        message:
          `Decay selesai: ${result.decayed_count} wilayah dikurangi, ` +
          `${result.deleted_count} wilayah dihapus, ` +
          `${result.warned_count} peringatan dikirim`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[decay-territories] Error tidak terduga:', message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
