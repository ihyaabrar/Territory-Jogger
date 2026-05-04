/**
 * Geometry Engine — Territory Runner
 *
 * Menjalankan semua operasi geometri di sisi klien menggunakan Turf.js v7.
 * Mengimplementasikan interface GeometryEngine dari src/types/index.ts.
 *
 * Persyaratan: 4.1, 4.2, 4.3, 4.4, 4.5, 11.1
 */

import * as turf from '@turf/turf'
import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon, Position } from 'geojson'
import type {
  Coordinate,
  GeometryEngine,
  LoopDetectionResult,
  PrivacyZone,
} from '../types/index'

// Toleransi simplifikasi utama (derajat)
const SIMPLIFY_TOLERANCE_PRIMARY = 0.00001
// Toleransi simplifikasi fallback (derajat)
const SIMPLIFY_TOLERANCE_FALLBACK = 0.000001
// Luas minimum klaim yang valid (km²)
const MIN_CLAIM_AREA_KM2 = 0.001

export class GeometryEngineImpl implements GeometryEngine {
  /**
   * Mendeteksi apakah jalur lari membentuk loop tertutup (self-intersection).
   *
   * Algoritma:
   * 1. Buat LineString dari seluruh jalur
   * 2. Panggil turf.kinks() untuk mendeteksi self-intersection
   * 3. Jika ada intersection, cari segmen yang membentuk loop
   * 4. Kembalikan LoopDetectionResult dengan titik intersection dan indeks loop
   *
   * Persyaratan: 4.1
   */
  detectLoop(track: Coordinate[]): LoopDetectionResult | null {
    // Butuh minimal 4 titik untuk membentuk loop (A→B→C→A minimal)
    if (track.length < 4) {
      return null
    }

    // Konversi Coordinate[] ke array Position [lng, lat]
    const positions: Position[] = track.map((c) => [c.lng, c.lat])

    let lineString: Feature<LineString>
    try {
      lineString = turf.lineString(positions)
    } catch {
      return null
    }

    let kinksResult: FeatureCollection<Point>
    try {
      kinksResult = turf.kinks(lineString)
    } catch {
      return null
    }

    if (kinksResult.features.length === 0) {
      return null
    }

    // Ambil titik intersection pertama
    const intersectionFeature = kinksResult.features[0]
    const intersectionPoint = intersectionFeature.geometry.coordinates as Position

    // Cari indeks segmen yang membentuk loop
    // Iterasi semua pasangan segmen untuk menemukan yang berpotongan dengan titik intersection
    const loopIndices = this._findLoopIndices(positions, intersectionPoint)
    if (loopIndices === null) {
      return null
    }

    return {
      intersectionPoint,
      loopStartIndex: loopIndices.start,
      loopEndIndex: loopIndices.end,
    }
  }

  /**
   * Membuat Poligon Klaim dari jalur dan hasil deteksi loop.
   *
   * Mengekstrak sub-jalur yang membentuk loop, lalu membuat polygon tertutup.
   * Jika polygon memiliki self-intersection (kinks), gunakan turf.unkinkPolygon
   * untuk menghasilkan polygon yang valid dan ambil bagian terbesar.
   *
   * Persyaratan: 4.2
   */
  createClaimPolygon(
    track: Coordinate[],
    loopResult: LoopDetectionResult,
  ): Feature<Polygon> {
    const { intersectionPoint, loopStartIndex, loopEndIndex } = loopResult

    // Ekstrak sub-jalur yang membentuk loop
    const loopSegment = track
      .slice(loopStartIndex, loopEndIndex + 1)
      .map((c): Position => [c.lng, c.lat])

    // Tutup ring: tambahkan titik intersection di awal dan akhir
    const ring: Position[] = [
      intersectionPoint,
      ...loopSegment,
      intersectionPoint,
    ]

    // Pastikan ring memiliki minimal 4 titik (3 unik + penutup)
    if (ring.length < 4) {
      throw new Error('Loop terlalu pendek untuk membentuk polygon valid')
    }

    const rawPolygon = turf.polygon([ring])

    // Jika polygon sudah valid, kembalikan langsung
    if (turf.booleanValid(rawPolygon)) {
      return rawPolygon
    }

    // Polygon memiliki self-intersection — gunakan unkinkPolygon untuk memperbaiki
    // dan ambil bagian terbesar
    try {
      const unkinked = turf.unkinkPolygon(rawPolygon)
      if (unkinked.features.length === 0) {
        throw new Error('unkinkPolygon menghasilkan koleksi kosong')
      }

      // Ambil polygon terbesar dari hasil unkink
      let largest = unkinked.features[0]
      let largestArea = turf.area(largest)

      for (let i = 1; i < unkinked.features.length; i++) {
        const a = turf.area(unkinked.features[i])
        if (a > largestArea) {
          largestArea = a
          largest = unkinked.features[i]
        }
      }

      return largest
    } catch {
      // Fallback: kembalikan polygon asli meskipun tidak valid
      return rawPolygon
    }
  }

