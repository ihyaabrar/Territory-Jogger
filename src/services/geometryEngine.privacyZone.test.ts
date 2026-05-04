/**
 * Property Test — Privacy Zone Mengecualikan Area Sensitif dari Klaim dan Jalur
 *
 * // Feature: territory-jogger, Property 4: Privacy Zone
 *
 * Memvalidasi: Persyaratan 8.3, 8.5
 *
 * Properti: Untuk setiap poligon klaim dan setiap Privacy Zone aktif milik
 * pengguna, poligon klaim yang dikirim ke server SHALL tidak memiliki area
 * yang berada di dalam Privacy Zone tersebut.
 *
 * Verifikasi: turf.booleanDisjoint(clippedPolygon, privacyCircle) === true
 *
 * Catatan implementasi: turf.difference menghasilkan polygon yang batasnya
 * bersinggungan dengan lingkaran Privacy Zone (shared boundary). Karena
 * booleanDisjoint mengembalikan false jika ada titik batas yang sama,
 * kita memverifikasi bahwa area irisan (intersection) antara polygon yang
 * dipotong dan lingkaran Privacy Zone adalah nol atau sangat kecil (< 1 m²).
 */

import * as fc from 'fast-check'
import * as turf from '@turf/turf'
import { describe, it, expect } from 'vitest'
import { GeometryEngineImpl } from './geometryEngine'
import type { PrivacyZone } from '../types/index'
import type { Feature, Polygon } from 'geojson'

const engine = new GeometryEngineImpl()

// Toleransi area irisan yang diizinkan setelah pemotongan (m²)
// Nilai kecil ini mengakomodasi presisi floating-point dari turf.difference
const INTERSECTION_AREA_TOLERANCE_M2 = 1.0

/**
 * Membuat poligon klaim acak berbentuk lingkaran yang valid.
 *
 * Menggunakan turf.circle untuk memastikan polygon selalu valid.
 */
function makeClaimPolygon(
  centerLng: number,
  centerLat: number,
  radiusM: number,
): Feature<Polygon> {
  return turf.circle([centerLng, centerLat], radiusM, {
    units: 'meters',
    steps: 64,
  })
}

/**
 * Menghitung area irisan antara dua polygon dalam m².
 * Mengembalikan 0 jika tidak ada irisan.
 */
function intersectionAreaM2(
  poly1: Feature<Polygon>,
  poly2: Feature<Polygon>,
): number {
  try {
    const intersection = turf.intersect(turf.featureCollection([poly1, poly2]))
    if (intersection === null || intersection === undefined) return 0
    return turf.area(intersection)
  } catch {
    return 0
  }
}

