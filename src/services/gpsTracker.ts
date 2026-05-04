/**
 * GPS Tracker Service — Web Mode Implementation
 * Menggunakan browser Geolocation API (navigator.geolocation.watchPosition)
 * Feature: territory-jogger
 * Persyaratan: 3.1, 3.2, 3.4, 3.5, 3.6, 3.7, 11.4
 */

import type { Coordinate, TrackData, GPSTracker } from '../types/index'

// ─── Konstanta ────────────────────────────────────────────────────────────────

/** Kecepatan maksimum yang diizinkan dalam m/s (20 km/jam) */
const MAX_SPEED_MS = 20 / 3.6 // 5.556 m/s

/** Durasi jendela Speed Guard dalam milidetik (10 detik) */
const SPEED_WINDOW_MS = 10_000

/** Akurasi GPS maksimum yang diterima dalam meter */
const MAX_ACCURACY_M = 50

/** Durasi timeout GPS lost dalam milidetik (30 detik) */
const GPS_LOST_TIMEOUT_MS = 30_000

/** Interval debounce pembaruan peta dalam milidetik (1 detik) */
const MAP_UPDATE_DEBOUNCE_MS = 1_000

// ─── Tipe Internal ────────────────────────────────────────────────────────────

interface SpeedSample {
  speed: number    // m/s
  timestamp: number // ms
}

// ─── Implementasi GPSTracker ──────────────────────────────────────────────────

/**
 * Implementasi GPSTracker menggunakan browser Geolocation API.
 * Web mode: tracking hanya aktif saat tab browser aktif (tidak ada background tracking).
 */
export class WebGPSTracker implements GPSTracker {
  // State sesi
  private isSessionActive = false
  private coordinates: Coordinate[] = []
  private startTime = 0
  private watchId: number | null = null

  // Posisi terakhir yang diketahui
  private lastCoordinate: Coordinate | null = null

  // Callbacks
  private positionUpdateCallback: ((coord: Coordinate) => void) | null = null
  private speedViolationCallback: (() => void) | null = null
  private gpsLostCallback: (() => void) | null = null

  // Speed Guard: sliding window buffer
  private speedBuffer: SpeedSample[] = []
  private speedViolationTriggered = false

  // GPS Lost: timestamp update terakhir
  private gpsLostTimer: ReturnType<typeof setTimeout> | null = null
  private isGPSLost = false

  // Debounce: timestamp update peta terakhir
  private lastMapUpdateTimestamp = 0

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Mulai sesi lari baru.
   * Meminta izin GPS dan mulai merekam koordinat.
   * @throws Error jika izin GPS ditolak atau tidak tersedia
   */
  async startSession(): Promise<void> {
    if (this.isSessionActive) {
      throw new Error('Sesi lari sudah aktif')
    }

    // Verifikasi ketersediaan Geolocation API
    if (!navigator.geolocation) {
      throw new Error('Geolocation API tidak tersedia di browser ini')
    }

    // Reset state
    this.coordinates = []
    this.speedBuffer = []
    this.speedViolationTriggered = false
    this.isGPSLost = false
    this.lastCoordinate = null
    this.lastMapUpdateTimestamp = 0
    this.startTime = Date.now()

    // Mulai watchPosition
    await this._startWatchPosition()

    this.isSessionActive = true
    this._resetGPSLostTimer()
  }

  /**
   * Hentikan sesi lari aktif dan kembalikan data jalur.
   * @returns TrackData berisi semua koordinat yang direkam
   */
  async stopSession(): Promise<TrackData> {
    if (!this.isSessionActive) {
      throw new Error('Tidak ada sesi lari yang aktif')
    }

    this._stopWatchPosition()
    this._clearGPSLostTimer()

    const endTime = Date.now()
    const totalDistance = this._calculateTotalDistance(this.coordinates)

    const trackData: TrackData = {
      coordinates: [...this.coordinates],
      startTime: this.startTime,
      endTime,
      totalDistance,
    }

    // Reset state
    this.isSessionActive = false
    this.speedBuffer = []
    this.speedViolationTriggered = false
    this.isGPSLost = false

    return trackData
  }

  /**
   * Kembalikan posisi GPS terakhir yang diketahui.
   * @throws Error jika belum ada posisi yang direkam
   */
  getCurrentPosition(): Coordinate {
    if (!this.lastCoordinate) {
      throw new Error('Belum ada posisi GPS yang tersedia')
    }
    return { ...this.lastCoordinate }
  }

  /**
   * Daftarkan callback untuk menerima update posisi GPS.
   * Callback dipanggil maksimum 1 kali per detik (debounce).
   */
  onPositionUpdate(callback: (coord: Coordinate) => void): void {
    this.positionUpdateCallback = callback
  }

  /**
   * Daftarkan callback yang dipanggil saat pelanggaran kecepatan terdeteksi.
   */
  onSpeedViolation(callback: () => void): void {
    this.speedViolationCallback = callback
  }

