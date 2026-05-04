/**
 * RunSession — Strava-inspired
 * - Minimizable card (swipe down = mini bar, swipe up = full)
 * - Post-run summary setelah selesai
 * - GPS marker fix
 * - Bug fixes: type safety, distance calc, GPS singleton reset
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Feature, LineString } from 'geojson'
import type { Coordinate, PrivacyZone } from '../../types/index'
import { gpsTracker } from '../../services/gpsTracker'
import { geometryEngine } from '../../services/geometryEngine'
import { claimTerritory } from '../../services/territoryService'
import { saveRunSession, estimateCalories } from '../../services/runSessionService'
import { useTerritoryStore } from '../../stores/territoryStore'
import { InvasionAlert } from '../notifications/InvasionAlert'
import { PostRunSummary } from './PostRunSummary'
import type { InvasionNotification } from '../../types/index'

export interface RunSessionProps {
  userId: string
  userColor: string
  username: string
  privacyZones?: PrivacyZone[]
  /** null = clear marker from map */
  onPositionUpdate?: (position: { lat: number; lng: number } | null) => void
  onTrackUpdate?: (track: Feature<LineString> | null) => void
  onSessionChange?: (isRunning: boolean) => void
  latestInvasion?: InvasionNotification | null
  onDismissInvasion?: () => void
  totalTerritoryKm2?: number
}

function coordsToLineString(coords: Coordinate[]): Feature<LineString> | null {  if (coords.length < 2) return null
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: coords.map(c => [c.lng, c.lat]) },
  }
}

/** Haversine distance between two coords in km */
function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x))
}

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Throttle: only check for loop every N GPS points to avoid O(n²) on long runs */
const CLAIM_CHECK_INTERVAL = 5

