/**
 * Property-Based Test: Debounce GPS Membatasi Frekuensi Update
 * Feature: territory-jogger, Property 12: Debounce GPS
 * Memvalidasi: Persyaratan 11.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { shouldPassDebounce } from './gpsTracker'

// Konstanta debounce (1 update per detik)
const DEBOUNCE_MS = 1_000

// ─── Simulasi Debounce ────────────────────────────────────────────────────────

/**
 * Simulasikan alur debounce untuk urutan update GPS.
 * Mengembalikan daftar timestamp update yang berhasil diteruskan ke peta.
 */
function simulateDebounce(updateTimestamps: number[]): number[] {
  const passed: number[] = []
  let lastPassedTimestamp = 0

  for (const ts of updateTimestamps) {
    if (shouldPassDebounce(lastPassedTimestamp, ts, DEBOUNCE_MS)) {
      passed.push(ts)
      lastPassedTimestamp = ts
    }
  }

  return passed
}

// ─── Unit Tests ───────────────────────────────────────────────────────────────

describe('Debounce GPS — Unit Tests', () => {
  it('Update pertama selalu diteruskan jika timestamp ≥ 1000ms dari awal', () => {
    const passed = simulateDebounce([1_000])
    expect(passed).toHaveLength(1)
  })

  it('Update berturut-turut dalam < 1 detik hanya meneruskan yang pertama', () => {
    const passed = simulateDebounce([1_000, 1_200, 1_500, 1_800])
    expect(passed).toHaveLength(1)
    expect(passed[0]).toBe(1_000)
  })

  it('Update dengan interval tepat 1 detik semuanya diteruskan', () => {
    const passed = simulateDebounce([1_000, 2_000, 3_000, 4_000])
    expect(passed).toHaveLength(4)
  })

  it('Update dengan interval > 1 detik semuanya diteruskan', () => {
    const passed = simulateDebounce([1_000, 2_500, 4_200, 6_000])
    expect(passed).toHaveLength(4)
  })

  it('Tidak ada update yang diteruskan jika semua terlalu cepat', () => {
    // Semua dalam 1 detik pertama, tapi belum mencapai 1000ms dari lastUpdate=0
    const passed = simulateDebounce([100, 200, 300, 400, 500])
    expect(passed).toHaveLength(0)
  })

  it('Campuran interval: hanya update yang memenuhi debounce yang diteruskan', () => {
    // 0 → 1000 (pass), 1200 (skip), 1500 (skip), 2000 (pass), 2100 (skip), 3500 (pass)
    const passed = simulateDebounce([1_000, 1_200, 1_500, 2_000, 2_100, 3_500])
    expect(passed).toEqual([1_000, 2_000, 3_500])
  })
})

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('Debounce GPS — Property Tests', () => {
  /**
   * Properti 12: Debounce GPS Membatasi Frekuensi Update
   *
   * Untuk setiap urutan update posisi GPS dengan interval acak, mekanisme
   * debounce SHALL memastikan tidak ada lebih dari satu pembaruan posisi per
   * detik yang diteruskan ke layer peta, terlepas dari seberapa sering
   * GPS_Tracker menerima koordinat baru.
   *
   * Memvalidasi: Persyaratan 11.4
   */

  it(
    'Properti 12a: Tidak ada dua update berturut-turut yang diteruskan dalam interval < 1 detik',
    () => {
      // Generator: urutan timestamp GPS acak (0–60000ms, sudah diurutkan)
      const timestampsArb = fc
        .array(fc.integer({ min: 0, max: 60_000 }), { minLength: 1, maxLength: 50 })
        .map((ts) => [...ts].sort((a, b) => a - b))

      fc.assert(
        fc.property(timestampsArb, (timestamps) => {
          const passed = simulateDebounce(timestamps)

          // Periksa bahwa tidak ada dua update berturut-turut yang berjarak < 1 detik
          for (let i = 1; i < passed.length; i++) {
            const interval = passed[i] - passed[i - 1]
            if (interval < DEBOUNCE_MS) return false
          }
          return true
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12b: Jumlah update yang diteruskan tidak melebihi (durasi_total / 1000) + 1',
    () => {
      // Generator: urutan timestamp GPS acak
      const timestampsArb = fc
        .array(fc.integer({ min: 0, max: 60_000 }), { minLength: 2, maxLength: 100 })
        .map((ts) => [...ts].sort((a, b) => a - b))

      fc.assert(
        fc.property(timestampsArb, (timestamps) => {
          if (timestamps.length < 2) return true

          const passed = simulateDebounce(timestamps)
          const totalDurationMs = timestamps[timestamps.length - 1] - timestamps[0]
          const maxAllowedUpdates = Math.floor(totalDurationMs / DEBOUNCE_MS) + 1

          // Jumlah update yang diteruskan tidak boleh melebihi batas teoritis
          return passed.length <= maxAllowedUpdates
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12c: Semua update yang diteruskan adalah subset dari update asli',
    () => {
      const timestampsArb = fc
        .array(fc.integer({ min: 0, max: 60_000 }), { minLength: 0, maxLength: 50 })
        .map((ts) => [...ts].sort((a, b) => a - b))

      fc.assert(
        fc.property(timestampsArb, (timestamps) => {
          const passed = simulateDebounce(timestamps)
          // Setiap timestamp yang diteruskan harus ada di daftar asli
          return passed.every((ts) => timestamps.includes(ts))
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12d: Urutan update yang diteruskan harus monoton meningkat',
    () => {
      const timestampsArb = fc
        .array(fc.integer({ min: 0, max: 60_000 }), { minLength: 0, maxLength: 50 })
        .map((ts) => [...ts].sort((a, b) => a - b))

      fc.assert(
        fc.property(timestampsArb, (timestamps) => {
          const passed = simulateDebounce(timestamps)
          // Timestamp yang diteruskan harus dalam urutan yang meningkat
          for (let i = 1; i < passed.length; i++) {
            if (passed[i] <= passed[i - 1]) return false
          }
          return true
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12e: shouldPassDebounce bersifat deterministik untuk input yang sama',
    () => {
      const lastUpdateArb = fc.integer({ min: 0, max: 60_000 })
      const nowArb = fc.integer({ min: 0, max: 120_000 })

      fc.assert(
        fc.property(lastUpdateArb, nowArb, (lastUpdate, now) => {
          const result1 = shouldPassDebounce(lastUpdate, now, DEBOUNCE_MS)
          const result2 = shouldPassDebounce(lastUpdate, now, DEBOUNCE_MS)
          // Fungsi harus deterministik
          return result1 === result2
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12f: Jika interval ≥ 1 detik, update selalu diteruskan',
    () => {
      const lastUpdateArb = fc.integer({ min: 0, max: 60_000 })
      const extraArb = fc.integer({ min: 0, max: 10_000 })

      fc.assert(
        fc.property(lastUpdateArb, extraArb, (lastUpdate, extra) => {
          const now = lastUpdate + DEBOUNCE_MS + extra
          return shouldPassDebounce(lastUpdate, now, DEBOUNCE_MS) === true
        }),
        { numRuns: 100 },
      )
    },
  )

  it(
    'Properti 12g: Jika interval < 1 detik, update tidak diteruskan',
    () => {
      const lastUpdateArb = fc.integer({ min: 1_000, max: 60_000 })
      const shortIntervalArb = fc.integer({ min: 1, max: DEBOUNCE_MS - 1 })

      fc.assert(
        fc.property(lastUpdateArb, shortIntervalArb, (lastUpdate, interval) => {
          const now = lastUpdate + interval
          return shouldPassDebounce(lastUpdate, now, DEBOUNCE_MS) === false
        }),
        { numRuns: 100 },
      )
    },
  )
})