  /**
   * Daftarkan callback yang dipanggil saat sinyal GPS hilang > 30 detik.
   */
  onGPSLost(callback: () => void): void {
    this.gpsLostCallback = callback
  }

  // ─── Internal: Watch Position ────────────────────────────────────────────────

  private _startWatchPosition(): Promise<void> {
    return new Promise((resolve, reject) => {
      const options: PositionOptions = {
        enableHighAccuracy: true,
        maximumAge: 3_000,
        timeout: 10_000,
      }

      // Dapatkan posisi awal untuk memverifikasi izin
      navigator.geolocation.getCurrentPosition(
        (_pos) => {
          // Izin diberikan, mulai watchPosition
          this.watchId = navigator.geolocation.watchPosition(
            (position) => this._handlePosition(position),
            (error) => this._handlePositionError(error),
            options,
          )
          resolve()
        },
        (error) => {
          reject(this._mapGeolocationError(error))
        },
        options,
      )
    })
  }

  private _stopWatchPosition(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId)
      this.watchId = null
    }
  }

  // ─── Internal: Position Handler ──────────────────────────────────────────────

  private _handlePosition(position: GeolocationPosition): void {
    if (!this.isSessionActive) return

    const { latitude, longitude, accuracy, speed } = position.coords
    const timestamp = position.timestamp

    // Abaikan titik dengan akurasi buruk (> 50 meter)
    if (accuracy > MAX_ACCURACY_M) return

    // Calculate speed from position delta if browser doesn't provide it (common on mobile)
    let derivedSpeed = speed ?? 0
    if ((speed === null || speed === undefined) && this.lastCoordinate) {
      const dtSec = (timestamp - this.lastCoordinate.timestamp) / 1000
      if (dtSec > 0) {
        const dLat = (latitude - this.lastCoordinate.lat) * Math.PI / 180
        const dLng = (longitude - this.lastCoordinate.lng) * Math.PI / 180
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(this.lastCoordinate.lat * Math.PI / 180) *
          Math.cos(latitude * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2
        const distM = 2 * 6371000 * Math.asin(Math.sqrt(a))
        derivedSpeed = distM / dtSec // m/s
      }
    }

    const coord: Coordinate = {
      lat: latitude,
      lng: longitude,
      timestamp,
      accuracy,
      speed: derivedSpeed,
    }

    // Update posisi terakhir
    this.lastCoordinate = coord

    // Reset GPS lost timer karena ada update baru
    this._resetGPSLostTimer()
    if (this.isGPSLost) {
      this.isGPSLost = false
    }

    // Simpan koordinat ke jalur
    this.coordinates.push(coord)

    // Jalankan Speed Guard
    if (!this.speedViolationTriggered) {
      this._checkSpeedGuard(coord)
    }

    // Jika Speed Guard sudah memicu, jangan teruskan update
    if (this.speedViolationTriggered) return

    // Debounce: teruskan ke peta maksimum 1 kali per detik
    const now = Date.now()
    if (now - this.lastMapUpdateTimestamp >= MAP_UPDATE_DEBOUNCE_MS) {
      this.lastMapUpdateTimestamp = now
      this.positionUpdateCallback?.(coord)
    }
  }

  private _handlePositionError(error: GeolocationPositionError): void {
    // Error dari watchPosition (bukan dari getCurrentPosition awal)
    // Tidak perlu throw karena sudah dalam sesi aktif
    console.warn('GPS error selama sesi:', error.message)
  }

  // ─── Internal: Speed Guard ───────────────────────────────────────────────────

  /**
   * Periksa apakah kecepatan rata-rata dalam 10 detik terakhir melebihi batas.
   * Menggunakan sliding window buffer.
   */
  private _checkSpeedGuard(coord: Coordinate): void {
    const now = coord.timestamp
    const windowStart = now - SPEED_WINDOW_MS

    // Tambahkan sample baru
    this.speedBuffer.push({ speed: coord.speed, timestamp: now })

    // Hapus sample yang sudah di luar jendela 10 detik
    this.speedBuffer = this.speedBuffer.filter((s) => s.timestamp >= windowStart)

    // Hanya periksa jika jendela sudah penuh (ada data selama ≥ 10 detik)
    if (this.speedBuffer.length < 2) return

    const oldestSample = this.speedBuffer[0]
    const windowDuration = now - oldestSample.timestamp

    // Jendela harus mencakup setidaknya 10 detik
    if (windowDuration < SPEED_WINDOW_MS) return

    // Hitung rata-rata kecepatan dalam jendela
    const avgSpeed =
      this.speedBuffer.reduce((sum, s) => sum + s.speed, 0) / this.speedBuffer.length

    if (avgSpeed > MAX_SPEED_MS) {
      this._triggerSpeedViolation()
    }
  }

  private _triggerSpeedViolation(): void {
    this.speedViolationTriggered = true
    this._stopWatchPosition()
    this._clearGPSLostTimer()
    this.isSessionActive = false
    this.speedViolationCallback?.()
  }

  // ─── Internal: GPS Lost ──────────────────────────────────────────────────────

  private _resetGPSLostTimer(): void {
    this._clearGPSLostTimer()
    this.gpsLostTimer = setTimeout(() => {
      if (this.isSessionActive && !this.speedViolationTriggered) {
        this.isGPSLost = true
        this.gpsLostCallback?.()
      }
    }, GPS_LOST_TIMEOUT_MS)
  }

  private _clearGPSLostTimer(): void {
    if (this.gpsLostTimer !== null) {
      clearTimeout(this.gpsLostTimer)
      this.gpsLostTimer = null
    }
  }

  // ─── Internal: Utilitas ──────────────────────────────────────────────────────

  /**
   * Hitung total jarak jalur dalam km menggunakan formula Haversine.
   */
  private _calculateTotalDistance(coords: Coordinate[]): number {
    if (coords.length < 2) return 0

    let totalKm = 0
    for (let i = 1; i < coords.length; i++) {
      totalKm += this._haversineKm(coords[i - 1], coords[i])
    }
    return totalKm
  }

  /**
   * Hitung jarak antara dua koordinat menggunakan formula Haversine (km).
   */
  private _haversineKm(a: Coordinate, b: Coordinate): number {
    const R = 6371 // Radius bumi dalam km
    const dLat = this._toRad(b.lat - a.lat)
    const dLng = this._toRad(b.lng - a.lng)
    const sinDLat = Math.sin(dLat / 2)
    const sinDLng = Math.sin(dLng / 2)
    const h =
      sinDLat * sinDLat +
      Math.cos(this._toRad(a.lat)) * Math.cos(this._toRad(b.lat)) * sinDLng * sinDLng
    return 2 * R * Math.asin(Math.sqrt(h))
  }

  private _toRad(deg: number): number {
    return (deg * Math.PI) / 180
  }

  /**
   * Petakan GeolocationPositionError ke Error yang informatif.
   */
  private _mapGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case GeolocationPositionError.PERMISSION_DENIED:
        return new Error(
          'Izin GPS ditolak. Aktifkan akses lokasi di pengaturan browser untuk menggunakan fitur ini.',
        )
      case GeolocationPositionError.POSITION_UNAVAILABLE:
        return new Error('Posisi GPS tidak tersedia. Pastikan perangkat mendukung GPS.')
      case GeolocationPositionError.TIMEOUT:
        return new Error('Permintaan GPS timeout. Coba lagi di area dengan sinyal lebih baik.')
      default:
        return new Error(`Kesalahan GPS tidak diketahui: ${error.message}`)
    }
  }

  // ─── Getter untuk Testing ────────────────────────────────────────────────────

  /** @internal Hanya untuk keperluan testing */
  get _speedBuffer(): SpeedSample[] {
    return this.speedBuffer
  }

  /** @internal Hanya untuk keperluan testing */
  get _isSessionActive(): boolean {
    return this.isSessionActive
  }

  /** @internal Hanya untuk keperluan testing */
  get _speedViolationTriggered(): boolean {
    return this.speedViolationTriggered
  }

  /** @internal Hanya untuk keperluan testing */
  get _lastMapUpdateTimestamp(): number {
    return this.lastMapUpdateTimestamp
  }
}

