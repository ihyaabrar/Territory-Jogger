/**
 * RunSession — Strava-inspired
 * - Minimizable card (swipe down = mini bar, swipe up = full)
 * - Post-run summary setelah selesai
 * - GPS marker fix
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
  onPositionUpdate?: (position: { lat: number; lng: number }) => void
  onTrackUpdate?: (track: Feature<LineString> | null) => void
  onSessionChange?: (isRunning: boolean) => void
  latestInvasion?: InvasionNotification | null
  onDismissInvasion?: () => void
  totalTerritoryKm2?: number
}

function coordsToLineString(coords: Coordinate[]): Feature<LineString> | null {
  if (coords.length < 2) return null
  return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords.map(c => [c.lng, c.lat]) } }
}

function fmtDur(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  if (h > 0) return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

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

  const applyClaimResult = useTerritoryStore(s => s.applyClaimResult)
  const addPendingClaim = useTerritoryStore(s => s.addPendingClaim)

  // Sync dengan GPS tracker saat mount
  useEffect(() => {
    if (gpsTracker._isSessionActive) {
      setIsRunning(true)
      onSessionChange?.(true)
      gpsTracker.onPositionUpdate(coord => {
        coordsRef.current.push(coord)
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
  }, [userId, userColor, username, privacyZones, addPendingClaim, applyClaimResult])

  const handleStart = useCallback(async () => {
    if (gpsTracker._isSessionActive) {
      setIsRunning(true); onSessionChange?.(true)
      if (!timerRef.current) timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
      return
    }
    setIsStarting(true); setStartErr(null); setSpeedWarn(false); setClaimMsg(null)
    setDur(0); setDist(0); setClaimed(0)
    coordsRef.current = []; lastTrackRef.current = null

    try {
      gpsTracker.onPositionUpdate(coord => {
        coordsRef.current.push(coord)
        onPositionUpdate?.({ lat: coord.lat, lng: coord.lng })
        const track = coordsToLineString(coordsRef.current)
        lastTrackRef.current = track
        onTrackUpdate?.(track)
        const cs = coordsRef.current
        if (cs.length >= 2) {
          const a = cs[cs.length-1], b = cs[cs.length-2]
          const dLat = (a.lat-b.lat)*Math.PI/180, dLng = (a.lng-b.lng)*Math.PI/180
          const x = Math.sin(dLat/2)**2 + Math.cos(b.lat*Math.PI/180)*Math.cos(a.lat*Math.PI/180)*Math.sin(dLng/2)**2
          setDist(p => p + 2*6371*Math.asin(Math.sqrt(x)))
        }
        void processClaim(coordsRef.current)
      })
      gpsTracker.onSpeedViolation(() => {
        setSpeedWarn(true); setIsRunning(false); onSessionChange?.(false)
        onTrackUpdate?.(null); onPositionUpdate?.(undefined as unknown as { lat: number; lng: number })
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      })
      gpsTracker.onGPSLost(() => {})

      await gpsTracker.startSession()
      setIsRunning(true); onSessionChange?.(true)
      startTimeRef.current = new Date()
      timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
    } catch (err) {
      setStartErr(err instanceof Error ? err.message : 'Gagal memulai')
    } finally {
      setIsStarting(false)
    }
  }, [onPositionUpdate, onTrackUpdate, onSessionChange, processClaim])

  const handleStop = useCallback(async () => {
    const end = new Date()
    const start = startTimeRef.current ?? new Date()
    const fd = dist, fDur = dur, fClaimed = claimed
    const finalTrack = lastTrackRef.current

    try { await gpsTracker.stopSession() } catch { /* ignore */ }

    setIsRunning(false); onSessionChange?.(false)
    onTrackUpdate?.(null)
    // PENTING: jangan hapus userPosition saat stop — biarkan titik tetap di peta
    // onPositionUpdate?.(undefined) — DIHAPUS agar titik tetap muncul

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    coordsRef.current = []
    startTimeRef.current = null

    if (fd > 0.01 && fDur > 10) void saveRunSession(userId, fd, fDur, start, end)

    // Tampilkan post-run summary
    setSummaryData({ dist: fd, dur: fDur, kcal: estimateCalories(fd, fDur), claimed: fClaimed, track: finalTrack })
    setShowSummary(true)
  }, [onSessionChange, onTrackUpdate, userId, dist, dur, claimed])

  const calories = estimateCalories(dist, dur)

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
        bottom: 68,
        left: 0, right: 0,
        zIndex: 50,
        padding: '0 12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}>
        {/* Alerts */}
        {speedWarn && <Alert color="#FF6B35" bg="#FFF0EB" border="#FFCFBF">🚗 Kecepatan terlalu tinggi — klaim dibatalkan</Alert>}
        {claimMsg && <Alert color="#16A34A" bg="#F0FDF4" border="#BBF7D0">{claimMsg}</Alert>}
        {startErr && <Alert color="#FF6B35" bg="#FFF0EB" border="#FFCFBF">⚠️ {startErr}</Alert>}

        {/* Main card */}
        <div style={{
          pointerEvents: 'auto',
          background: '#FFFFFF',
          borderRadius: minimized ? 99 : 24,
          padding: minimized ? '12px 20px' : '20px 20px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          border: '1px solid #F0F0F0',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
        }}>
          {/* Minimize handle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: minimized ? 0 : 12, cursor: 'pointer' }}
            onClick={() => setMinimized(p => !p)}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E0E0E0' }} />
          </div>

          {minimized ? (
            /* ── Mini bar ── */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF6B35', boxShadow: '0 0 8px #FF6B35', animation: 'pulse-ring 1.5s ease-out infinite' }} />
                <span style={{ fontSize: 16, fontWeight: 900, color: '#FF6B35', letterSpacing: '-0.02em' }}>{dist.toFixed(2)} km</span>
                <span style={{ fontSize: 13, color: '#AAA', fontWeight: 600 }}>{fmtDur(dur)}</span>
              </div>
              {isRunning && (
                <button type="button" onClick={() => void handleStop()}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: '#F0F0F0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="2" y="2" width="4" height="10" rx="1.5" fill="#555"/>
                    <rect x="8" y="2" width="4" height="10" rx="1.5" fill="#555"/>
                  </svg>
                </button>
              )}
            </div>
          ) : isRunning ? (
            /* ── Full running card ── */
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Distance</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: '#FF6B35', letterSpacing: '-0.04em', lineHeight: 1 }}>{dist.toFixed(2)}</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#AAA' }}>km</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Time</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{fmtDur(dur)}</div>
                </div>
                <div style={{ width: 1, background: '#F0F0F0' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Calories</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{calories}<span style={{ fontSize: 10, color: '#AAA' }}> kcal</span></div>
                </div>
                <div style={{ width: 1, background: '#F0F0F0' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Klaim</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#22C55E' }}>{claimed}</div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => void handleStop()} aria-label="Selesai lari"
                  style={{ width: 64, height: 64, borderRadius: '50%', background: '#F0F0F0', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <rect x="4" y="3" width="5" height="16" rx="2" fill="#555"/>
                    <rect x="13" y="3" width="5" height="16" rx="2" fill="#555"/>
                  </svg>
                </button>
              </div>
            </>
          ) : (
            /* ── Pre-run card ── */
            <>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Distance</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <span style={{ fontSize: 52, fontWeight: 900, color: '#FF6B35', letterSpacing: '-0.04em', lineHeight: 1 }}>00.00</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#AAA' }}>km</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
                {[['Time', '00:00m'], ['Speed', '00:00km/h'], ['Calories', '0kcal']].map(([l, v]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: '#AAA', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#CCC' }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button type="button" onClick={() => void handleStart()} disabled={isStarting} aria-label="Mulai lari"
                  style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: isStarting ? '#FFCFBF' : '#FF6B35',
                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    boxShadow: isStarting ? 'none' : '0 4px 20px rgba(255,107,53,0.4)',
                    transition: 'all 0.2s', position: 'relative',
                  }}>
                  {!isStarting && (
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid rgba(255,107,53,0.3)', animation: 'pulse-ring 2s ease-out infinite' }} />
                  )}
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M8 5L19 12L8 19V5Z" fill="white"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function Alert({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div role="alert" style={{ pointerEvents: 'auto', padding: '10px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 12, color, fontSize: 13, fontWeight: 600, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      {children}
    </div>
  )
}

export default RunSession
