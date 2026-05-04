/**
 * Property Test: Slicing Mempertahankan Konservasi Area
 *
 * Feature: territory-jogger, Property 3: Konservasi Area Slicing
 *
 * Properti yang diuji:
 * Untuk setiap pasangan poligon klaim baru (A) dan wilayah yang ada (B) yang
 * berpotongan, luas sisa wilayah B setelah slicing SHALL sama dengan
 * `luas(B) - luas(intersection(A, B))` dalam toleransi ±0,1%.
 *
 * Memvalidasi: Persyaratan 5.2, 5.3, 5.6
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import * as turf from '@turf/turf'
import type { Feature, Polygon, Position } from 'geojson'

// ─── Generator Helpers ────────────────────────────────────────────────────────

/**
 * Membuat poligon persegi panjang (bounding box) dari koordinat pusat dan ukuran.
 * Koordinat dalam derajat desimal (WGS84).
 */
function makeRectPolygon(
  centerLng: number,
  centerLat: number,
  halfWidthDeg: number,
  halfHeightDeg: number,
): Feature<Polygon> {
  const minLng = centerLng - halfWidthDeg
  const maxLng = centerLng + halfWidthDeg
  const minLat = centerLat - halfHeightDeg
  const maxLat = centerLat + halfHeightDeg

  const ring: Position[] = [
    [minLng, minLat],
    [maxLng, minLat],
    [maxLng, maxLat],
    [minLng, maxLat],
    [minLng, minLat], // tutup ring
  ]

  return turf.polygon([ring])
}

/**
 * Arbitrary untuk poligon persegi panjang acak di area Indonesia
 * (sekitar lng 95–141, lat -11–6).
 *
 * Ukuran: 0.01–0.3 derajat per sisi (cukup besar untuk area yang terukur).
 * Menggunakan fc.double() karena fc.float() memerlukan nilai 32-bit float.
 */
const arbitraryRectPolygon = fc.tuple(
  fc.double({ min: 100, max: 130, noNaN: true }),   // centerLng
  fc.double({ min: -8, max: 4, noNaN: true }),       // centerLat
  fc.double({ min: 0.01, max: 0.3, noNaN: true }),   // halfWidth
  fc.double({ min: 0.01, max: 0.3, noNaN: true }),   // halfHeight
).map(([lng, lat, hw, hh]) => makeRectPolygon(lng, lat, hw, hh))

/**
 * Arbitrary untuk dua poligon yang dijamin berpotongan.
 *
 * Strategi: buat poligon A, lalu buat poligon B yang pusatnya digeser sedikit
 * dari pusat A sehingga ada overlap parsial.
 */
const arbitraryIntersectingPair = fc.tuple(
  fc.double({ min: 100, max: 130, noNaN: true }),   // centerLng A
  fc.double({ min: -8, max: 4, noNaN: true }),       // centerLat A
  fc.double({ min: 0.05, max: 0.3, noNaN: true }),   // halfWidth A
  fc.double({ min: 0.05, max: 0.3, noNaN: true }),   // halfHeight A
  fc.double({ min: 0.01, max: 0.15, noNaN: true }),  // offset B dari pusat A (sebagian overlap)
  fc.double({ min: 0.05, max: 0.3, noNaN: true }),   // halfWidth B
  fc.double({ min: 0.05, max: 0.3, noNaN: true }),   // halfHeight B
).map(([lngA, latA, hwA, hhA, offset, hwB, hhB]) => {
  const polygonA = makeRectPolygon(lngA, latA, hwA, hhA)
  // Pusat B digeser sedikit dari pusat A agar ada overlap parsial
  const polygonB = makeRectPolygon(lngA + offset, latA + offset, hwB, hhB)
  return { polygonA, polygonB }
})

// ─── Fungsi Slicing (Logika yang Diuji) ──────────────────────────────────────

/**
 * Menghitung luas sisa wilayah B setelah dipotong oleh A (dalam m²).
 * Menggunakan turf.difference — sama seperti yang digunakan di server (ST_Difference).
 *
 * Mengembalikan 0 jika B sepenuhnya berada di dalam A (tidak ada sisa).
 * Mengembalikan luas total semua bagian sisa (termasuk MultiPolygon).
 */
function computeRemainderArea(
  polygonA: Feature<Polygon>,
  polygonB: Feature<Polygon>,
): number {
  const result = turf.difference(turf.featureCollection([polygonB, polygonA]))
  if (!result) return 0
  // turf.area() menghitung luas total untuk Polygon maupun MultiPolygon
  return turf.area(result)
}

/**
 * Mengembalikan true jika B sepenuhnya berada di dalam A (tidak ada sisa).
 */
function isFullyContained(
  polygonA: Feature<Polygon>,
  polygonB: Feature<Polygon>,
): boolean {
  const result = turf.difference(turf.featureCollection([polygonB, polygonA]))
  return result === null || result === undefined
}

