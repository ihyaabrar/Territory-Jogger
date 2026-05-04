/**
 * Core TypeScript interfaces for Territory Jogger
 * Sesuai dengan design.md - Model Data Frontend
 */

import type { Feature, LineString, Polygon, Position } from 'geojson'

// ─── GPS & Tracking ──────────────────────────────────────────────────────────

/**
 * Satu titik koordinat GPS yang direkam selama sesi lari.
 */
export interface Coordinate {
  lat: number
  lng: number
  timestamp: number
  accuracy: number // meter
  speed: number    // m/s
}

/**
 * Data jalur lari lengkap dari satu sesi.
 */
export interface TrackData {
  coordinates: Coordinate[]
  startTime: number
  endTime: number
  totalDistance: number // km
}

// ─── Geometry Engine ─────────────────────────────────────────────────────────

/**
 * Hasil deteksi loop (self-intersection) pada jalur lari.
 */
export interface LoopDetectionResult {
  intersectionPoint: Position
  loopStartIndex: number
  loopEndIndex: number
}

// ─── Territory & Map ─────────────────────────────────────────────────────────

/**
 * Wilayah yang dikuasai oleh seorang pengguna, tersimpan di database.
 */
export interface Territory {
  id: string
  userId: string
  userColor: string   // Format: #RRGGBB
  username: string
  avatarUrl?: string
  geom: Feature<Polygon>
  areaKm2: number
  updatedAt: string
}

/**
 * Area privasi pengguna yang dikecualikan dari peta publik dan klaim.
 * Radius dalam meter (50–500).
 */
export interface PrivacyZone {
  id: string
  center: [number, number] // [lng, lat]
  radiusM: number          // 50–500 meter
}

// ─── Run Session ─────────────────────────────────────────────────────────────

/**
 * Satu sesi lari pengguna, mencakup jalur GPS dan statistik.
 */
export interface RunSession {
  id: string
  track: Feature<LineString>
  distanceKm: number
  durationSec: number
  startedAt: string
  endedAt?: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

/**
 * Profil pengguna yang terdaftar.
 */
export interface UserProfile {
  id: string
  username: string
  userColor: string   // Format: #RRGGBB
  avatarUrl?: string
  lastActive: string
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

/**
 * Satu entri di leaderboard daerah.
 */
export interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatarUrl: string
  userColor: string   // Format: #RRGGBB
  totalAreaKm2: number
}

/**
 * Level administratif untuk leaderboard daerah.
 */
export type LeaderboardLevel = 'kelurahan' | 'kecamatan' | 'kota'

// ─── GPS Tracker Interface ────────────────────────────────────────────────────

/**
 * Kontrak publik untuk komponen GPS_Tracker.
 */
export interface GPSTracker {
  startSession(): Promise<void>
  stopSession(): Promise<TrackData>
  getCurrentPosition(): Coordinate
  onPositionUpdate(callback: (coord: Coordinate) => void): void
  onSpeedViolation(callback: () => void): void
  onGPSLost(callback: () => void): void
}

// ─── Geometry Engine Interface ────────────────────────────────────────────────

/**
 * Kontrak publik untuk komponen Geometry_Engine.
 */
export interface GeometryEngine {
  detectLoop(track: Coordinate[]): LoopDetectionResult | null
  createClaimPolygon(track: Coordinate[], loopResult: LoopDetectionResult): Feature<Polygon>
  applyPrivacyZones(polygon: Feature<Polygon>, zones: PrivacyZone[]): Feature<Polygon> | null
  simplifyPolygon(polygon: Feature<Polygon>): Feature<Polygon>
  calculateArea(polygon: Feature<Polygon>): number // km²
  isValidClaim(polygon: Feature<Polygon>): boolean
  /**
   * Memproses poligon klaim secara lengkap: potong Privacy Zone, sederhanakan,
   * dan validasi luas minimum. Mengembalikan null jika klaim tidak valid.
   *
   * Alur: createClaimPolygon → applyPrivacyZones → simplifyPolygon → isValidClaim
   *
   * Persyaratan: 8.3, 8.5
   */
  processClaimPolygon(
    track: Coordinate[],
    loopResult: LoopDetectionResult,
    privacyZones: PrivacyZone[],
  ): Feature<Polygon> | null
}

// ─── Leaderboard Service Interface ───────────────────────────────────────────

/**
 * Kontrak publik untuk komponen Leaderboard_Service.
 */
export interface LeaderboardService {
  getLeaderboard(
    level: LeaderboardLevel,
    regionId: string
  ): Promise<LeaderboardEntry[]>
}

// ─── Invasion Notification ───────────────────────────────────────────────────

/**
 * Notifikasi invasion yang diterima pengguna.
 */
export interface InvasionNotification {
  id: string
  victimId: string
  attackerId: string
  attackerUsername: string
  areaLostKm2: number
  location?: [number, number] // [lng, lat]
  isRead: boolean
  createdAt: string
}
