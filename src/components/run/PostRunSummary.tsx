/**
 * PostRunSummary — Territory Runner
 * Strava-style: track sebagai background, stats overlay
 * Fitur: foto jalur, pilihan desain track, interval splits
 */

import { useState, useRef, useCallback } from 'react'
import type { Feature, LineString } from 'geojson'
import { formatDuration } from '../../services/runSessionService'

interface KmSplit {
  km: number
  paceStr: string
  distAtSplit: number
}

interface PostRunSummaryProps {
  distanceKm: number
  durationSec: number
  claimedCount: number
  territoryKm2: number
  track: Feature<LineString> | null
  userColor: string
  splits: KmSplit[]
  onClose: () => void
  onShare?: () => void
}

// ─── Track style options ──────────────────────────────────────────────────────
type TrackStyle = 'line' | 'glow' | 'dots' | 'gradient'

const TRACK_STYLES: { id: TrackStyle; label: string }[] = [
  { id: 'line', label: 'Garis' },
  { id: 'glow', label: 'Glow' },
  { id: 'dots', label: 'Titik' },
  { id: 'gradient', label: 'Gradien' },
]

// ─── Pace calculation ─────────────────────────────────────────────────────────
function calcPace(distKm: number, durSec: number): string {
  if (distKm < 0.05 || durSec <= 0) return '--:--'
  const secPerKm = durSec / distKm
  const m = Math.floor(secPerKm / 60)
  const s = Math.floor(secPerKm % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Track SVG ────────────────────────────────────────────────────────────────
function TrackSVG({ track, color, style: trackStyle, width, height }: {
  track: Feature<LineString>; color: string; style: TrackStyle; width: number; height: number
}) {
  const coords = track.geometry.coordinates as [number, number][]
  if (coords.length < 2) return null

  const lngs = coords.map(c => c[0])
  const lats = coords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const pad = 50

  const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (width - pad * 2)
  const toY = (lat: number) => height - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (height - pad * 2)

  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${toX(c[0]).toFixed(1)} ${toY(c[1]).toFixed(1)}`).join(' ')
  const startX = toX(coords[0][0]), startY = toY(coords[0][1])
  const endX = toX(coords[coords.length - 1][0]), endY = toY(coords[coords.length - 1][1])

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0 }}>
      <defs>
        <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22C55E" stopOpacity="0.9"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.9"/>
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {trackStyle === 'line' && (
        <>
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
          <path d={pathD} fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )}
      {trackStyle === 'glow' && (
        <>
          <path d={pathD} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" filter="url(#glow)"/>
          <path d={pathD} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )}
      {trackStyle === 'dots' && (
        <>
          <path d={pathD} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 8"/>
          {coords.filter((_, i) => i % Math.max(1, Math.floor(coords.length / 40)) === 0).map((c, i) => (
            <circle key={i} cx={toX(c[0])} cy={toY(c[1])} r="3" fill="white" opacity="0.8"/>
          ))}
        </>
      )}
      {trackStyle === 'gradient' && (
        <>
          <path d={pathD} fill="none" stroke="url(#trackGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
          <path d={pathD} fill="none" stroke="url(#trackGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </>
      )}

      {/* Start/End dots */}
      <circle cx={startX} cy={startY} r="7" fill="#22C55E" stroke="white" strokeWidth="2.5"/>
      <circle cx={endX} cy={endY} r="7" fill={color} stroke="white" strokeWidth="2.5"/>
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PostRunSummary({
  distanceKm, durationSec, claimedCount, territoryKm2,
  track, userColor, splits, onClose, onShare,
}: PostRunSummaryProps) {
  const [trackStyle, setTrackStyle] = useState<TrackStyle>('glow')
  const [activeTab, setActiveTab] = useState<'stats' | 'splits'>('stats')
  const [isCapturing, setIsCapturing] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const pace = calcPace(distanceKm, durationSec)
  const hasTrack = track && track.geometry.coordinates.length >= 2

  // ── Foto jalur via Web Share API + canvas capture ──────────────────────────
  const handleCapture = useCallback(async () => {
    setIsCapturing(true)
    try {
      // Buat canvas dari SVG track
      const W = 800, H = 600
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#1a0505')
      grad.addColorStop(1, '#2d1010')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Draw track if available
      if (hasTrack) {
        const coords = track.geometry.coordinates as [number, number][]
        const lngs = coords.map(c => c[0])
        const lats = coords.map(c => c[1])
        const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
        const minLat = Math.min(...lats), maxLat = Math.max(...lats)
        const pad = 80
        const toX = (lng: number) => pad + ((lng - minLng) / (maxLng - minLng || 1)) * (W - pad * 2)
        const toY = (lat: number) => H - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (H - pad * 2)

        ctx.beginPath()
        coords.forEach((c, i) => {
          if (i === 0) ctx.moveTo(toX(c[0]), toY(c[1]))
          else ctx.lineTo(toX(c[0]), toY(c[1]))
        })
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'
        ctx.lineWidth = 3
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.stroke()
      }

      // Stats overlay
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(0, H - 160, W, 160)

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 72px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${distanceKm.toFixed(2)} km`, W / 2, H - 90)

      ctx.font = '500 24px Inter, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.fillText(`${formatDuration(durationSec)}  ·  ${pace}/km  ·  Territory Runner`, W / 2, H - 50)

      // Convert to blob and share/download
      canvas.toBlob(async (blob) => {
        if (!blob) return
        const file = new File([blob], 'territory-runner-run.png', { type: 'image/png' })
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: 'Territory Runner',
            text: `Berlari ${distanceKm.toFixed(2)} km — pace ${pace}/km`,
            files: [file],
          })
        } else {
          // Fallback: download
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = 'territory-runner-run.png'
          a.click()
          URL.revokeObjectURL(url)
        }
      }, 'image/png')
    } catch (err) {
      console.warn('Capture error:', err)
    } finally {
      setIsCapturing(false)
    }
  }, [distanceKm, durationSec, pace, hasTrack, track])

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 390
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 844

  return (
    <div ref={cardRef} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#111',
      display: 'flex', flexDirection: 'column',
      animation: 'slide-up 0.3s ease',
    }}>

      {/* ── Background track ── */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a0505 0%, #2d1010 50%, #0d0505 100%)',
        }} />
        {hasTrack && (
          <div style={{ position: 'absolute', inset: 0, opacity: 0.65 }}>
            <TrackSVG track={track} color={userColor} style={trackStyle} width={screenW} height={screenH} />
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.2) 100%)',
        }} />
      </div>

      {/* ── Content ── */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '52px 20px 12px' }}>
          <button type="button" onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 99, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            ✕ Tutup
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Territory Runner
          </span>
          {/* Camera / capture button */}
          <button type="button" onClick={() => void handleCapture()} disabled={isCapturing}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 99, padding: '7px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            {isCapturing ? (
              <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            )}
            Foto
          </button>
        </div>

        {/* Track style selector */}
        {hasTrack && (
          <div style={{ display: 'flex', gap: 6, padding: '0 20px', justifyContent: 'center' }}>
            {TRACK_STYLES.map(s => (
              <button key={s.id} type="button" onClick={() => setTrackStyle(s.id)}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                  background: trackStyle === s.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.12)',
                  color: trackStyle === s.id ? '#1A1A1A' : 'rgba(255,255,255,0.7)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Bottom panel */}
        <div>
          {/* Main distance */}
          <div style={{ textAlign: 'center', padding: '0 20px 16px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '0 0 4px' }}>Jarak</p>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 68, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {distanceKm.toFixed(2)}
              </span>
              <span style={{ fontSize: 22, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>km</span>
            </div>
          </div>

          {/* Tab selector */}
          <div style={{ display: 'flex', gap: 0, padding: '0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            {(['stats', 'splits'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1, padding: '8px 0', border: 'none', background: 'transparent',
                  fontSize: 12, fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderBottom: activeTab === tab ? '2px solid #C0392B' : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {tab === 'stats' ? 'Statistik' : `Interval (${splits.length} km)`}
              </button>
            ))}
          </div>

          {/* Stats tab */}
          {activeTab === 'stats' && (
            <div style={{
              background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)',
              padding: '16px 20px',
              display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', gap: 0,
            }}>
              <StatItem label="Durasi" value={formatDuration(durationSec)} />
              <div style={{ background: 'rgba(255,255,255,0.1)', height: 36, alignSelf: 'center' }} />
              <StatItem label="Pace Rata-rata" value={pace} unit="/km" accent={userColor} />
              <div style={{ background: 'rgba(255,255,255,0.1)', height: 36, alignSelf: 'center' }} />
              <StatItem label="Klaim" value={String(claimedCount)} unit="area" accent="#22C55E" />
            </div>
          )}

          {/* Splits tab */}
          {activeTab === 'splits' && (
            <div style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(20px)', padding: '12px 20px', maxHeight: 160, overflowY: 'auto' }}>
              {splits.length === 0 ? (
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: '8px 0' }}>
                  Belum ada interval (minimal 1 km)
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {splits.map((s) => {
                    // Warna pace: hijau = cepat, kuning = sedang, merah = lambat
                    const [mm] = s.paceStr.split(':').map(Number)
                    const paceColor = mm <= 5 ? '#22C55E' : mm <= 7 ? '#F59E0B' : '#EF4444'
                    return (
                      <div key={s.km} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{s.km}</span>
                          </div>
                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Km {s.km}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: paceColor, fontVariantNumeric: 'tabular-nums' }}>{s.paceStr}</span>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>/km</span>
                        </div>
                      </div>
                    )
                  })}
                  {/* Pace rata-rata */}
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Rata-rata</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{pace}</span>
                      <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>/km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Territory row */}
          {territoryKm2 > 0 && (
            <div style={{
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              padding: '10px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Total Wilayah</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#22C55E', fontVariantNumeric: 'tabular-nums' }}>{territoryKm2.toFixed(2)}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>km²</span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ padding: '10px 16px 40px', display: 'flex', gap: 8 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '14px', background: '#C0392B', color: '#fff', border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(192,57,43,0.5)' }}>
              Selesai
            </button>
            {onShare && (
              <button type="button" onClick={onShare}
                style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Bagikan
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
    <div style={{ textAlign: 'center', padding: '0 6px' }}>
      <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 4px' }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 900, color: accent ?? '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  )
}