/**
 * Menghitung luas intersection antara A dan B.
 * Mengembalikan 0 jika tidak ada intersection.
 */
function computeIntersectionArea(
  polygonA: Feature<Polygon>,
  polygonB: Feature<Polygon>,
): number {
  const intersection = turf.intersect(turf.featureCollection([polygonA, polygonB]))
  if (!intersection) return 0
  return turf.area(intersection)
}

// ─── Property Test ────────────────────────────────────────────────────────────

describe('Property 3: Slicing Mempertahankan Konservasi Area', () => {
  /**
   * Properti utama: area(remainder) ≈ area(B) - area(intersection(A, B))
   * dalam toleransi ±0,1%.
   *
   * Memvalidasi: Persyaratan 5.2, 5.3, 5.6
   */
  it('area sisa B setelah slicing oleh A ≈ area(B) - area(intersection(A, B)) dalam toleransi ±0.1%', () => {
    // Feature: territory-jogger, Property 3: Konservasi Area Slicing
    fc.assert(
      fc.property(arbitraryIntersectingPair, ({ polygonA, polygonB }) => {
        // Pastikan kedua poligon valid
        if (!turf.booleanValid(polygonA) || !turf.booleanValid(polygonB)) {
          return true // skip poligon tidak valid
        }

        // Hitung luas B sebelum slicing (dalam m²)
        const areaB = turf.area(polygonB)

        // Hitung luas intersection A ∩ B
        const areaIntersection = computeIntersectionArea(polygonA, polygonB)

        // Jika tidak ada intersection, skip (properti tidak berlaku)
        if (areaIntersection <= 0) {
          return true
        }

        // Hitung luas sisa B setelah dipotong A (total semua bagian)
        const areaRemainder = computeRemainderArea(polygonA, polygonB)

        // Nilai yang diharapkan: area(B) - area(intersection(A, B))
        const expectedRemainder = areaB - areaIntersection

        // Toleransi: ±0.1% dari area B
        const tolerance = areaB * 0.001

        // Verifikasi konservasi area dalam toleransi ±0.1%
        return Math.abs(areaRemainder - expectedRemainder) <= tolerance
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    )
  })

  /**
   * Properti tambahan: sisa B tidak boleh berpotongan dengan A.
   * Setelah slicing, remainder(B) dan A harus disjoint (atau hanya berbagi batas).
   *
   * Memvalidasi: Persyaratan 5.2
   */
  it('sisa B setelah slicing tidak berpotongan dengan A (disjoint atau hanya berbagi batas)', () => {
    // Feature: territory-jogger, Property 3: Konservasi Area Slicing
    fc.assert(
      fc.property(arbitraryIntersectingPair, ({ polygonA, polygonB }) => {
        if (!turf.booleanValid(polygonA) || !turf.booleanValid(polygonB)) {
          return true
        }

        const areaIntersection = computeIntersectionArea(polygonA, polygonB)
        if (areaIntersection <= 0) {
          return true // tidak ada intersection, skip
        }

        if (isFullyContained(polygonA, polygonB)) {
          return true // B sepenuhnya terpotong — tidak ada sisa yang bisa berpotongan
        }

        // Hitung sisa B setelah dipotong A
        const remainder = turf.difference(turf.featureCollection([polygonB, polygonA]))
        if (!remainder) return true

        // Hitung intersection antara remainder dan A
        // Harus sangat kecil (hanya batas/edge, bukan area)
        const remainderIntersectionArea = computeIntersectionArea(
          polygonA,
          remainder.geometry.type === 'MultiPolygon'
            ? turf.polygon(remainder.geometry.coordinates[0]) as Feature<Polygon>
            : remainder as Feature<Polygon>,
        )

        // Toleransi: intersection sisa tidak boleh lebih dari 0.1% dari area B
        const areaB = turf.area(polygonB)
        const tolerance = areaB * 0.001

        return remainderIntersectionArea <= tolerance
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    )
  })

  /**
   * Properti: luas sisa B tidak boleh melebihi luas B asli.
   *
   * Memvalidasi: Persyaratan 5.3
   */
  it('luas sisa B tidak melebihi luas B asli', () => {
    // Feature: territory-jogger, Property 3: Konservasi Area Slicing
    fc.assert(
      fc.property(arbitraryRectPolygon, arbitraryRectPolygon, (polygonA, polygonB) => {
        if (!turf.booleanValid(polygonA) || !turf.booleanValid(polygonB)) {
          return true
        }

        const areaB = turf.area(polygonB)
        const areaRemainder = computeRemainderArea(polygonA, polygonB)

        // Sisa tidak boleh lebih besar dari B asli (dengan toleransi floating point kecil)
        const tolerance = areaB * 0.001
        return areaRemainder <= areaB + tolerance
      }),
      {
        numRuns: 100,
        verbose: false,
      },
    )
  })
})
