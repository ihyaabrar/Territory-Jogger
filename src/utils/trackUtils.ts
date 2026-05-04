/**
 * Track Utilities — Territory Jogger
 *
 * Fungsi utilitas untuk manipulasi jalur lari (track).
 * Menggunakan Turf.js untuk operasi geometri.
 *
 * Persyaratan: 8.4
 */

import * as turf from '@turf/turf'
import type { Feature, LineString, MultiLineString } from 'geojson'
import type { PrivacyZone } from '../types/index'

// ─── maskTrackWithPrivacyZones ────────────────────────────────────────────────

/**
 * Menyembunyikan segmen jalur lari yang melewati area Privacy Zone.
 *
 * Fungsi ini memotong bagian LineString yang berada di dalam setiap Privacy Zone
 * sebelum jalur ditampilkan kepada pengguna lain. Hasilnya adalah LineString
 * (atau MultiLineString jika zone memotong jalur di tengah) yang hanya berisi
 * segmen di luar semua Privacy Zone.
 *
 * Algoritma:
 * 1. Untuk setiap Privacy Zone, buat circle polygon dari titik pusat dan radius
 * 2. Gunakan turf.lineSplit untuk memotong jalur di batas circle
 * 3. Pertahankan hanya segmen yang berada di luar circle
 * 4. Ulangi untuk setiap Privacy Zone
 *
 * @param track  - Jalur lari sebagai GeoJSON Feature<LineString>
 * @param zones  - Array Privacy Zone yang aktif milik pengguna
 * @returns Jalur yang sudah dipotong sebagai Feature<LineString | MultiLineString>,
 *          atau null jika seluruh jalur berada di dalam Privacy Zone
 *
 * Persyaratan: 8.4
 */
export function maskTrackWithPrivacyZones(
  track: Feature<LineString>,
  zones: PrivacyZone[],
): Feature<LineString | MultiLineString> | null {
  // Tidak ada zone — kembalikan jalur asli
  if (zones.length === 0) {
    return track
  }

  // Kumpulkan semua segmen yang lolos dari semua Privacy Zone
  // Mulai dengan seluruh jalur sebagai satu segmen
  let segments: Feature<LineString>[] = [track]

  for (const zone of zones) {
    const privacyCircle = turf.circle(zone.center, zone.radiusM, {
      units: 'meters',
      steps: 64,
    })

    const nextSegments: Feature<LineString>[] = []

    for (const segment of segments) {
      // Potong segmen di batas circle
      const splitResult = turf.lineSplit(segment, privacyCircle)

      if (splitResult.features.length === 0) {
        // lineSplit tidak menghasilkan potongan — cek apakah seluruh segmen
        // berada di dalam atau di luar circle
        const midpoint = turf.midpoint(
          turf.point(segment.geometry.coordinates[0]),
          turf.point(
            segment.geometry.coordinates[
              Math.floor(segment.geometry.coordinates.length / 2)
            ],
          ),
        )

        if (!turf.booleanPointInPolygon(midpoint, privacyCircle)) {
          // Seluruh segmen di luar circle — pertahankan
          nextSegments.push(segment)
        }
        // Jika di dalam circle — buang segmen ini
        continue
      }

      // Filter: pertahankan hanya segmen yang berada di luar circle
      for (const piece of splitResult.features) {
        if (piece.geometry.type !== 'LineString') continue

        // Cek apakah titik tengah segmen berada di luar circle
        const coords = piece.geometry.coordinates
        if (coords.length === 0) continue

        const midIdx = Math.floor(coords.length / 2)
        const midPt = turf.point(coords[midIdx])

        if (!turf.booleanPointInPolygon(midPt, privacyCircle)) {
          nextSegments.push(piece as Feature<LineString>)
        }
      }
    }

    segments = nextSegments

    // Jika tidak ada segmen tersisa, seluruh jalur tersembunyi
    if (segments.length === 0) {
      return null
    }
  }

  // Tidak ada segmen tersisa
  if (segments.length === 0) {
    return null
  }

  // Satu segmen — kembalikan sebagai LineString
  if (segments.length === 1) {
    return segments[0]
  }

  // Beberapa segmen — gabungkan sebagai MultiLineString
  const multiCoords = segments.map((s) => s.geometry.coordinates)
  return turf.multiLineString(multiCoords) as Feature<MultiLineString>
}
