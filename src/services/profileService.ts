/**
 * Service untuk manajemen profil pengguna.
 * Feature: territory-jogger
 * Persyaratan: 2.1, 2.2, 2.3, 2.4, 2.5
 */
import { supabase } from '../lib/supabase'
import { generateRandomColor, isValidHexColor } from '../utils/colorUtils'
import type { UserProfile } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UpdateProfileData {
  username?: string
  userColor?: string
  avatarUrl?: string
}

export interface ProfileServiceResult<T = void> {
  data: T | null
  error: string | null
}

// ─── getProfile ───────────────────────────────────────────────────────────────

/**
 * Ambil profil pengguna berdasarkan ID.
 * Persyaratan: 2.5
 */
export async function getProfile(
  userId: string
): Promise<ProfileServiceResult<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) return { data: null, error: error.message }

  return {
    data: {
      id: data.id,
      username: data.username,
      userColor: data.user_color,
      avatarUrl: data.avatar_url ?? undefined,
      lastActive: data.last_active,
    },
    error: null,
  }
}

// ─── validateColorUniqueness ──────────────────────────────────────────────────

/**
 * Cek apakah warna sudah digunakan pengguna lain.
 * Persyaratan: 2.3
 *
 * @param color       Warna HEX yang akan dicek (format: #RRGGBB)
 * @param excludeUserId  ID pengguna yang dikecualikan dari pengecekan (pengguna itu sendiri)
 * @returns `{ isUnique: true }` jika warna belum dipakai, atau `{ isUnique: false, conflictUserId }` jika sudah dipakai
 */
export async function validateColorUniqueness(
  color: string,
  excludeUserId?: string
): Promise<{ isUnique: boolean; conflictUserId?: string; error?: string }> {
  if (!isValidHexColor(color)) {
    return { isUnique: false, error: 'Format warna tidak valid. Gunakan format #RRGGBB.' }
  }

  let query = supabase
    .from('profiles')
    .select('id')
    .eq('user_color', color)

  if (excludeUserId) {
    query = query.neq('id', excludeUserId)
  }

  const { data, error } = await query.maybeSingle()

  if (error) {
    return { isUnique: false, error: error.message }
  }

  if (data) {
    return { isUnique: false, conflictUserId: data.id }
  }

  return { isUnique: true }
}

// ─── assignUniqueColor ────────────────────────────────────────────────────────

/**
 * Tetapkan warna unik yang belum digunakan pengguna lain.
 * Dipanggil saat pendaftaran pengguna baru.
 * Persyaratan: 2.1
 *
 * Mencoba hingga 20 kali untuk menemukan warna yang belum dipakai.
 * Jika semua percobaan gagal, kembalikan warna terakhir yang di-generate
 * (kemungkinan sangat kecil terjadi tabrakan).
 */
export async function assignUniqueColor(userId: string): Promise<string> {
  const MAX_ATTEMPTS = 20

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const color = generateRandomColor()
    const result = await validateColorUniqueness(color, userId)

    if (result.isUnique) {
      return color
    }
  }

  // Fallback: kembalikan warna acak terakhir (sangat jarang terjadi)
  return generateRandomColor()
}

// ─── updateProfile ────────────────────────────────────────────────────────────

