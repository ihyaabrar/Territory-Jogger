/**
 * Property Test — Validasi Minimum Luas Klaim
 *
 * // Feature: territory-jogger, Property 6: Validasi Luas Minimum
 *
 * Memvalidasi: Persyaratan 4.5
 *
 * Properti: Untuk setiap poligon klaim yang dihasilkan dengan luas kurang dari
 * 0,001 km², Territory_Service SHALL menolak klaim tersebut dan tidak membuat
 * entri baru di database, sehingga state database tidak berubah.
 *
 * Di sisi klien: isValidClaim() harus mengembalikan false untuk polygon < 0.001 km².
 */

import * as fc from 'fast-check'
import * as turf from '@turf/turf'
import { describe, it, expect } from 'vitest'
import { GeometryEngineImpl } from './geometryEngine'
import type { Feature, Polygon } from 'geojson'

const engine = new GeometryEngineImpl()

const MIN_CLAIM_AREA_KM2 = 0.001

/**
 * Membuat polygon dengan luas yang dikontrol menggunakan turf.circle.
 *
 * Luas lingkaran = π * r²
 * Untuk luas < 0.001 km² = 1000 m²:
 *   r < sqrt(1000 / π) ≈ 17.84 meter
 */
function makePolygonWithApproxArea(
  centerLng: number,
  centerLat: number,
  targetAreaM2: number,
): Feature<Polygon> {
  // r = sqrt(area / π)
  const radiusM = Math.sqrt(targetAreaM2 / Math.PI)
  return turf.circle([centerLng, centerLat], Math.max(radiusM, 0.1), {
    units: 'meters',
    steps: 32,
  })
}

describe('Property 6: Validasi Minimum Luas Klaim', () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * Properti: isValidClaim() harus mengembalikan false untuk semua polygon
   * dengan luas < 0.001 km².
   */
  it('menolak klaim dengan luas < 0.001 km²', () => {
    fc.assert(
      fc.property(
        // Posisi pusat dalam koordinat Indonesia
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        // Luas target: 1 m² hingga 999 m² (< 0.001 km² = 1000 m²)
        fc.float({ min: 1, max: 999, noNaN: true }),
        (centerLng, centerLat, targetAreaM2) => {
          const polygon = makePolygonWithApproxArea(centerLng, centerLat, targetAreaM2)

          const actualAreaKm2 = engine.calculateArea(polygon)

          // Jika luas aktual memang < threshold, klaim harus ditolak
          if (actualAreaKm2 < MIN_CLAIM_AREA_KM2) {
            expect(engine.isValidClaim(polygon)).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.5**
   *
   * Properti: isValidClaim() harus mengembalikan true untuk semua polygon
   * dengan luas ≥ 0.001 km².
   */
  it('menerima klaim dengan luas ≥ 0.001 km²', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        // Luas target: 1001 m² hingga 1.000.000 m² (≥ 0.001 km²)
        fc.float({ min: 1001, max: 1_000_000, noNaN: true }),
        (centerLng, centerLat, targetAreaM2) => {
          const polygon = makePolygonWithApproxArea(centerLng, centerLat, targetAreaM2)

          const actualAreaKm2 = engine.calculateArea(polygon)

          // Jika luas aktual memang ≥ threshold, klaim harus diterima
          if (actualAreaKm2 >= MIN_CLAIM_AREA_KM2) {
            expect(engine.isValidClaim(polygon)).toBe(true)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.5**
   *
   * Properti: calculateArea() harus konsisten dengan isValidClaim().
   * Jika calculateArea() < 0.001, maka isValidClaim() harus false.
   * Jika calculateArea() ≥ 0.001, maka isValidClaim() harus true.
   */
  it('calculateArea dan isValidClaim konsisten satu sama lain', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        // Radius: 1m hingga 2000m untuk mencakup kedua sisi threshold
        fc.float({ min: 1, max: 2000, noNaN: true }),
        (centerLng, centerLat, radiusM) => {
          const polygon = turf.circle([centerLng, centerLat], radiusM, {
            units: 'meters',
            steps: 32,
          })

          const areaKm2 = engine.calculateArea(polygon)
          const isValid = engine.isValidClaim(polygon)

          if (areaKm2 >= MIN_CLAIM_AREA_KM2) {
            expect(isValid).toBe(true)
          } else {
            expect(isValid).toBe(false)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  /**
   * **Validates: Requirements 4.4**
   *
   * Properti: calculateArea() harus mengembalikan nilai dalam km²
   * yang konsisten dengan turf.area() (dalam m²) dibagi 1.000.000.
   */
  it('calculateArea mengembalikan nilai dalam km² yang akurat', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        fc.float({ min: 10, max: 10000, noNaN: true }),
        (centerLng, centerLat, radiusM) => {
          const polygon = turf.circle([centerLng, centerLat], radiusM, {
            units: 'meters',
            steps: 64,
          })

          const areaKm2 = engine.calculateArea(polygon)
          const expectedKm2 = turf.area(polygon) / 1_000_000

          // Harus sama persis (tidak ada konversi tambahan)
          expect(areaKm2).toBeCloseTo(expectedKm2, 10)
        },
      ),
      { numRuns: 100 },
    )
  })
})