export function RunSession({
  userId, userColor, username, privacyZones = [],
  onPositionUpdate, onTrackUpdate, onSessionChange,
  latestInvasion, onDismissInvasion, totalTerritoryKm2 = 0,
}: RunSessionProps) {
  const [isRunning, setIsRunning] = useState(() => gpsTracker._isSessionActive)
  const [isStarting, setIsStarting] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [dur, setDur] = useState(0)
  const [dist, setDist] = useState(0)
  const [claimed, setClaimed] = useState(0)
  const [startErr, setStartErr] = useState<string | null>(null)
  const [claimMsg, setClaimMsg] = useState<string | null>(null)
  const [speedWarn, setSpeedWarn] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    dist: number; dur: number; kcal: number; claimed: number; track: Feature<LineString> | null
  } | null>(null)
  const coordsRef = useRef<Coordinate[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const lastTrackRef = useRef<Feature<LineString> | null>(null)
  // Accumulate distance incrementally to avoid re-computing full track each update
  const distRef = useRef(0)
  // Throttle processClaim counter (interval constant defined at module level)
  const claimCheckCounterRef = useRef(0)

  const applyClaimResult = useTerritoryStore(s => s.applyClaimResult)
  const addPendingClaim = useTerritoryStore(s => s.addPendingClaim)

  // Sync with GPS tracker on mount (handles page navigation back to map)
  useEffect(() => {
    if (gpsTracker._isSessionActive) {
      setIsRunning(true)
      onSessionChange?.(true)
      gpsTracker.onPositionUpdate(coord => {
        const prev = coordsRef.current[coordsRef.current.length - 1]
        coordsRef.current.push(coord)
        if (prev) {
          distRef.current += haversineKm(prev, coord)
          setDist(distRef.current)
        }
        onPositionUpdate?.({ lat: coord.lat, lng: coord.lng })
        const track = coordsToLineString(coordsRef.current)
        lastTrackRef.current = track
        onTrackUpdate?.(track)
      })
      if (!timerRef.current) timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const processClaim = useCallback(async (coords: Coordinate[]) => {
    try {
      const loop = geometryEngine.detectLoop(coords)
      if (!loop) return
      const poly = geometryEngine.processClaimPolygon(coords, loop, privacyZones)
      if (!poly) return
      addPendingClaim(poly)
      const res = await claimTerritory(userId, poly)
      if (res) {
        applyClaimResult(poly, res, userId, userColor, username)
        setClaimed(p => p + 1)
        setClaimMsg('Wilayah diklaim! 🎉')
        if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
        claimTimerRef.current = setTimeout(() => setClaimMsg(null), 3000)
      }
    } catch (err) {
      console.warn('[RunSession] processClaim error:', err)
    }
  }, [userId, userColor, username, privacyZones, addPendingClaim, applyClaimResult])

  const handleStart = useCallback(async () => {
    // If tracker already active (e.g. navigated away and back), just resume UI
    if (gpsTracker._isSessionActive) {
      setIsRunning(true)
      onSessionChange?.(true)
      if (!timerRef.current) timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
      return
    }

    setIsStarting(true)
    setStartErr(null)
    setSpeedWarn(false)
    setClaimMsg(null)
    setDur(0)
    setDist(0)
    setClaimed(0)
    coordsRef.current = []
    distRef.current = 0
    claimCheckCounterRef.current = 0
    lastTrackRef.current = null

    try {
      gpsTracker.onPositionUpdate(coord => {
        const prev = coordsRef.current[coordsRef.current.length - 1]
        coordsRef.current.push(coord)
        // Incremental distance — avoids re-summing entire array each update
        if (prev) {
          distRef.current += haversineKm(prev, coord)
          setDist(distRef.current)
        }
        onPositionUpdate?.({ lat: coord.lat, lng: coord.lng })
        const track = coordsToLineString(coordsRef.current)
        lastTrackRef.current = track
        onTrackUpdate?.(track)
        // Throttle claim detection: only check every N points to avoid O(n²) on long runs
        claimCheckCounterRef.current++
        if (claimCheckCounterRef.current % CLAIM_CHECK_INTERVAL === 0) {
          void processClaim(coordsRef.current)
        }
      })

      gpsTracker.onSpeedViolation(() => {
        setSpeedWarn(true)
        setIsRunning(false)
        onSessionChange?.(false)
        onTrackUpdate?.(null)
        onPositionUpdate?.(null)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      })

      gpsTracker.onGPSLost(() => {
        // GPS lost — keep session alive, just show no position
        onPositionUpdate?.(null)
      })

      await gpsTracker.startSession()
      setIsRunning(true)
      onSessionChange?.(true)
      startTimeRef.current = new Date()
      timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
    } catch (err) {
      setStartErr(err instanceof Error ? err.message : 'Gagal memulai GPS')
    } finally {
      setIsStarting(false)
    }
  }, [onPositionUpdate, onTrackUpdate, onSessionChange, processClaim])

  const handleStop = useCallback(async () => {
    const end = new Date()
    const start = startTimeRef.current ?? new Date()
    const fd = distRef.current
    const fDur = dur
    const fClaimed = claimed
    const finalTrack = lastTrackRef.current

    try { await gpsTracker.stopSession() } catch { /* ignore */ }

    setIsRunning(false)
    onSessionChange?.(false)
    onTrackUpdate?.(null)
    // Keep userPosition on map after stop so user can see where they finished

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    coordsRef.current = []
    distRef.current = 0
    startTimeRef.current = null

    if (fd > 0.01 && fDur > 10) void saveRunSession(userId, fd, fDur, start, end)

    setSummaryData({
      dist: fd,
      dur: fDur,
      kcal: estimateCalories(fd, fDur),
      claimed: fClaimed,
      track: finalTrack,
    })
    setShowSummary(true)
  }, [onSessionChange, onTrackUpdate, userId, dur, claimed])

  const calories = estimateCalories(dist, dur)
  // Pace in min/km — only meaningful after some distance
  const paceStr = dist > 0.05 && dur > 0
    ? (() => {
        const secPerKm = dur / dist
        return `${String(Math.floor(secPerKm / 60)).padStart(2, '0')}:${String(Math.floor(secPerKm % 60)).padStart(2, '0')}`
      })()
    : '--:--'

  // ─── Post-run summary ──────────────────────────────────────────────────────
  if (showSummary && summaryData) {
    return (
      <PostRunSummary
        distanceKm={summaryData.dist}
        durationSec={summaryData.dur}
        caloriesKcal={summaryData.kcal}
        claimedCount={summaryData.claimed}
        territoryKm2={totalTerritoryKm2}
        track={summaryData.track}
        userColor={userColor}
        onClose={() => { setShowSummary(false); setSummaryData(null) }}
        onShare={() => {
          const text = `Saya baru saja berlari ${summaryData.dist.toFixed(2)} km dalam ${fmtDur(summaryData.dur)}! 🏃 #TerritoryJogger`
          if (navigator.share) void navigator.share({ title: 'Territory Jogger', text })
          else alert(text)
        }}
      />
    )
  }

  return (
    <>
      {isRunning && latestInvasion && onDismissInvasion && (
        <InvasionAlert notification={latestInvasion} onDismiss={onDismissInvasion} />
      )}

      {/* ── Run Panel ── */}
      <div style={{
        position: 'fixed',
        bottom: 72,
        left: 0, right: 0,
        zIndex: 50,
        padding: '0 16px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {/* Alerts */}
        {speedWarn && <Alert color="#C0392B" bg="#FDECEA" border="#F5B7B1">Kecepatan terlalu tinggi — sesi dihentikan</Alert>}
        {claimMsg && <Alert color="#16A34A" bg="#F0FDF4" border="#BBF7D0">{claimMsg}</Alert>}
        {startErr && (
          <Alert color="#C0392B" bg="#FDECEA" border="#F5B7B1">
            {startErr}
            {startErr.includes('ditolak') && (
              <p style={{ fontSize: 11, marginTop: 4, opacity: 0.8, fontWeight: 400 }}>
                Buka Pengaturan Browser → Izin Lokasi → Izinkan
              </p>
            )}
          </Alert>
        )}

        {/* Main card */}
        <div style={{
          pointerEvents: 'auto',
          background: '#FFFFFF',
          borderRadius: minimized ? 99 : 28,
          padding: minimized ? '14px 20px' : '0',
          boxShadow: '0 -4px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid rgba(0,0,0,0.06)',
          transition: 'border-radius 0.3s ease',
          overflow: 'hidden',
        }}>

          {minimized ? (
            /* ── Mini bar ── */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isRunning && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C0392B', animation: 'pulse-ring 1.5s ease-out infinite' }} />
                )}
                <span style={{ fontSize: 18, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.03em' }}>{dist.toFixed(2)}</span>
                <span style={{ fontSize: 13, color: '#AAA', fontWeight: 500 }}>km</span>
                <span style={{ fontSize: 13, color: '#CCC' }}>·</span>
                <span style={{ fontSize: 13, color: '#888', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtDur(dur)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={() => setMinimized(false)}
                  style={{ fontSize: 11, color: '#C0392B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                  Buka
                </button>
                {isRunning && (
                  <button type="button" onClick={() => void handleStop()}
                    style={{ width: 34, height: 34, borderRadius: '50%', background: '#FDECEA', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="1.5" y="1.5" width="3.5" height="9" rx="1" fill="#C0392B"/>
                      <rect x="7" y="1.5" width="3.5" height="9" rx="1" fill="#C0392B"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

          ) : isRunning ? (
            /* ── Full running card ── */
            <div>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4, cursor: 'pointer' }}
                onClick={() => setMinimized(true)}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E8E8' }} />
              </div>

              {/* Status bar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 20px 0' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', animation: 'pulse-ring 1.5s ease-out infinite' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Sedang Berlari</span>
              </div>

              {/* Big distance */}
              <div style={{ textAlign: 'center', padding: '12px 20px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 64, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {dist.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: '#AAAAAA', marginBottom: 4 }}>km</span>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr 1px 1fr', alignItems: 'center', padding: '0 20px 20px', gap: 0 }}>
                <StatCell label="Waktu" value={fmtDur(dur)} />
                <div style={{ height: 32, background: '#F0F0F0' }} />
                <StatCell label="Pace" value={paceStr} unit="/km" />
                <div style={{ height: 32, background: '#F0F0F0' }} />
                <StatCell label="Kalori" value={String(calories)} unit="kkal" />
                <div style={{ height: 32, background: '#F0F0F0' }} />
                <StatCell label="Klaim" value={String(claimed)} color="#16A34A" />
              </div>

              {/* Stop button */}
              <div style={{ padding: '0 20px 20px', display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => void handleStop()} aria-label="Selesai lari"
                  style={{
                    flex: 1, height: 52, borderRadius: 16,
                    background: '#1A1A1A', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    cursor: 'pointer', transition: 'opacity 0.15s',
                  }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="2" width="5" height="12" rx="1.5" fill="white"/>
                    <rect x="9" y="2" width="5" height="12" rx="1.5" fill="white"/>
                  </svg>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Selesai</span>
                </button>
              </div>
            </div>

          ) : (
            /* ── Pre-run card ── */
            <div>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
                <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E8E8E8' }} />
              </div>

              {/* Big distance placeholder */}
              <div style={{ textAlign: 'center', padding: '12px 20px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 64, fontWeight: 900, color: '#DDDDDD', letterSpacing: '-0.04em', lineHeight: 1 }}>
                    0.00
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: '#DDDDDD', marginBottom: 4 }}>km</span>
                </div>
              </div>

              {/* Stats placeholder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr', alignItems: 'center', padding: '0 20px 20px', gap: 0 }}>
                <StatCell label="Waktu" value="—" />
                <div style={{ height: 32, background: '#F0F0F0' }} />
                <StatCell label="Pace" value="—" />
                <div style={{ height: 32, background: '#F0F0F0' }} />
                <StatCell label="Kalori" value="—" />
              </div>

              {/* Start button */}
              <div style={{ padding: '0 20px 20px' }}>
                <button
                  type="button"
                  onClick={() => void handleStart()}
                  disabled={isStarting}
                  aria-label="Mulai lari"
                  style={{
                    width: '100%', height: 56, borderRadius: 18,
                    background: isStarting ? '#E8A09A' : '#C0392B',
                    border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    boxShadow: isStarting ? 'none' : '0 4px 20px rgba(192,57,43,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isStarting ? (
                    <>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Memulai GPS...</span>
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M7 4L19 12L7 20V4Z" fill="white"/>
                      </svg>
                      <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>Mulai Lari</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── StatCell — komponen stat kecil di run card ───────────────────────────────
function StatCell({ label, value, unit, color = '#1A1A1A' }: { label: string; value: string; unit?: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 4px' }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#AAAAAA', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 10, color: '#AAAAAA', fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  )
}

function Alert({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div role="alert" style={{ pointerEvents: 'auto', padding: '10px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 12, color, fontSize: 13, fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

export default RunSession