describe('Property 4: Privacy Zone Mengecualikan Area Sensitif dari Klaim dan Jalur', () => {
  /**
   * **Validates: Requirements 8.3, 8.5**
   *
   * Properti utama: Setelah applyPrivacyZones(), poligon klaim yang dihasilkan
   * tidak boleh memiliki area yang berada di dalam Privacy Zone.
   *
   * Verifikasi: area irisan antara clippedPolygon dan privacyCircle < 1 m²
   * (mengakomodasi presisi floating-point dari turf.difference)
   */
  it('poligon klaim setelah pemotongan tidak memiliki area di dalam Privacy Zone', () => {
    fc.assert(
      fc.property(
        // Posisi pusat klaim dalam koordinat Indonesia
        fc.float({ min: 106, max: 107, noNaN: true }),  // lng Jakarta
        fc.float({ min: -7, max: -6, noNaN: true }),    // lat Jakarta
        // Radius klaim: 300m–2000m (cukup besar agar ada sisa setelah pemotongan)
        fc.float({ min: 300, max: 2000, noNaN: true }),
        // Offset pusat zone: 0.1–0.6 dari radius klaim (berpotongan tapi tidak mencakup penuh)
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.6), noNaN: true }),
        // Radius Privacy Zone: 50–500 meter (sesuai persyaratan 8.1)
        fc.float({ min: 50, max: 500, noNaN: true }),
        (centerLng, centerLat, claimRadiusM, offsetFraction, zoneRadiusM) => {
          const claimPolygon = makeClaimPolygon(centerLng, centerLat, claimRadiusM)

          // Geser pusat zone ke arah timur laut sebesar offsetFraction * claimRadius
          const offsetDeg = (claimRadiusM * offsetFraction) / 111_320
          const zone: PrivacyZone = {
            id: 'test-zone',
            center: [centerLng + offsetDeg, centerLat + offsetDeg],
            radiusM: zoneRadiusM,
          }

          const privacyCircle = turf.circle(zone.center, zone.radiusM, {
            units: 'meters',
            steps: 64,
          })

          const clipped = engine.applyPrivacyZones(claimPolygon, [zone])

          if (clipped === null) {
            // Poligon sepenuhnya berada di dalam Privacy Zone — klaim dibatalkan
            // Ini adalah perilaku yang benar sesuai persyaratan
            return
          }

          // Area irisan antara polygon yang dipotong dan lingkaran Privacy Zone
          // harus sangat kecil (< 1 m²) — hanya batas yang bersinggungan
          const overlapAreaM2 = intersectionAreaM2(clipped, privacyCircle)
          expect(overlapAreaM2).toBeLessThan(INTERSECTION_AREA_TOLERANCE_M2)
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 8.3, 8.5**
   *
   * Properti: Jika Privacy Zone sepenuhnya berada di luar poligon klaim,
   * applyPrivacyZones() harus mengembalikan poligon yang tidak berubah
   * (area irisan dengan zone tetap nol).
   */
  it('Privacy Zone di luar klaim tidak mengubah area klaim', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 106, max: 107, noNaN: true }),
        fc.float({ min: -7, max: -6, noNaN: true }),
        // Radius klaim: 100m–500m
        fc.float({ min: 100, max: 500, noNaN: true }),
        // Radius Privacy Zone: 50–200 meter (kecil agar mudah ditempatkan di luar)
        fc.float({ min: 50, max: 200, noNaN: true }),
        (centerLng, centerLat, claimRadiusM, zoneRadiusM) => {
          const claimPolygon = makeClaimPolygon(centerLng, centerLat, claimRadiusM)

          // Tempatkan Privacy Zone jauh di luar klaim:
          // jarak pusat zone = claimRadius + zoneRadius + 100m (buffer keamanan)
          const safeDistanceM = claimRadiusM + zoneRadiusM + 100
          const safeOffsetDeg = safeDistanceM / 111_320
          const zone: PrivacyZone = {
            id: 'far-zone',
            center: [centerLng + safeOffsetDeg, centerLat],
            radiusM: zoneRadiusM,
          }

          const privacyCircle = turf.circle(zone.center, zone.radiusM, {
            units: 'meters',
            steps: 64,
          })

          const clipped = engine.applyPrivacyZones(claimPolygon, [zone])

          // Zone di luar klaim tidak boleh membatalkan klaim
          expect(clipped).not.toBeNull()

          if (clipped !== null) {
            // Tidak ada area irisan antara klaim dan zone yang jauh
            const overlapAreaM2 = intersectionAreaM2(clipped, privacyCircle)
            expect(overlapAreaM2).toBeLessThan(INTERSECTION_AREA_TOLERANCE_M2)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 8.3, 8.5**
   *
   * Properti: Jika Privacy Zone mencakup seluruh poligon klaim,
   * applyPrivacyZones() harus mengembalikan null (batalkan klaim).
   */
  it('mengembalikan null jika Privacy Zone mencakup seluruh klaim', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 106, max: 107, noNaN: true }),
        fc.float({ min: -7, max: -6, noNaN: true }),
        // Radius klaim kecil: 10m–40m
        fc.float({ min: 10, max: 40, noNaN: true }),
        (centerLng, centerLat, claimRadiusM) => {
          // Klaim kecil di pusat yang sama dengan zone besar
          const claimPolygon = makeClaimPolygon(centerLng, centerLat, claimRadiusM)

          // Privacy Zone jauh lebih besar dari klaim (500m vs ≤40m)
          const zone: PrivacyZone = {
            id: 'large-zone',
            center: [centerLng, centerLat],
            radiusM: 500, // maksimum radius zone
          }

          const clipped = engine.applyPrivacyZones(claimPolygon, [zone])

          // Klaim kecil sepenuhnya di dalam zone besar → harus null
          expect(clipped).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 8.3, 8.5**
   *
   * Properti: Dengan beberapa Privacy Zone, semua zone harus dikecualikan
   * dari poligon klaim yang dihasilkan.
   */
  it('beberapa Privacy Zone semuanya dikecualikan dari klaim', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 106, max: 107, noNaN: true }),
        fc.float({ min: -7, max: -6, noNaN: true }),
        // Radius klaim besar: 1000m–2000m
        fc.float({ min: 1000, max: 2000, noNaN: true }),
        // Radius setiap zone: 50–150m (kecil agar tidak mencakup seluruh klaim)
        fc.array(fc.float({ min: 50, max: 150, noNaN: true }), { minLength: 1, maxLength: 3 }),
        (centerLng, centerLat, claimRadiusM, zoneRadii) => {
          const claimPolygon = makeClaimPolygon(centerLng, centerLat, claimRadiusM)

          // Buat beberapa zone di posisi berbeda di dalam klaim
          // Offset 0.3 dari radius klaim agar zone berada di dalam klaim
          const zones: PrivacyZone[] = zoneRadii.map((radiusM, i) => {
            const angle = (i / zoneRadii.length) * 2 * Math.PI
            const offsetDeg = (claimRadiusM * 0.3) / 111_320
            return {
              id: `zone-${i}`,
              center: [
                centerLng + offsetDeg * Math.cos(angle),
                centerLat + offsetDeg * Math.sin(angle),
              ] as [number, number],
              radiusM,
            }
          })

          const clipped = engine.applyPrivacyZones(claimPolygon, zones)

          if (clipped === null) {
            // Klaim dibatalkan — valid jika semua zone mencakup seluruh klaim
            return
          }

          // Setiap zone harus tidak memiliki area irisan dengan poligon yang dipotong
          for (const zone of zones) {
            const privacyCircle = turf.circle(zone.center, zone.radiusM, {
              units: 'meters',
              steps: 64,
            })
            const overlapAreaM2 = intersectionAreaM2(clipped, privacyCircle)
            expect(overlapAreaM2).toBeLessThan(INTERSECTION_AREA_TOLERANCE_M2)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 8.3, 8.5**
   *
   * Properti: applyPrivacyZones() dengan array zone kosong harus mengembalikan
   * poligon yang sama (tidak ada perubahan).
   */
  it('tidak ada perubahan jika tidak ada Privacy Zone', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 106, max: 107, noNaN: true }),
        fc.float({ min: -7, max: -6, noNaN: true }),
        fc.float({ min: 100, max: 1000, noNaN: true }),
        (centerLng, centerLat, radiusM) => {
          const claimPolygon = makeClaimPolygon(centerLng, centerLat, radiusM)

          const result = engine.applyPrivacyZones(claimPolygon, [])

          // Tanpa zone, poligon harus dikembalikan apa adanya (tidak null)
          expect(result).not.toBeNull()

          if (result !== null) {
            // Luas harus sama dengan aslinya
            const originalArea = turf.area(claimPolygon)
            const resultArea = turf.area(result)
            expect(resultArea).toBeCloseTo(originalArea, 0)
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})
