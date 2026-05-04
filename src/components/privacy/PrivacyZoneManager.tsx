/**
 * PrivacyZoneManager — Territory Jogger
 * Red Rose theme, konsisten dengan desain aplikasi
 */

import { useState, useEffect, useCallback } from 'react'
import type { PrivacyZone } from '../../types/index'
import { getPrivacyZones, createPrivacyZone, deletePrivacyZone } from '../../services/privacyZoneService'

const RADIUS_MIN = 50
const RADIUS_MAX = 500
const ROSE = '#C0392B'

export interface PrivacyZoneManagerProps {
  userId: string
}

export function PrivacyZoneManager({ userId }: PrivacyZoneManagerProps) {
  const [zones, setZones] = useState<PrivacyZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formLat, setFormLat] = useState('')
  const [formLng, setFormLng] = useState('')
  const [formRadius, setFormRadius] = useState('100')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadZones = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    const result = await getPrivacyZones(userId)
    if (result.error) setLoadError(result.error)
    else setZones(result.data ?? [])
    setIsLoading(false)
  }, [userId])

  useEffect(() => { void loadZones() }, [loadZones])

  function validateForm(): string | null {
    const lat = parseFloat(formLat)
    const lng = parseFloat(formLng)
    const radius = parseInt(formRadius, 10)
    if (!formLat.trim() || isNaN(lat)) return 'Latitude tidak valid.'
    if (lat < -90 || lat > 90) return 'Latitude harus antara -90 dan 90.'
    if (!formLng.trim() || isNaN(lng)) return 'Longitude tidak valid.'
    if (lng < -180 || lng > 180) return 'Longitude harus antara -180 dan 180.'
    if (!formRadius.trim() || isNaN(radius)) return 'Radius tidak valid.'
    if (radius < RADIUS_MIN || radius > RADIUS_MAX) return `Radius harus antara ${RADIUS_MIN}–${RADIUS_MAX} meter.`
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const err = validateForm()
    if (err) { setFormError(err); return }
    setIsSubmitting(true)
    const result = await createPrivacyZone(userId, [parseFloat(formLng), parseFloat(formLat)], parseInt(formRadius, 10))
    setIsSubmitting(false)
    if (result.error) { setFormError(result.error); return }
    if (result.data) setZones(prev => [...prev, result.data!])
    setFormLat(''); setFormLng(''); setFormRadius('100')
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deletePrivacyZone(id)
    setDeletingId(null)
    if (!result.error) setZones(prev => prev.filter(z => z.id !== id))
  }

  return (
    <div style={{ background: '#F8F8F8', minHeight: '100%', paddingBottom: 24 }}>

      {/* Header */}
      <div style={{ background: '#fff', padding: '16px 20px 14px', borderBottom: '1px solid #F5F5F5', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900, color: '#1A1A1A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Privacy Zone</h1>
        <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Area yang tidak bisa diklaim orang lain</p>
      </div>

      {/* Error */}
      {loadError && (
        <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 12, fontSize: 13, color: ROSE }}>
          {loadError}
        </div>
      )}

      {/* Zone list */}
      <div style={{ padding: '0 16px', marginBottom: 20 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
          Zone Aktif ({zones.length})
        </p>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: `2.5px solid #FADBD8`, borderTopColor: ROSE, animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : zones.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', textAlign: 'center', border: '1px solid #F5F5F5' }}>
            <p style={{ fontSize: 13, color: '#AAA', margin: 0 }}>Belum ada Privacy Zone</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {zones.map(zone => {
              const [lng, lat] = zone.center
              return (
                <div key={zone.id} style={{
                  background: '#fff', borderRadius: 14, padding: '12px 16px',
                  border: '1px solid #F5F5F5', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A', margin: '0 0 2px', fontFamily: 'monospace' }}>
                      {lat.toFixed(5)}, {lng.toFixed(5)}
                    </p>
                    <p style={{ fontSize: 11, color: '#AAA', margin: 0 }}>Radius {zone.radiusM} meter</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(zone.id)}
                    disabled={deletingId === zone.id}
                    style={{
                      padding: '6px 12px', fontSize: 12, fontWeight: 700,
                      color: ROSE, background: '#FDECEA',
                      border: 'none', borderRadius: 8,
                      cursor: deletingId === zone.id ? 'not-allowed' : 'pointer',
                      opacity: deletingId === zone.id ? 0.6 : 1,
                    }}
                  >
                    {deletingId === zone.id ? '...' : 'Hapus'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add form */}
      <div style={{ padding: '0 16px' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          Tambah Zone Baru
        </p>
        <form onSubmit={handleSubmit} noValidate style={{ background: '#fff', borderRadius: 16, padding: '16px', border: '1px solid #F5F5F5', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {formError && (
            <div style={{ padding: '8px 12px', background: '#FDECEA', border: '1px solid #F5B7B1', borderRadius: 10, fontSize: 12, color: ROSE, fontWeight: 600 }}>
              {formError}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Latitude</label>
              <input
                type="number" step="any" value={formLat}
                onChange={e => setFormLat(e.target.value)}
                placeholder="-7.7956"
                style={{ width: '100%', padding: '10px 12px', background: '#F8F8F8', border: '1.5px solid #F0F0F0', borderRadius: 10, fontSize: 13, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = ROSE}
                onBlur={e => e.target.style.borderColor = '#F0F0F0'}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>Longitude</label>
              <input
                type="number" step="any" value={formLng}
                onChange={e => setFormLng(e.target.value)}
                placeholder="110.3695"
                style={{ width: '100%', padding: '10px 12px', background: '#F8F8F8', border: '1.5px solid #F0F0F0', borderRadius: 10, fontSize: 13, color: '#1A1A1A', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = ROSE}
                onBlur={e => e.target.style.borderColor = '#F0F0F0'}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              Radius: {formRadius} meter ({RADIUS_MIN}–{RADIUS_MAX}m)
            </label>
            <input
              type="range" min={RADIUS_MIN} max={RADIUS_MAX} step="10"
              value={formRadius}
              onChange={e => setFormRadius(e.target.value)}
              style={{ width: '100%', accentColor: ROSE }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: '#CCC' }}>{RADIUS_MIN}m</span>
              <span style={{ fontSize: 10, color: '#CCC' }}>{RADIUS_MAX}m</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '13px', background: isSubmitting ? '#F5B7B1' : ROSE,
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 700,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(192,57,43,0.3)',
            }}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Privacy Zone'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default PrivacyZoneManager
