/**
 * RunSession — Territory Runner
 * Card compact (peta tetap terlihat), fokus Pace + Interval splits
 * Pace calculation: detik/km → menit:detik per km
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Feature, LineString } from 'geojson'
import type { Coordinate, PrivacyZone } from '../../types/index'
import { gpsTracker } from '../../services/gpsTracker'
import { geometryEngine } from '../../services/geometryEngine'
import { claimTerritory } from '../../services/territoryService'
import { saveRunSession } from '../../services/runSessionService'
import { useTerritoryStore } from '../../stores/territoryStore'
import { InvasionAlert } from '../notifications/InvasionAlert'
import { PostRunSummary } from './PostRunSummary'
import type { InvasionNotification } from '../../types/index'

export interface RunSessionProps {
  userId: string
  userColor: string
  username: string
  privacyZones?: PrivacyZone[]
  onPositionUpdate?: (position: { lat: number; lng: number } | null) => void
  onTrackUpdate?: (track: Feature<LineString> | null) => void
  onSessionChange?: (isRunning: boolean) => void
  latestInvasion?: InvasionNotification | null
  onDismissInvasion?: () => void
  totalTerritoryKm2?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function coordsToLineString(coords: Coordinate[]): Feature<LineString> | null {
  if (coords.length < 2) return null
  return {
    type: 'Feature', properties: {},
    geometry: { type: 'LineString', coordinates: coords.map(c => [c.lng, c.lat]) },
  }
}

function haversineKm(a: Coordinate, b: Coordinate): number {
  const R = 6371
  const dLat = (b.lat - a.lat) * Math.PI / 180
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const x = Math.sin(dLat / 2) ** 2 +
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

/**
 * Hitung pace: detik per km → format "MM:SS /km"
 * Contoh: 5 menit 30 detik per km = "05:30"
 * Pace ideal lari santai: 6:00–8:00 /km
 * Pace ideal lari cepat: 4:00–5:30 /km
 */