// ─── Ekspor Fungsi Utilitas (untuk testing) ───────────────────────────────────

/**
 * Hitung rata-rata kecepatan dari buffer sliding window.
 * Diekspor untuk keperluan unit testing Speed Guard.
 */
export function calculateAverageSpeed(buffer: Array<{ speed: number; timestamp: number }>): number {
  if (buffer.length === 0) return 0
  return buffer.reduce((sum, s) => sum + s.speed, 0) / buffer.length
}

/**
 * Filter buffer kecepatan untuk hanya menyertakan sample dalam jendela waktu.
 * Diekspor untuk keperluan unit testing Speed Guard.
 */
export function filterSpeedWindow(
  buffer: Array<{ speed: number; timestamp: number }>,
  windowMs: number,
  now: number,
): Array<{ speed: number; timestamp: number }> {
  const windowStart = now - windowMs
  return buffer.filter((s) => s.timestamp >= windowStart)
}

/**
 * Periksa apakah update peta harus diteruskan berdasarkan debounce.
 * Diekspor untuk keperluan unit testing debounce.
 * @returns true jika update boleh diteruskan, false jika harus di-skip
 */
export function shouldPassDebounce(lastUpdateMs: number, nowMs: number, debounceMs: number): boolean {
  return nowMs - lastUpdateMs >= debounceMs
}

// ─── Singleton Instance ───────────────────────────────────────────────────────

/** Instance singleton GPSTracker untuk digunakan di seluruh aplikasi */
export const gpsTracker = new WebGPSTracker()