  /**
   * Memotong bagian Poligon Klaim yang berada di dalam Privacy Zone.
   *
   * Untuk setiap Privacy Zone aktif:
   * - Buat circle polygon dari titik pusat dan radius
   * - Potong bagian polygon klaim yang berada di dalam circle
   * - Jika hasil difference adalah null, batalkan klaim (kembalikan null)
   *
   * Persyaratan: 8.3, 8.5
   */
  applyPrivacyZones(
    polygon: Feature<Polygon>,
    zones: PrivacyZone[],
  ): Feature<Polygon> | null {
    let result: Feature<Polygon> = polygon

    for (const zone of zones) {
      const privacyCircle = turf.circle(zone.center, zone.radiusM, {
        units: 'meters',
        steps: 64,
      })

      const differenceResult = turf.difference(
        turf.featureCollection([result, privacyCircle]),
      )

      if (differenceResult === null || differenceResult === undefined) {
        // Polygon sepenuhnya berada di dalam Privacy Zone — batalkan klaim
        return null
      }

      // turf.difference bisa mengembalikan Polygon atau MultiPolygon
      // Kita hanya mendukung Polygon; jika MultiPolygon, ambil bagian terbesar
      if (differenceResult.geometry.type === 'MultiPolygon') {
        const largest = this._largestPolygonFromMulti(
          differenceResult as Feature<MultiPolygon>,
        )
        if (largest === null) return null
        result = largest
      } else {
        result = differenceResult as Feature<Polygon>
      }
    }

    return result
  }

  /**
   * Menyederhanakan geometri Poligon Klaim menggunakan turf.simplify.
   *
   * Toleransi utama: 0.00001 derajat (highQuality: true)
   * Jika polygon tidak valid setelah simplifikasi, coba toleransi 0.000001
   * Jika masih tidak valid, throw error
   *
   * Persyaratan: 4.3, 11.1
   */
  simplifyPolygon(polygon: Feature<Polygon>): Feature<Polygon> {
    // Coba toleransi utama
    const simplified = turf.simplify(polygon, {
      tolerance: SIMPLIFY_TOLERANCE_PRIMARY,
      highQuality: true,
      mutate: false,
    }) as Feature<Polygon>

    if (turf.booleanValid(simplified)) {
      return simplified
    }

    // Coba toleransi fallback yang lebih kecil
    const simplifiedFallback = turf.simplify(polygon, {
      tolerance: SIMPLIFY_TOLERANCE_FALLBACK,
      highQuality: true,
      mutate: false,
    }) as Feature<Polygon>

    if (turf.booleanValid(simplifiedFallback)) {
      return simplifiedFallback
    }

    // Kedua toleransi gagal — throw error sesuai design.md
    throw new Error(
      'Polygon tidak valid setelah simplifikasi dengan kedua toleransi',
    )
  }

  /**
   * Menghitung luas Poligon Klaim dalam km².
   *
   * Menggunakan turf.area() yang mengembalikan luas dalam m²,
   * lalu dibagi 1.000.000 untuk konversi ke km².
   *
   * Persyaratan: 4.4
   */
  calculateArea(polygon: Feature<Polygon>): number {
    const areaM2 = turf.area(polygon)
    return areaM2 / 1_000_000
  }

  /**
   * Memvalidasi apakah Poligon Klaim memenuhi syarat minimum luas.
   *
   * Klaim valid jika luas ≥ 0.001 km².
   *
   * Persyaratan: 4.5
   */
  isValidClaim(polygon: Feature<Polygon>): boolean {
    const areaKm2 = this.calculateArea(polygon)
    return areaKm2 >= MIN_CLAIM_AREA_KM2
  }