function calcPace(distKm: number, durSec: number): string {
  if (distKm < 0.05 || durSec <= 0) return '--:--'
  const secPerKm = durSec / distKm
  const m = Math.floor(secPerKm / 60)
  const s = Math.floor(secPerKm % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Interval split: pace per km terakhir yang diselesaikan
 * Digunakan untuk menampilkan "Km 1: 05:30, Km 2: 05:45, ..."
 */
interface KmSplit {
  km: number        // nomor km (1, 2, 3, ...)
  paceStr: string   // pace untuk km ini
  distAtSplit: number // total jarak saat split
}

const CLAIM_CHECK_INTERVAL = 5

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [kmSplits, setKmSplits] = useState<KmSplit[]>([])
  const [summaryData, setSummaryData] = useState<{
    dist: number; dur: number; claimed: number
    track: Feature<LineString> | null
    splits: KmSplit[]
  } | null>(null)

  const coordsRef = useRef<Coordinate[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const claimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef = useRef<Date | null>(null)
  const lastTrackRef = useRef<Feature<LineString> | null>(null)
  const distRef = useRef(0)
  const claimCheckCounterRef = useRef(0)
  // Track km splits: durasi saat melewati setiap km
  const lastSplitDistRef = useRef(0)  // jarak saat split terakhir
  const lastSplitTimeRef = useRef(0)  // durasi saat split terakhir (detik)
  const splitsRef = useRef<KmSplit[]>([])

  const applyClaimResult = useTerritoryStore(s => s.applyClaimResult)
  const addPendingClaim = useTerritoryStore(s => s.addPendingClaim)

  // Sync on mount
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
        setClaimMsg('Wilayah diklaim!')
        if (claimTimerRef.current) clearTimeout(claimTimerRef.current)
        claimTimerRef.current = setTimeout(() => setClaimMsg(null), 3000)
      }
    } catch (err) {
      console.warn('[RunSession] processClaim error:', err)
    }
  }, [userId, userColor, username, privacyZones, addPendingClaim, applyClaimResult])

  const handleStart = useCallback(async () => {
    if (gpsTracker._isSessionActive) {
      setIsRunning(true); onSessionChange?.(true)
      if (!timerRef.current) timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
      return
    }

    setIsStarting(true); setStartErr(null); setSpeedWarn(false)
    setClaimMsg(null); setDur(0); setDist(0); setClaimed(0)
    setKmSplits([])
    coordsRef.current = []; distRef.current = 0
    claimCheckCounterRef.current = 0; lastTrackRef.current = null
    lastSplitDistRef.current = 0; lastSplitTimeRef.current = 0
    splitsRef.current = []

    try {
      gpsTracker.onPositionUpdate(coord => {
        const prev = coordsRef.current[coordsRef.current.length - 1]
        coordsRef.current.push(coord)
        if (prev) {
          distRef.current += haversineKm(prev, coord)
          setDist(distRef.current)

          // ── Km split detection ──────────────────────────────────────────
          // Setiap kali melewati 1 km penuh, catat pace untuk km tersebut
          const completedKm = Math.floor(distRef.current)
          const lastSplitKm = Math.floor(lastSplitDistRef.current)
          if (completedKm > lastSplitKm && completedKm > 0) {
            // Hitung durasi untuk km ini saja
            const currentDur = splitsRef.current.length > 0
              ? (Date.now() - (startTimeRef.current?.getTime() ?? Date.now())) / 1000
              : 0
            const splitDurSec = currentDur - lastSplitTimeRef.current
            const splitDistKm = distRef.current - lastSplitDistRef.current
            const splitPace = splitDistKm > 0
              ? (() => {
                  const sPerKm = splitDurSec / splitDistKm
                  return `${String(Math.floor(sPerKm / 60)).padStart(2, '0')}:${String(Math.floor(sPerKm % 60)).padStart(2, '0')}`
                })()
              : '--:--'

            const newSplit: KmSplit = {
              km: completedKm,
              paceStr: splitPace,
              distAtSplit: distRef.current,
            }
            splitsRef.current = [...splitsRef.current, newSplit]
            setKmSplits([...splitsRef.current])
            lastSplitDistRef.current = distRef.current
            lastSplitTimeRef.current = currentDur
          }
        }
        onPositionUpdate?.({ lat: coord.lat, lng: coord.lng })
        const track = coordsToLineString(coordsRef.current)
        lastTrackRef.current = track
        onTrackUpdate?.(track)
        claimCheckCounterRef.current++
        if (claimCheckCounterRef.current % CLAIM_CHECK_INTERVAL === 0) {
          void processClaim(coordsRef.current)
        }
      })

      gpsTracker.onSpeedViolation(() => {
        setSpeedWarn(true); setIsRunning(false); onSessionChange?.(false)
        onTrackUpdate?.(null); onPositionUpdate?.(null)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      })

      gpsTracker.onGPSLost(() => { onPositionUpdate?.(null) })

      await gpsTracker.startSession()
      setIsRunning(true); onSessionChange?.(true)
      startTimeRef.current = new Date()
      timerRef.current = setInterval(() => setDur(p => p + 1), 1000)
    } catch (err) {
      setStartErr(err instanceof Error ? err.message : 'Gagal memulai GPS')
    } finally {
      setIsStarting(false)
    }
  }, [onPositionUpdate, onTrackUpdate, onSessionChange, processClaim])

  const handleStop = useCallback(async () => {
    const start = startTimeRef.current ?? new Date()
    const fd = distRef.current
    const fDur = dur
    const fClaimed = claimed
    const finalTrack = lastTrackRef.current
    const finalSplits = [...splitsRef.current]

    try { await gpsTracker.stopSession() } catch { /* ignore */ }

    setIsRunning(false); onSessionChange?.(false); onTrackUpdate?.(null)
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    coordsRef.current = []; distRef.current = 0; startTimeRef.current = null

    if (fd > 0.01 && fDur > 10) void saveRunSession(userId, fd, fDur, start, new Date())

    setSummaryData({ dist: fd, dur: fDur, claimed: fClaimed, track: finalTrack, splits: finalSplits })
    setShowSummary(true)
  }, [onSessionChange, onTrackUpdate, userId, dur, claimed])

  // Pace real-time: detik total / jarak total
  const paceStr = calcPace(dist, dur)

  // ─── Post-run summary ──────────────────────────────────────────────────────
  if (showSummary && summaryData) {
    return (
      <PostRunSummary
        distanceKm={summaryData.dist}
        durationSec={summaryData.dur}
        claimedCount={summaryData.claimed}
        territoryKm2={totalTerritoryKm2}
        track={summaryData.track}
        userColor={userColor}
        splits={summaryData.splits}
        onClose={() => { setShowSummary(false); setSummaryData(null) }}
        onShare={() => {
          const text = `Berlari ${summaryData.dist.toFixed(2)} km dalam ${fmtDur(summaryData.dur)} — pace rata-rata ${calcPace(summaryData.dist, summaryData.dur)}/km! #TerritoryRunner`
          if (navigator.share) void navigator.share({ title: 'Territory Runner', text })
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

      {/* ── Run Panel — compact ── */}
      <div style={{
        position: 'fixed', bottom: 72, left: 0, right: 0, zIndex: 50,
        padding: '0 12px 8px',
        display: 'flex', flexDirection: 'column', gap: 6,
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
                Pengaturan Browser → Izin Lokasi → Izinkan
              </p>
            )}
          </Alert>
        )}

        {/* Main card — compact height */}
        <div style={{
          pointerEvents: 'auto',
          background: '#FFFFFF',
          borderRadius: minimized ? 99 : 20,
          boxShadow: '0 -2px 20px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
          overflow: 'hidden',
          transition: 'border-radius 0.25s ease',
        }}>

          {minimized ? (
            /* ── Mini bar ── */
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isRunning && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C0392B', animation: 'pulse-ring 1.5s ease-out infinite' }} />}
                <span style={{ fontSize: 17, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{dist.toFixed(2)}</span>
                <span style={{ fontSize: 12, color: '#AAA' }}>km</span>
                <span style={{ fontSize: 12, color: '#DDD' }}>·</span>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtDur(dur)}</span>
                {isRunning && dist > 0.05 && (
                  <>
                    <span style={{ fontSize: 12, color: '#DDD' }}>·</span>
                    <span style={{ fontSize: 12, color: '#C0392B', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{paceStr}</span>
                    <span style={{ fontSize: 10, color: '#AAA' }}>/km</span>
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => setMinimized(false)}
                  style={{ fontSize: 11, color: '#C0392B', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                  Buka
                </button>
                {isRunning && (
                  <button type="button" onClick={() => void handleStop()}
                    style={{ width: 30, height: 30, borderRadius: '50%', background: '#FDECEA', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <rect x="1" y="1" width="3" height="8" rx="1" fill="#C0392B"/>
                      <rect x="6" y="1" width="3" height="8" rx="1" fill="#C0392B"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

          ) : isRunning ? (
            /* ── Running card — compact ── */
            <div>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8, cursor: 'pointer' }} onClick={() => setMinimized(true)}>
                <div style={{ width: 32, height: 3, borderRadius: 2, background: '#E0E0E0' }} />
              </div>

              {/* Distance + status row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 48, fontWeight: 900, color: '#C0392B', letterSpacing: '-0.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {dist.toFixed(2)}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#AAAAAA' }}>km</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#FDECEA', borderRadius: 99, padding: '4px 10px' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', animation: 'pulse-ring 1.5s ease-out infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#C0392B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Berlari</span>
                </div>
              </div>

              {/* Stats: Waktu | Pace */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', padding: '8px 16px 10px', gap: 0 }}>
                <StatCell label="Waktu" value={fmtDur(dur)} />
                <div style={{ background: '#F0F0F0', height: 28, alignSelf: 'center' }} />
                <StatCell label="Pace" value={paceStr} unit="/km" accent="#C0392B" />
              </div>

              {/* Km splits — scrollable horizontal */}
              {kmSplits.length > 0 && (
                <div style={{ padding: '0 16px 8px' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#CCC', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 5px' }}>
                    Interval
                  </p>
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                    {kmSplits.slice(-5).map(s => (
                      <div key={s.km} style={{
                        flexShrink: 0, background: '#F8F8F8', borderRadius: 8,
                        padding: '5px 10px', textAlign: 'center',
                        border: '1px solid #F0F0F0',
                      }}>
                        <p style={{ fontSize: 9, color: '#AAA', fontWeight: 600, margin: '0 0 2px' }}>Km {s.km}</p>
                        <p style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', margin: 0, fontVariantNumeric: 'tabular-nums' }}>{s.paceStr}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stop button */}
              <div style={{ padding: '0 12px 12px' }}>
                <button type="button" onClick={() => void handleStop()}
                  style={{
                    width: '100%', height: 46, borderRadius: 14,
                    background: '#1A1A1A', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: 'pointer',
                  }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1.5" y="1.5" width="4" height="11" rx="1.5" fill="white"/>
                    <rect x="8.5" y="1.5" width="4" height="11" rx="1.5" fill="white"/>
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Selesai</span>
                </button>
              </div>
            </div>

          ) : (
            /* ── Pre-run card — compact ── */
            <div>
              {/* Drag handle */}
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                <div style={{ width: 32, height: 3, borderRadius: 2, background: '#E0E0E0' }} />
              </div>

              {/* Distance placeholder */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, padding: '8px 16px 4px' }}>
                <span style={{ fontSize: 48, fontWeight: 900, color: '#DDDDDD', letterSpacing: '-0.04em', lineHeight: 1 }}>0.00</span>
                <span style={{ fontSize: 16, fontWeight: 600, color: '#DDDDDD' }}>km</span>
              </div>

              {/* Stats placeholder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', padding: '4px 16px 10px', gap: 0 }}>
                <StatCell label="Waktu" value="—" />
                <div style={{ background: '#F0F0F0', height: 24, alignSelf: 'center' }} />
                <StatCell label="Pace" value="—" unit="/km" />
              </div>

              {/* Start button */}
              <div style={{ padding: '0 12px 12px' }}>
                <button
                  type="button" onClick={() => void handleStart()} disabled={isStarting}
                  style={{
                    width: '100%', height: 50, borderRadius: 16,
                    background: isStarting ? '#E8A09A' : '#C0392B', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    cursor: isStarting ? 'not-allowed' : 'pointer',
                    boxShadow: isStarting ? 'none' : '0 4px 16px rgba(192,57,43,0.35)',
                    transition: 'all 0.2s',
                  }}
                >
                  {isStarting ? (
                    <>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Memulai GPS...</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M7 4L19 12L7 20V4Z" fill="white"/>
                      </svg>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Mulai Lari</span>
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

function StatCell({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 4px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#BBBBBB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: accent ?? '#1A1A1A', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: 9, color: '#BBBBBB', fontWeight: 500 }}>{unit}</span>}
      </div>
    </div>
  )
}

function Alert({ color, bg, border, children }: { color: string; bg: string; border: string; children: React.ReactNode }) {
  return (
    <div role="alert" style={{ pointerEvents: 'auto', padding: '8px 14px', background: bg, border: `1px solid ${border}`, borderRadius: 10, color, fontSize: 12, fontWeight: 600 }}>
      {children}
    </div>
  )
}

export default RunSession
