/**
 * PostRunSummary — Strava-inspired post-run screen
 * Dark overlay + track preview sebagai background, stats di atas
 */

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

// ─── Track SVG preview ────────────────────────────────────────────────────────
function TrackSVG({ track, color, width, height }: {
  track: Feature<LineString>; color: string; width: number; height: number
}) {
  const coords = track.geometry.coordinates as [number, number][]
  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const pad = 40

  const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (width - pad * 2)
  const toY = (lat: number) => height - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (height - pad * 2)

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(c[0]).toFixed(1)} ${toY(c[1]).toFixed(1)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0 }}>
      {/* Glow effect */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
      {/* Main track */}
      <path d={pathD} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Start dot */}
      <circle cx={toX(coords[0][0])} cy={toY(coords[0][1])} r="6" fill="#22C55E" stroke="white" strokeWidth="2"/>
      {/* End dot */}
      <circle cx={toX(coords[coords.length-1][0])} cy={toY(coords[coords.length-1][1])} r="6" fill={color} stroke="white" strokeWidth="2"/>
    </svg>
  )
}

export function PostRunSummary({
  distanceKm, durationSec, caloriesKcal, claimedCount, territoryKm2,
  track, userColor, onClose, onShare,
}: PostRunSummaryProps) {
  const pace = durationSec > 0 && distanceKm > 0
    ? (() => {
        const pps = durationSec / distanceKm
        return `${String(Math.floor(pps / 60)).padStart(2, '0')}:${String(Math.floor(pps % 60)).padStart(2, '0')}`
      })()
    : '—'

  const hasTrack = track && track.geometry.coordinates.length >= 2

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#111',
      display: 'flex', flexDirection: 'column',
      animation: 'slide-up 0.3s ease',
    }}>

      {/* ── Background: track preview atau gradient ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {/* Gradient background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: hasTrack
            ? `linear-gradient(160deg, #1a0a0a 0%, #2d1010 40%, #1a0505 100%)`
            : `linear-gradient(160deg, #1a0a0a 0%, #2d1010 100%)`,
        }} />
        {/* Track SVG overlay */}
        {hasTrack && (
          <div style={{ position: 'absolute', inset: 0, opacity: 0.6 }}>
            <TrackSVG
              track={track}
              color={userColor}
              width={window.innerWidth}
              height={window.innerHeight}
            />
          </div>
        )}
        {/* Dark gradient overlay — bottom to top for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.3) 100%)',
        }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 16px' }}>
          <button type="button" onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 99, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
            ✕ Tutup
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Selesai Berlari
          </span>
          {onShare ? (
            <button type="button" onClick={onShare}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 99, padding: '8px 16px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(8px)' }}>
              Bagikan
            </button>
          ) : <div style={{ width: 72 }} />}
        </div>

        {/* Spacer — track visible in middle */}
        <div style={{ flex: 1 }} />

        {/* Bottom stats card */}
        <div style={{ padding: '0 0 0' }}>
          {/* Main distance — big */}
          <div style={{ textAlign: 'center', padding: '0 20px 24px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>
              Jarak
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 72, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {distanceKm.toFixed(2)}
              </span>
              <span style={{ fontSize: 24, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>km</span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '20px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
            gap: 0,
          }}>
            <StatItem label="Durasi" value={formatDuration(durationSec)} />
            <div style={{ background: 'rgba(255,255,255,0.1)', height: 40, alignSelf: 'center' }} />
            <StatItem label="Pace" value={pace} unit="/km" />
            <div style={{ background: 'rgba(255,255,255,0.1)', height: 40, alignSelf: 'center' }} />
            <StatItem label="Kalori" value={String(caloriesKcal)} unit="kkal" />
          </div>

          {/* Territory row — if any */}
          {(claimedCount > 0 || territoryKm2 > 0) && (
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '14px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr 1px 1fr',
              gap: 0,
            }}>
              <StatItem label="Wilayah Diklaim" value={String(claimedCount)} unit="area" accent={userColor} />
              <div style={{ background: 'rgba(255,255,255,0.1)', height: 36, alignSelf: 'center' }} />
              <StatItem label="Total Wilayah" value={territoryKm2.toFixed(2)} unit="km²" accent="#22C55E" />
            </div>
          )}

          {/* Track legend */}
          {hasTrack && (
            <div style={{
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 20px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22C55E', border: '2px solid white' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Start</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: userColor, border: '2px solid white' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Finish</span>
              </div>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Jalur lari kamu</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ padding: '12px 16px 40px', display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{
                flex: 1, padding: '15px',
                background: '#C0392B', color: '#fff',
                border: 'none', borderRadius: 16,
                fontSize: 15, fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(192,57,43,0.5)',
              }}>
              Selesai
            </button>
            {onShare && (
              <button type="button" onClick={onShare}
                style={{
                  flex: 1, padding: '15px',
                  background: 'rgba(255,255,255,0.15)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)', borderRadius: 16,
                  fontSize: 15, fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                }}>
                📤 Bagikan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatItem({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 8px' }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
        <span style={{ fontSize: 22, fontWeight: 900, color: accent ?? '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  )
}
