/**
 * PrivacyZoneManager — Territory Jogger
 *
 * Komponen UI untuk manajemen Privacy Zone pengguna.
 * Menampilkan daftar Privacy Zone yang ada, form untuk menambah zone baru,
 * dan tombol hapus untuk setiap zone.
 *
 * Persyaratan: 8.1, 8.2
 */

import { useState, useEffect, useCallback } from 'react'
import type { PrivacyZone } from '../../types/index'
import {
  getPrivacyZones,
  createPrivacyZone,
  deletePrivacyZone,
} from '../../services/privacyZoneService'

// ─── Konstanta ────────────────────────────────────────────────────────────────

const RADIUS_MIN = 50
const RADIUS_MAX = 500

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PrivacyZoneManagerProps {
  /** UUID pengguna yang sedang login */
  userId: string
  /** Kelas CSS tambahan untuk container */
  className?: string
}

// ─── Komponen ─────────────────────────────────────────────────────────────────

/**
 * Komponen manajemen Privacy Zone.
 *
 * Fitur:
 * - Daftar Privacy Zone yang sudah ada (center dan radius)
 * - Form untuk menambah Privacy Zone baru (lat, lng, radius)
 * - Tombol hapus untuk setiap zone
 * - Validasi: radius 50–500 meter, koordinat valid
 */
export function PrivacyZoneManager({ userId, className = '' }: PrivacyZoneManagerProps) {
  // ─── State ──────────────────────────────────────────────────────────────────

  const [zones, setZones] = useState<PrivacyZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Form state
  const [formLat, setFormLat] = useState('')
  const [formLng, setFormLng] = useState('')
  const [formRadius, setFormRadius] = useState('100')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Hapus state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ─── Load Privacy Zones ─────────────────────────────────────────────────────

  const loadZones = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    const result = await getPrivacyZones(userId)

    if (result.error) {
      setLoadError(result.error)
    } else {
      setZones(result.data ?? [])
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    loadZones()
  }, [loadZones])

  // ─── Validasi Form ──────────────────────────────────────────────────────────

  function validateForm(): string | null {
    const lat = parseFloat(formLat)
    const lng = parseFloat(formLng)
    const radius = parseInt(formRadius, 10)

    if (formLat.trim() === '' || isNaN(lat)) {
      return 'Latitude tidak valid.'
    }
    if (lat < -90 || lat > 90) {
      return 'Latitude harus antara -90 dan 90.'
    }
    if (formLng.trim() === '' || isNaN(lng)) {
      return 'Longitude tidak valid.'
    }
    if (lng < -180 || lng > 180) {
      return 'Longitude harus antara -180 dan 180.'
    }
    if (formRadius.trim() === '' || isNaN(radius)) {
      return 'Radius tidak valid.'
    }
    if (radius < RADIUS_MIN || radius > RADIUS_MAX) {
      return `Radius harus antara ${RADIUS_MIN} dan ${RADIUS_MAX} meter.`
    }

    return null
  }

  // ─── Submit Form ────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    const lat = parseFloat(formLat)
    const lng = parseFloat(formLng)
    const radius = parseInt(formRadius, 10)

    setIsSubmitting(true)

    const result = await createPrivacyZone(userId, [lng, lat], radius)

    setIsSubmitting(false)

    if (result.error) {
      setFormError(result.error)
      return
    }

    if (result.data) {
      setZones((prev) => [...prev, result.data!])
    }

    // Reset form
    setFormLat('')
    setFormLng('')
    setFormRadius('100')
  }

  // ─── Hapus Zone ─────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)

    const result = await deletePrivacyZone(id)

    setDeletingId(null)

    if (result.error) {
      setDeleteError(result.error)
      return
    }

    setZones((prev) => prev.filter((z) => z.id !== id))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className={className}
      style={{ fontFamily: 'sans-serif', maxWidth: '480px' }}
      aria-label="Manajemen Privacy Zone"
    >
      <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: 600 }}>
        Privacy Zone
      </h2>

      {/* ── Daftar Zone ── */}
      <section aria-label="Daftar Privacy Zone">
        <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '8px' }}>
          Zone Aktif
        </h3>

        {isLoading && (
          <p style={{ color: '#6b7280' }} aria-live="polite">
            Memuat...
          </p>
        )}

        {loadError && (
          <p
            role="alert"
            style={{ color: '#dc2626', marginBottom: '8px' }}
          >
            Gagal memuat: {loadError}
          </p>
        )}

        {!isLoading && !loadError && zones.length === 0 && (
          <p style={{ color: '#6b7280', fontStyle: 'italic' }}>
            Belum ada Privacy Zone.
          </p>
        )}

        {deleteError && (
          <p
            role="alert"
            style={{ color: '#dc2626', marginBottom: '8px' }}
          >
            Gagal menghapus: {deleteError}
          </p>
        )}

        <ul
          style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}
          aria-label="Daftar zone"
        >
          {zones.map((zone) => {
            const [lng, lat] = zone.center
            return (
              <li
                key={zone.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </span>
                  <span
                    style={{
                      marginLeft: '8px',
                      color: '#6b7280',
                      fontSize: '0.875rem',
                    }}
                  >
                    r = {zone.radiusM} m
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(zone.id)}
                  disabled={deletingId === zone.id}
                  aria-label={`Hapus zone di ${lat.toFixed(5)}, ${lng.toFixed(5)}`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.8rem',
                    color: '#dc2626',
                    background: 'transparent',
                    border: '1px solid #dc2626',
                    borderRadius: '4px',
                    cursor: deletingId === zone.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === zone.id ? 0.6 : 1,
                  }}
                >
                  {deletingId === zone.id ? 'Menghapus...' : 'Hapus'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ── Form Tambah Zone ── */}
      <section aria-label="Tambah Privacy Zone baru">
        <h3 style={{ fontSize: '1rem', fontWeight: 500, marginBottom: '12px' }}>
          Tambah Zone Baru
        </h3>

        <form onSubmit={handleSubmit} noValidate>
          {/* Latitude */}
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="pz-lat"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}
            >
              Latitude
            </label>
            <input
              id="pz-lat"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={formLat}
              onChange={(e) => setFormLat(e.target.value)}
              placeholder="Contoh: -7.7956"
              required
              aria-describedby={formError ? 'pz-form-error' : undefined}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Longitude */}
          <div style={{ marginBottom: '12px' }}>
            <label
              htmlFor="pz-lng"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}
            >
              Longitude
            </label>
            <input
              id="pz-lng"
              type="number"
              step="any"
              min="-180"
              max="180"
              value={formLng}
              onChange={(e) => setFormLng(e.target.value)}
              placeholder="Contoh: 110.3695"
              required
              aria-describedby={formError ? 'pz-form-error' : undefined}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Radius */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="pz-radius"
              style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}
            >
              Radius (meter) — {RADIUS_MIN}–{RADIUS_MAX} m
            </label>
            <input
              id="pz-radius"
              type="number"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              step="1"
              value={formRadius}
              onChange={(e) => setFormRadius(e.target.value)}
              required
              aria-describedby={formError ? 'pz-form-error' : undefined}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.9rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error message */}
          {formError && (
            <p
              id="pz-form-error"
              role="alert"
              style={{
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '12px',
              }}
            >
              {formError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: isSubmitting ? '#9ca3af' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Privacy Zone'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default PrivacyZoneManager
