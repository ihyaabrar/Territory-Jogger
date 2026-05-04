/**
 * Privacy Zone Service — Territory Jogger
 *
 * Service untuk manajemen Privacy Zone pengguna.
 * Berinteraksi dengan tabel `privacy_zones` di Supabase.
 * RLS memastikan hanya pemilik yang dapat membaca dan memodifikasi data mereka.
 *
 * Persyaratan: 8.1, 8.2
 */

import { supabase } from '../lib/supabase'
import type { PrivacyZone } from '../types/index'

// ─── Tipe Data ────────────────────────────────────────────────────────────────

/**
 * Hasil operasi service dengan data opsional dan pesan error.
 */
export interface PrivacyZoneServiceResult<T = void> {
  data: T | null
  error: string | null
}

/**
 * Baris mentah dari tabel `privacy_zones` di Supabase.
 * Kolom `center` dikembalikan sebagai GeoJSON dari PostGIS.
 */
interface PrivacyZoneRow {
  id: string
  user_id: string
  center: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  radius_m: number
  created_at: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Konversi baris database ke interface PrivacyZone frontend.
 */
function rowToPrivacyZone(row: PrivacyZoneRow): PrivacyZone {
  return {
    id: row.id,
    center: row.center.coordinates, // [lng, lat]
    radiusM: row.radius_m,
  }
}

// ─── getPrivacyZones ──────────────────────────────────────────────────────────

/**
 * Ambil semua Privacy Zone milik pengguna.
 *
 * RLS memastikan hanya pemilik yang dapat mengakses data ini.
 *
 * @param userId - UUID pengguna pemilik Privacy Zone
 * @returns Array PrivacyZone atau error
 *
 * Persyaratan: 8.1, 8.2
 */
export async function getPrivacyZones(
  userId: string,
): Promise<PrivacyZoneServiceResult<PrivacyZone[]>> {
  const { data, error } = await supabase
    .from('privacy_zones')
    .select('id, user_id, center, radius_m, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }

  const zones = (data as PrivacyZoneRow[]).map(rowToPrivacyZone)
  return { data: zones, error: null }
}

// ─── createPrivacyZone ────────────────────────────────────────────────────────

/**
 * Buat Privacy Zone baru untuk pengguna.
 *
 * Kolom `center` disimpan sebagai PostGIS GEOMETRY(Point, 4326)
 * menggunakan format WKT: `POINT(lng lat)`.
 *
 * @param userId  - UUID pengguna pemilik
 * @param center  - Koordinat titik pusat [lng, lat]
 * @param radiusM - Radius dalam meter (50–500)
 * @returns PrivacyZone yang baru dibuat atau error
 *
 * Persyaratan: 8.1, 8.2
 */
export async function createPrivacyZone(
  userId: string,
  center: [number, number],
  radiusM: number,
): Promise<PrivacyZoneServiceResult<PrivacyZone>> {
  // Validasi radius
  if (radiusM < 50 || radiusM > 500) {
    return {
      data: null,
      error: 'Radius harus antara 50 dan 500 meter.',
    }
  }

  // Validasi koordinat
  const [lng, lat] = center
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    return {
      data: null,
      error: 'Koordinat tidak valid.',
    }
  }

  // Format WKT untuk PostGIS: POINT(lng lat)
  const centerWkt = `POINT(${lng} ${lat})`

  const { data, error } = await supabase
    .from('privacy_zones')
    .insert({
      user_id: userId,
      center: centerWkt,
      radius_m: radiusM,
    })
    .select('id, user_id, center, radius_m, created_at')
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: rowToPrivacyZone(data as PrivacyZoneRow), error: null }
}

// ─── deletePrivacyZone ────────────────────────────────────────────────────────

/**
 * Hapus Privacy Zone berdasarkan ID.
 *
 * RLS memastikan hanya pemilik yang dapat menghapus data mereka.
 *
 * @param id - UUID Privacy Zone yang akan dihapus
 * @returns void atau error
 *
 * Persyaratan: 8.1
 */
export async function deletePrivacyZone(
  id: string,
): Promise<PrivacyZoneServiceResult<void>> {
  const { error } = await supabase
    .from('privacy_zones')
    .delete()
    .eq('id', id)

  if (error) {
    return { data: null, error: error.message }
  }

  return { data: null, error: null }
}
