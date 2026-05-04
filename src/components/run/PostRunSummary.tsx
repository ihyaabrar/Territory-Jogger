/**
 * PostRunSummary — Strava-style post-run screen
 * Tampil setelah selesai lari: stats, track snapshot, share
 */

import { useRef } from 'react'
import type { Feature, LineString } from 'geojson'
import { formatDuration } from '../../services/runSessionService'

interface PostRunSummaryProps {
  distanceKm: number
  durationSec: number
  caloriesKcal: number
  claimedCount: number
  territoryKm2: number
  track: Feature<LineString> | null
  userColor: string
  onClose: () => void
  onShare?: () => void
}

function BigStat({ label, value, unit, color = '#1A1A1A' }: { label: string; value: string; unit: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: '#AAA', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 13, color: '#AAA', fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  )
}

// Simple SVG track visualization
function TrackPreview({ track, color }: { track: Feature<LineString> | null; color: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  if (!track || track.geometry.coordinates.length < 2) {
    return (
      <div style={{ height: 160, background: '#F8F8F8', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #F0F0F0' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
            <path d="M3 6L9 4L15 7L21 5V19L15 21L9 18L3 20V6Z" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="9" y1="4" x2="9" y2="18" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
            <line x1="15" y1="7" x2="15" y2="21" stroke="#C0392B" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
          </svg>
          <p style={{ fontSize: 12, color: '#AAA' }}>Tidak ada data jalur</p>
        </div>
      </div>
    )
  }

  const coords = track.geometry.coordinates as [number, number][]
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const W = 300, H = 160, pad = 20

  const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2)
  const toY = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2)

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(c[0]).toFixed(1)} ${toY(c[1]).toFixed(1)}`).join(' ')

  return (
    <div style={{ background: '#F8F8F8', borderRadius: 16, overflow: 'hidden', border: '1px solid #F0F0F0', position: 'relative' }}>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {/* Background */}
        <rect width={W} height={H} fill="#F8F8F8" />
        {/* Track */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start dot */}
        <circle cx={toX(coords[0][0])} cy={toY(coords[0][1])} r="5" fill="#22C55E" />
        {/* End dot */}
        <circle cx={toX(coords[coords.length-1][0])} cy={toY(coords[coords.length-1][1])} r="5" fill={color} />
      </svg>
      <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />
          <span style={{ fontSize: 9, color: '#888', fontWeight: 600 }}>Start</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 9, color: '#888', fontWeight: 600 }}>Finish</span>
        </div>
      </div>
    </div>
  )
}

export function PostRunSummary({
  distanceKm, durationSec, caloriesKcal, claimedCount, territoryKm2,
  track, userColor, onClose, onShare,
}: PostRunSummaryProps) {
  const pace = durationSec > 0 && distanceKm > 0
    ? (() => {
        const pps = durationSec / distanceKm
        return `${String(Math.floor(pps / 60)).padStart(2,'0')}:${String(Math.floor(pps % 60)).padStart(2,'0')}`
      })()
    : '—'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#fff',
      display: 'flex', flexDirection: 'column',
      animation: 'slide-up 0.3s ease',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F5F5F5', flexShrink: 0 }}>
        <button type="button" onClick={onClose}
          style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: '#C0392B', cursor: 'pointer', padding: 0 }}>
          ✕ Tutup
        </button>
        <h1 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A', margin: 0 }}>Jogging Completed</h1>
        {onShare && (
          <button type="button" onClick={onShare}
            style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: '#C0392B', cursor: 'pointer', padding: 0 }}>
            Share
          </button>
        )}
      </div>

      <div style={{ padding: '20px 20px', flex: 1 }}>
        {/* Main distance */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#AAA', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Distance</p>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 56, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.04em', lineHeight: 1 }}>
              {distanceKm.toFixed(2)}
            </span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#AAA' }}>km</span>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20, padding: '16px', background: '#F8F8F8', borderRadius: 20 }}>
          <BigStat label="Duration" value={formatDuration(durationSec)} unit="" />
          <BigStat label="Pace" value={pace} unit="/km" />
          <BigStat label="Calories" value={caloriesKcal.toString()} unit="kcal" color="#F59E0B" />
        </div>

        {/* Territory stats */}
        {(claimedCount > 0 || territoryKm2 > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#FDECEA', borderRadius: 16, padding: '14px', textAlign: 'center', border: '1px solid #F5B7B1' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#E59866', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Wilayah Diklaim</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#C0392B', margin: 0, letterSpacing: '-0.03em' }}>{claimedCount}</p>
              <p style={{ fontSize: 10, color: '#E59866', margin: 0, fontWeight: 600 }}>area baru</p>
            </div>
            <div style={{ background: '#F0FDF4', borderRadius: 16, padding: '14px', textAlign: 'center', border: '1px solid #BBF7D0' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#86EFAC', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Total Wilayah</p>
              <p style={{ fontSize: 28, fontWeight: 900, color: '#22C55E', margin: 0, letterSpacing: '-0.03em' }}>{territoryKm2.toFixed(2)}</p>
              <p style={{ fontSize: 10, color: '#86EFAC', margin: 0, fontWeight: 600 }}>km²</p>
            </div>
          </div>
        )}

        {/* Track preview */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#AAA', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Jalur Lari</p>
          <TrackPreview track={track} color={userColor} />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button type="button" onClick={onClose}
            style={{ flex: 1, padding: '14px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(192,57,43,0.3)' }}>
            Selesai
          </button>
          {onShare && (
            <button type="button" onClick={onShare}
              style={{ flex: 1, padding: '14px', background: '#fff', color: '#C0392B', border: '1.5px solid #F5B7B1', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              📤 Bagikan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