  /**
   * Memproses poligon klaim secara lengkap:
   * 1. Buat poligon dari jalur dan hasil deteksi loop
   * 2. Potong bagian yang berada di dalam Privacy Zone (applyPrivacyZones)
   * 3. Sederhanakan geometri (simplifyPolygon)
   * 4. Validasi luas minimum (isValidClaim)
   *
   * Mengembalikan null jika:
   * - Poligon sepenuhnya berada di dalam Privacy Zone
   * - Luas poligon setelah pemotongan < 0.001 km²
   * - Simplifikasi gagal
   *
   * Ini adalah titik integrasi utama sebelum pengiriman klaim ke server.
   *
   * Persyaratan: 8.3, 8.5
   */
  processClaimPolygon(
    track: Coordinate[],
    loopResult: LoopDetectionResult,
    privacyZones: PrivacyZone[],
  ): Feature<Polygon> | null {
    // Langkah 1: Buat poligon klaim dari jalur
    let polygon: Feature<Polygon>
    try {
      polygon = this.createClaimPolygon(track, loopResult)
    } catch {
      return null
    }

    // Langkah 2: Potong Privacy Zone (jika ada)
    if (privacyZones.length > 0) {
      const clipped = this.applyPrivacyZones(polygon, privacyZones)
      if (clipped === null) {
        // Poligon sepenuhnya berada di dalam Privacy Zone — batalkan klaim
        return null
      }
      polygon = clipped
    }

    // Langkah 3: Sederhanakan geometri
    try {
      polygon = this.simplifyPolygon(polygon)
    } catch {
      return null
    }

    // Langkah 4: Validasi luas minimum
    if (!this.isValidClaim(polygon)) {
      return null
    }

    return polygon
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Mencari indeks awal dan akhir loop pada jalur berdasarkan titik intersection.
   *
   * Iterasi semua pasangan segmen (i, j) untuk menemukan dua segmen yang
   * berpotongan di dekat intersectionPoint. Segmen i dimulai dari loopStartIndex
   * dan segmen j berakhir di loopEndIndex.
   */
  private _findLoopIndices(
    positions: Position[],
    intersectionPoint: Position,
  ): { start: number; end: number } | null {
    const n = positions.length

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n - 1; j++) {
        // Cek apakah segmen [i, i+1] dan [j, j+1] berpotongan
        const seg1Start = positions[i]
        const seg1End = positions[i + 1]
        const seg2Start = positions[j]
        const seg2End = positions[j + 1]

        const crossPoint = this._segmentIntersection(
          seg1Start,
          seg1End,
          seg2Start,
          seg2End,
        )

        if (crossPoint !== null) {
          // Verifikasi bahwa titik perpotongan dekat dengan intersectionPoint
          const dist = Math.hypot(
            crossPoint[0] - intersectionPoint[0],
            crossPoint[1] - intersectionPoint[1],
          )
          if (dist < 0.001) {
            // ~111 meter toleransi
            return { start: i + 1, end: j }
          }
        }
      }
    }

    // Fallback: jika tidak ditemukan pasangan segmen yang tepat,
    // gunakan heuristik berdasarkan jarak titik ke intersectionPoint
    return this._findLoopIndicesByProximity(positions, intersectionPoint)
  }

  /**
   * Fallback: cari indeks loop berdasarkan kedekatan titik jalur
   * dengan intersectionPoint.
   */
  private _findLoopIndicesByProximity(
    positions: Position[],
    intersectionPoint: Position,
  ): { start: number; end: number } | null {
    const n = positions.length
    const THRESHOLD = 0.001 // ~111 meter

    // Kumpulkan semua indeks titik yang dekat dengan intersectionPoint
    const nearIndices: number[] = []
    for (let i = 0; i < n; i++) {
      const dist = Math.hypot(
        positions[i][0] - intersectionPoint[0],
        positions[i][1] - intersectionPoint[1],
      )
      if (dist < THRESHOLD) {
        nearIndices.push(i)
      }
    }

    if (nearIndices.length >= 2) {
      const start = nearIndices[0]
      const end = nearIndices[nearIndices.length - 1]
      if (end > start + 1) {
        return { start, end }
      }
    }

    // Tidak bisa menentukan loop — kembalikan null
    return null
  }

  /**
   * Menghitung titik perpotongan dua segmen garis menggunakan aljabar linear.
   * Mengembalikan null jika segmen tidak berpotongan atau paralel.
   */
  private _segmentIntersection(
    p1: Position,
    p2: Position,
    p3: Position,
    p4: Position,
  ): Position | null {
    const x1 = p1[0], y1 = p1[1]
    const x2 = p2[0], y2 = p2[1]
    const x3 = p3[0], y3 = p3[1]
    const x4 = p4[0], y4 = p4[1]

    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denom) < 1e-12) {
      return null // Paralel atau kolinear
    }

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
      return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)]
    }

    return null
  }

  /**
   * Mengambil polygon terbesar dari MultiPolygon.
   */
  private _largestPolygonFromMulti(
    multiPolygon: Feature<MultiPolygon>,
  ): Feature<Polygon> | null {
    const coords = multiPolygon.geometry.coordinates
    if (coords.length === 0) return null

    let largestIdx = 0
    let largestArea = 0

    for (let i = 0; i < coords.length; i++) {
      const poly = turf.polygon(coords[i])
      const a = turf.area(poly)
      if (a > largestArea) {
        largestArea = a
        largestIdx = i
      }
    }

    return turf.polygon(coords[largestIdx])
  }
}

/**
 * Singleton instance dari GeometryEngineImpl.
 * Digunakan di seluruh aplikasi untuk operasi geometri.
 */
export const geometryEngine: GeometryEngine = new GeometryEngineImpl()