/**
 * Update username, warna, dan/atau avatar pengguna.
 * Validasi keunikan warna sebelum menyimpan.
 * Persyaratan: 2.2, 2.3, 2.4
 *
 * @returns `{ data: UserProfile }` jika berhasil, atau `{ error, suggestedColors }` jika gagal
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<{
  data: UserProfile | null
  error: string | null
  suggestedColors?: string[]
}> {
  const updates: Record<string, string> = {}

  // Validasi dan siapkan field username
  if (data.username !== undefined) {
    const trimmed = data.username.trim()
    if (!trimmed) {
      return { data: null, error: 'Nama pengguna tidak boleh kosong.' }
    }
    if (trimmed.length < 3) {
      return { data: null, error: 'Nama pengguna minimal 3 karakter.' }
    }
    if (trimmed.length > 30) {
      return { data: null, error: 'Nama pengguna maksimal 30 karakter.' }
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return {
        data: null,
        error: 'Nama pengguna hanya boleh mengandung huruf, angka, dan underscore.',
      }
    }
    updates.username = trimmed
  }

  // Validasi dan siapkan field warna
  if (data.userColor !== undefined) {
    if (!isValidHexColor(data.userColor)) {
      return { data: null, error: 'Format warna tidak valid. Gunakan format #RRGGBB.' }
    }

    const colorCheck = await validateColorUniqueness(data.userColor, userId)
    if (!colorCheck.isUnique) {
      if (colorCheck.error) {
        return { data: null, error: colorCheck.error }
      }
      // Warna sudah dipakai — generate saran warna alternatif
      const suggestedColors = await generateAlternativeColors(userId, 3)
      return {
        data: null,
        error: 'Warna sudah digunakan pengguna lain. Pilih warna lain.',
        suggestedColors,
      }
    }

    updates.user_color = data.userColor
  }

  // Siapkan field avatar
  if (data.avatarUrl !== undefined) {
    updates.avatar_url = data.avatarUrl
  }

  if (Object.keys(updates).length === 0) {
    // Tidak ada yang perlu diupdate — kembalikan profil saat ini
    return getProfile(userId)
  }

  const { data: updated, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation — kemungkinan username duplikat
      return { data: null, error: 'Nama pengguna sudah digunakan.' }
    }
    return { data: null, error: error.message }
  }

  return {
    data: {
      id: updated.id,
      username: updated.username,
      userColor: updated.user_color,
      avatarUrl: updated.avatar_url ?? undefined,
      lastActive: updated.last_active,
    },
    error: null,
  }
}

// ─── createProfile ────────────────────────────────────────────────────────────

/**
 * Buat profil baru setelah registrasi.
 * Menetapkan warna unik secara otomatis.
 * Persyaratan: 2.1
 */
export async function createProfile(
  userId: string,
  username: string
): Promise<ProfileServiceResult<UserProfile>> {
  const color = await assignUniqueColor(userId)

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, username, user_color: color })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }

  return {
    data: {
      id: data.id,
      username: data.username,
      userColor: data.user_color,
      avatarUrl: data.avatar_url ?? undefined,
      lastActive: data.last_active,
    },
    error: null,
  }
}

// ─── updateUserColor (backward-compat alias) ──────────────────────────────────

/**
 * Update warna pengguna — validasi keunikan terlebih dahulu.
 * @deprecated Gunakan `updateProfile` sebagai gantinya.
 */
export async function updateUserColor(
  userId: string,
  newColor: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await updateProfile(userId, { userColor: newColor })
  return { success: result.error === null, error: result.error }
}

/**
 * Update username pengguna.
 * @deprecated Gunakan `updateProfile` sebagai gantinya.
 */
export async function updateUsername(
  userId: string,
  newUsername: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await updateProfile(userId, { username: newUsername })
  return { success: result.error === null, error: result.error }
}

/**
 * Update avatar URL pengguna.
 * @deprecated Gunakan `updateProfile` sebagai gantinya.
 */
export async function updateAvatarUrl(
  userId: string,
  avatarUrl: string
): Promise<{ success: boolean; error: string | null }> {
  const result = await updateProfile(userId, { avatarUrl })
  return { success: result.error === null, error: result.error }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate beberapa warna alternatif yang belum dipakai pengguna lain.
 */
async function generateAlternativeColors(
  excludeUserId: string,
  count: number
): Promise<string[]> {
  const suggestions: string[] = []
  const MAX_TRIES = count * 5

  for (let i = 0; i < MAX_TRIES && suggestions.length < count; i++) {
    const color = generateRandomColor()
    const check = await validateColorUniqueness(color, excludeUserId)
    if (check.isUnique) {
      suggestions.push(color)
    }
  }

  return suggestions
}
