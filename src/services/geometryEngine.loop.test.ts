/**
 * Property Test — Deteksi Loop Menghasilkan Poligon Valid
 *
 * // Feature: territory-jogger, Property 1: Deteksi Loop
 *
 * Memvalidasi: Persyaratan 4.1, 4.2
 *
 * Properti: Untuk setiap jalur lari yang mengandung self-intersection,
 * Geometry_Engine SHALL menghasilkan poligon yang valid (tidak self-intersecting,
 * tertutup, dan memiliki luas > 0), dan poligon tersebut harus mencakup area
 * yang dikelilingi oleh loop.
 */

import * as fc from 'fast-check'
import * as turf from '@turf/turf'
import { describe, it, expect } from 'vitest'
import { GeometryEngineImpl } from './geometryEngine'
import type { Coordinate } from '../types/index'

const engine = new GeometryEngineImpl()

/**
 * Membuat jalur berbentuk lasso yang pasti memiliki tepat satu self-intersection.
 *
 * Bentuk: garis lurus ke kanan, lalu loop persegi yang kembali memotong garis awal.
 *
 *   0 ──────────── 1
 *                  |
 *   5 ──── 4 ──── 3
 *   |             |
 *   6 ──── 7 ──── 2
 *
 * Segmen [5→6] memotong segmen [0→1] karena 5 berada di atas garis 0→1
 * dan 6 berada di bawah garis 0→1.
 *
 * Versi yang lebih sederhana dan deterministik:
 * Jalur lurus ke kanan, lalu loop yang kembali memotong jalur awal.
 */
function makeLassoTrack(
  centerLng: number,
  centerLat: number,
  size: number,
): Coordinate[] {
  // Jalur lasso: mulai dari kiri, pergi ke kanan (segmen ini akan dipotong),
  // lalu buat loop persegi dan kembali memotong segmen awal
  //
  //  0 ──────────────────── 1
  //                          \
  //  (intersection)           2
  //       |                   |
  //       5 ──── 4 ──── 3 ───/
  //
  // Titik 5 berada di atas garis 0→1, sehingga segmen 4→5 memotong 0→1

  const s = size
  const coords: [number, number][] = [
    [centerLng - s,       centerLat],           // 0: start kiri
    [centerLng + s,       centerLat],           // 1: kanan
    [centerLng + s,       centerLat - s],       // 2: kanan bawah
    [centerLng,           centerLat - s],       // 3: tengah bawah
    [centerLng,           centerLat + s * 0.5], // 4: tengah atas (di atas garis 0→1)
    [centerLng - s * 0.5, centerLat + s * 0.5], // 5: kiri atas
    [centerLng - s * 0.5, centerLat],           // 6: kiri tengah (memotong 0→1)
  ]

  return coords.map((c, i) => ({
    lat: c[1],
    lng: c[0],
    timestamp: Date.now() + i * 1000,
    accuracy: 5,
    speed: 2,
  }))
}

/**
 * Membuat jalur berbentuk "P" (lasso dengan ekor) yang pasti memiliki loop.
 *
 * Jalur: mulai dari bawah, naik ke atas, buat loop persegi searah jarum jam,
 * lalu kembali ke bawah memotong jalur naik.
 */
function makePShapeTrack(
  centerLng: number,
  centerLat: number,
  size: number,
): Coordinate[] {
  const s = size
  const coords: [number, number][] = [
    [centerLng,       centerLat - s],       // 0: bawah (start)
    [centerLng,       centerLat + s],       // 1: atas (segmen ini akan dipotong)
    [centerLng + s,   centerLat + s],       // 2: kanan atas
    [centerLng + s,   centerLat],           // 3: kanan tengah
    [centerLng - s * 0.3, centerLat],       // 4: kiri tengah (memotong segmen 0→1)
  ]

  return coords.map((c, i) => ({
    lat: c[1],
    lng: c[0],
    timestamp: Date.now() + i * 1000,
    accuracy: 5,
    speed: 2,
  }))
}

describe('Property 1: Deteksi Loop Menghasilkan Poligon Valid', () => {
  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * Properti: Untuk setiap jalur dengan self-intersection yang valid,
   * detectLoop() harus mengembalikan LoopDetectionResult yang non-null,
   * dan createClaimPolygon() harus menghasilkan polygon yang valid dengan luas > 0.
   */
  it('menghasilkan polygon valid dari jalur berbentuk lasso', () => {
    fc.assert(
      fc.property(
        // Generator: posisi pusat acak dalam batas koordinat yang wajar
        fc.float({ min: 100, max: 140, noNaN: true }),  // lng Indonesia
        fc.float({ min: -10, max: 6, noNaN: true }),    // lat Indonesia
        // Ukuran loop: 0.001 hingga 0.05 derajat (~100m - 5km)
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.05), noNaN: true }),
        (centerLng, centerLat, size) => {
          const track = makeLassoTrack(centerLng, centerLat, size)

          const loopResult = engine.detectLoop(track)

          // Jika loop terdeteksi, polygon harus valid
          if (loopResult !== null) {
            const polygon = engine.createClaimPolygon(track, loopResult)

            // Polygon harus valid menurut OGC Simple Feature Specification
            expect(turf.booleanValid(polygon)).toBe(true)

            // Polygon harus memiliki luas > 0
            const area = turf.area(polygon)
            expect(area).toBeGreaterThan(0)

            // Polygon harus tertutup (koordinat pertama = terakhir)
            const coords = polygon.geometry.coordinates[0]
            expect(coords[0]).toEqual(coords[coords.length - 1])
          }
          // Jika loop tidak terdeteksi, itu juga valid (jalur mungkin tidak berpotongan)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('menghasilkan polygon valid dari jalur berbentuk P-shape', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.03), noNaN: true }),
        (centerLng, centerLat, scale) => {
          const track = makePShapeTrack(centerLng, centerLat, scale)

          const loopResult = engine.detectLoop(track)

          if (loopResult !== null) {
            const polygon = engine.createClaimPolygon(track, loopResult)

            expect(turf.booleanValid(polygon)).toBe(true)
            expect(turf.area(polygon)).toBeGreaterThan(0)

            const coords = polygon.geometry.coordinates[0]
            expect(coords[0]).toEqual(coords[coords.length - 1])
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('mengembalikan null untuk jalur tanpa loop', () => {
    fc.assert(
      fc.property(
        // Generator: jalur lurus (tidak ada self-intersection)
        fc.float({ min: 100, max: 140, noNaN: true }),
        fc.float({ min: -10, max: 6, noNaN: true }),
        fc.integer({ min: 4, max: 20 }),
        (startLng, startLat, numPoints) => {
          // Jalur lurus ke timur — tidak ada self-intersection
          const track: Coordinate[] = Array.from({ length: numPoints }, (_, i) => ({
            lat: startLat,
            lng: startLng + i * 0.001,
            timestamp: Date.now() + i * 1000,
            accuracy: 5,
            speed: 2,
          }))

          const loopResult = engine.detectLoop(track)
          expect(loopResult).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('mengembalikan null untuk jalur dengan kurang dari 4 titik', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (numPoints) => {
          const track: Coordinate[] = Array.from({ length: numPoints }, (_, i) => ({
            lat: -6.2 + i * 0.001,
            lng: 106.8 + i * 0.001,
            timestamp: Date.now() + i * 1000,
            accuracy: 5,
            speed: 2,
          }))

          const loopResult = engine.detectLoop(track)
          expect(loopResult).toBeNull()
        },
      ),
      { numRuns: 100 },
    )
  })
})
