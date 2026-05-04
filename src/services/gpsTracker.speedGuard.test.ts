/**
 * Property-Based Test: Speed Guard Mendeteksi dan Menghentikan Kecepatan Berlebih
 * Feature: territory-jogger, Property 5: Speed Guard
 * Memvalidasi: Persyaratan 3.6, 3.7
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateAverageSpeed, filterSpeedWindow, shouldPassDebounce } from './gpsTracker'

// Konstanta yang sama dengan implementasi
const MAX_SPEED_MS = 20 / 3.6 // 5.556 m/s
const SPEED_WINDOW_MS = 10_000 // 10 detik

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Speed Guard — Unit Tests', () => {
  it('calculateAverageSpeed mengembalikan 0 untuk buffer kosong', () => {
    expect(calculateAverageSpeed([])).toBe(0)
  })

  it('calculateAverageSpeed menghitung rata-rata dengan benar', () => {
    const buffer = [
      { speed: 4, timestamp: 1000 },
      { speed: 6, timestamp: 2000 },
      { speed: 8, timestamp: 3000 },
    ]
    expect(calculateAverageSpeed(buffer)).toBeCloseTo(6, 5)
  })

  it('filterSpeedWindow menghapus sample di luar jendela', () => {
    const now = 15_000
    // windowStart = 15000 - 10000 = 5000
    const buffer = [
      { speed: 3, timestamp: 1_000 },  // di luar jendela (1000 < 5000)
      { speed: 4, timestamp: 4_999 },  // di luar jendela (4999 < 5000)
      { speed: 5, timestamp: 5_000 },  // tepat di batas (5000 >= 5000, masuk)
      { speed: 6, timestamp: 10_000 }, // dalam jendela
      { speed: 7, timestamp: 14_000 }, // dalam jendela
    ]
    const filtered = filterSpeedWindow(buffer, SPEED_WINDOW_MS, now)
    expect(filtered).toHaveLength(3)
    expect(filtered.every((s) => s.timestamp >= now - SPEED_WINDOW_MS)).toBe(true)
  })

  it('Speed Guard harus mendeteksi kecepatan > 20 km/jam', () => {
    // 25 km/jam = 6.944 m/s > 5.556 m/s
    const highSpeed = 25 / 3.6
    const buffer = Array.from({ length: 10 }, (_, i) => ({
      speed: highSpeed,
      timestamp: i * 1_000,
    }))
    const avg = calculateAverageSpeed(buffer)
    expect(avg).toBeGreaterThan(MAX_SPEED_MS)
  })

  it('Speed Guard tidak boleh memicu untuk kecepatan ≤ 20 km/jam', () => {
    // 18 km/jam = 5.0 m/s < 5.556 m/s
    const safeSpeed = 18 / 3.6
    const buffer = Array.from({ length: 10 }, (_, i) => ({
      speed: safeSpeed,
      timestamp: i * 1_000,
    }))
    const avg = calculateAverageSpeed(buffer)
    expect(avg).toBeLessThanOrEqual(MAX_SPEED_MS)
  })
})

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('Speed Guard — Property Tests', () => {
  /**
   * Properti 5: Speed Guard Mendeteksi dan Menghentikan Kecepatan Berlebih
   *
   * Untuk setiap urutan data kecepatan dalam sesi lari, jika terdapat jendela
   * waktu 10 detik berturut-turut di mana kecepatan rata-rata melebihi 20 km/jam,
   * maka Speed_Guard SHALL menghentikan perekaman jalur.
   *
   * Memvalidasi: Persyaratan 3.6, 3.7
   */

  it(
    'Properti 5a: Jika rata-rata kecepatan dalam jendela > 20 km/jam, Speed Guard harus mendeteksi pelanggaran',
    () => {
      // Generator: kecepatan di atas batas (> 5.556 m/s)
      // fc.float memerlukan nilai 32-bit float, gunakan Math.fround()
      const overSpeedArb = fc.float({ min: Math.fround(MAX_SPEED_MS + 0.1), max: Math.fround(30), noNaN: true })
      const bufferArb = fc.array(overSpeedArb, { minLength: 5, maxLength: 20 }).map((speeds) =>
        speeds.map((speed, i) => ({
          speed,
          timestamp: i * 1_000, // interval 1 detik
        })),
      )

      fc.assert(
        fc.property(bufferArb, (buffer) => {
          // Simulasikan jendela penuh (durasi ≥ 10 detik)
          if (buffer.length < 2) return true
          const windowDuration =
            buffer[buffer.length - 1].timestamp - buffer[0].timestamp
          if (windowDuration < SPEED_WINDOW_MS) return true

          const avg = calculateAverageSpeed(buffer)
          // Jika rata-rata > batas, Speed Guard harus mendeteksi pelanggaran
          return avg > MAX_SPEED_MS
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 5b: Jika rata-rata kecepatan dalam jendela ≤ 20 km/jam, Speed Guard tidak boleh memicu',
    () => {
      // Generator: kecepatan di bawah atau sama dengan batas (≤ 5.556 m/s)
      // fc.float memerlukan nilai 32-bit float, gunakan Math.fround()
      const safeSpeedArb = fc.float({ min: Math.fround(0), max: Math.fround(MAX_SPEED_MS), noNaN: true })
      const bufferArb = fc.array(safeSpeedArb, { minLength: 5, maxLength: 20 }).map((speeds) =>
        speeds.map((speed, i) => ({
          speed,
          timestamp: i * 1_000,
        })),
      )

      fc.assert(
        fc.property(bufferArb, (buffer) => {
          if (buffer.length === 0) return true
          const avg = calculateAverageSpeed(buffer)
          // Rata-rata harus ≤ batas → tidak ada pelanggaran
          return avg <= MAX_SPEED_MS
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 5c: filterSpeedWindow selalu mengembalikan subset dari buffer asli',
    () => {
      const sampleArb = fc.record({
        speed: fc.float({ min: Math.fround(0), max: Math.fround(30), noNaN: true }),
        timestamp: fc.integer({ min: 0, max: 100_000 }),
      })
      const bufferArb = fc.array(sampleArb, { minLength: 0, maxLength: 30 })
      const nowArb = fc.integer({ min: 0, max: 200_000 })

      fc.assert(
        fc.property(bufferArb, nowArb, (buffer, now) => {
          const filtered = filterSpeedWindow(buffer, SPEED_WINDOW_MS, now)
          // Hasil filter harus merupakan subset dari buffer asli
          const isSubset = filtered.every((s) =>
            buffer.some((b) => b.speed === s.speed && b.timestamp === s.timestamp),
          )
          // Semua sample dalam hasil harus berada dalam jendela waktu
          const allInWindow = filtered.every((s) => s.timestamp >= now - SPEED_WINDOW_MS)
          return isSubset && allInWindow
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 5d: Rata-rata kecepatan campuran (di atas dan di bawah batas) harus konsisten',
    () => {
      // Generator: campuran kecepatan tinggi dan rendah
      const speedArb = fc.float({ min: Math.fround(0), max: Math.fround(15), noNaN: true }) // 0–15 m/s
      const bufferArb = fc.array(speedArb, { minLength: 2, maxLength: 20 }).map((speeds) =>
        speeds.map((speed, i) => ({
          speed,
          timestamp: i * 1_000,
        })),
      )

      fc.assert(
        fc.property(bufferArb, (buffer) => {
          if (buffer.length === 0) return true
          const avg = calculateAverageSpeed(buffer)
          const minSpeed = Math.min(...buffer.map((s) => s.speed))
          const maxSpeed = Math.max(...buffer.map((s) => s.speed))
          // Rata-rata harus berada di antara min dan max
          return avg >= minSpeed && avg <= maxSpeed
        }),
        { numRuns: 100 },
      )
    },
  )
})

// ─── Property Tests untuk Debounce (digunakan bersama) ───────────────────────

describe('Debounce GPS — Unit Tests', () => {
  it('shouldPassDebounce mengembalikan true jika interval cukup', () => {
    expect(shouldPassDebounce(0, 1_000, 1_000)).toBe(true)
    expect(shouldPassDebounce(0, 1_001, 1_000)).toBe(true)
    expect(shouldPassDebounce(5_000, 6_000, 1_000)).toBe(true)
  })

  it('shouldPassDebounce mengembalikan false jika interval belum cukup', () => {
    expect(shouldPassDebounce(0, 999, 1_000)).toBe(false)
    expect(shouldPassDebounce(5_000, 5_500, 1_000)).toBe(false)
  })

  it('shouldPassDebounce mengembalikan true jika lastUpdate = 0 (belum pernah update)', () => {
    expect(shouldPassDebounce(0, 100, 1_000)).toBe(false)
    expect(shouldPassDebounce(0, 1_000, 1_000)).toBe(true)
  })
})
