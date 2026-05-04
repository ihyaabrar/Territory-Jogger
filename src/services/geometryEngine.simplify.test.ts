/**
 * Property Test — Simplifikasi Mempertahankan Validitas dan Luas
 *
 * // Feature: territory-jogger, Property 2: Simplifikasi
 *
 * Memvalidasi: Persyaratan 4.3, 4.4, 11.1
 *
 * Properti: Untuk setiap poligon klaim yang valid dengan kompleksitas geometri
 * apapun, setelah simplifikasi dengan toleransi ≤ 0,00001 derajat, poligon yang
 * disederhanakan SHALL tetap valid (tidak self-intersecting) dan luasnya tidak
 * boleh berbeda lebih dari 5% dari luas asli.
 */

import * as fc from 'fast-check'
import * as turf from '@turf/turf'
import { describe, it, expect } from 'vitest'
import { GeometryEngineImpl } from './geometryEngine'
import type { Feature, Polygon } from 'geojson'

const engine = new GeometryEngineImpl()

/**
 * Membuat polygon valid acak berbentuk lingkaran yang di-perturb.
 *
 * Menggunakan titik-titik pada lingkaran dengan sedikit noise untuk
 * menghasilkan polygon yang valid dengan berbagai kompleksitas.
 */
function makeRandomPolygon(
  centerLng: number,
  centerLat: number,
  radiusDeg: number,
  numPoints: number,
  noiseFactor: number,
): Feature<Polygon> | null {
  if (numPoints < 3) return null

  const coords: [number, number][] = []

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI
    // Tambahkan noise kecil untuk variasi bentuk
    const r = radiusDeg * (1 + noiseFactor * (Math.random() - 0.5))
    coords.push([
      centerLng + r * Math.cos(angle),
      centerLat + r * Math.sin(angle),
    ])
  }

  // Tutup ring
  coords.push(coords[0])

  try {
    const poly = turf.polygon([coords])
    if (!turf.booleanValid(poly)) return null
    return poly
  } catch {
    return null
  }
}

/**
 * Membuat polygon valid menggunakan turf.circle (selalu valid).
 */
function makeCirclePolygon(
  centerLng: number,
  centerLat: number,
  radiusM: number,
  steps: number,
): Feature<Polygon> {
  return turf.circle([centerLng, centerLat], radiusM, {
    units: 'meters',
    steps: Math.max(steps, 4),
  })
}

describe('Property 2: Simplifikasi Mempertahankan Validitas dan Luas', () => {
  /**
   * **Validates: Requirements 4.3, 4.4, 11.1**
   *
   * Properti: Polygon hasil simplifikasi harus tetap valid dan
   * selisih luas < 5% dari luas asli.
   */
  it('simplifikasi mempertahankan validitas polygon (circle-based)', () => {
    fc.assert(
      fc.property(
        // Posisi pusat dalam koordinat Indonesia
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        // Radius: 100m hingga 5000m
        fc.float({ min: 100, max: 5000, noNaN: true }),
        // Jumlah titik: 10 hingga 500
        fc.integer({ min: 10, max: 500 }),
        (centerLng, centerLat, radiusM, steps) => {
          const polygon = makeCirclePolygon(centerLng, centerLat, radiusM, steps)

          // Polygon awal harus valid
          expect(turf.booleanValid(polygon)).toBe(true)

          const simplified = engine.simplifyPolygon(polygon)

          // Polygon hasil simplifikasi harus valid
          expect(turf.booleanValid(simplified)).toBe(true)

          // Selisih luas tidak boleh lebih dari 5%
          const originalArea = turf.area(polygon)
          const simplifiedArea = turf.area(simplified)

          if (originalArea > 0) {
            const areaDiffPercent = Math.abs(originalArea - simplifiedArea) / originalArea
            expect(areaDiffPercent).toBeLessThan(0.05)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('simplifikasi mempertahankan validitas polygon (perturbed circle)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        // Radius dalam derajat: 0.001 hingga 0.1
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
        // Jumlah titik: 10 hingga 200
        fc.integer({ min: 10, max: 200 }),
        // Noise factor: 0 hingga 0.1 (kecil agar polygon tetap valid)
        fc.float({ min: 0, max: Math.fround(0.1), noNaN: true }),
        (centerLng, centerLat, radiusDeg, numPoints, noiseFactor) => {
          const polygon = makeRandomPolygon(
            centerLng,
            centerLat,
            radiusDeg,
            numPoints,
            noiseFactor,
          )

          // Skip jika polygon tidak bisa dibuat valid
          if (polygon === null) return

          const simplified = engine.simplifyPolygon(polygon)

          // Polygon hasil simplifikasi harus valid
          expect(turf.booleanValid(simplified)).toBe(true)

          // Selisih luas tidak boleh lebih dari 5%
          const originalArea = turf.area(polygon)
          const simplifiedArea = turf.area(simplified)

          if (originalArea > 0) {
            const areaDiffPercent = Math.abs(originalArea - simplifiedArea) / originalArea
            expect(areaDiffPercent).toBeLessThan(0.05)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('simplifikasi tidak meningkatkan jumlah titik', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        fc.float({ min: 100, max: 5000, noNaN: true }),
        fc.integer({ min: 20, max: 500 }),
        (centerLng, centerLat, radiusM, steps) => {
          const polygon = makeCirclePolygon(centerLng, centerLat, radiusM, steps)
          const simplified = engine.simplifyPolygon(polygon)

          const originalPoints = polygon.geometry.coordinates[0].length
          const simplifiedPoints = simplified.geometry.coordinates[0].length

          // Simplifikasi tidak boleh menambah titik
          expect(simplifiedPoints).toBeLessThanOrEqual(originalPoints)
        },
      ),
      { numRuns: 100 },
    )
  })
})
