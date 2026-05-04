/**
 * useMapViewport — Territory Jogger
 *
 * Hook untuk mendeteksi perubahan viewport peta Leaflet dan memuat
 * wilayah yang berada dalam viewport secara inkremental.
 *
 * Persyaratan: 6.3, 6.4, 11.3
 */

import { useCallback, useRef } from 'react'
import { useTerritoryStore } from '../stores/territoryStore'
import { getTerritoriesInViewport } from '../services/territoryService'
import type { ViewportBBox } from '../services/territoryService'

const VIEWPORT_DEBOUNCE_MS = 500

export interface UseMapViewportReturn {
  handleViewportChange: (bounds: ViewportBBox) => void
  isLoading: boolean
}

export function useMapViewport(): UseMapViewportReturn {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isLoadingRef = useRef(false)
  const lastBBoxRef = useRef<ViewportBBox | null>(null)

  // Gunakan getState() langsung agar tidak masuk dependency array
  const storeRef = useRef(useTerritoryStore.getState)

  const loadTerritoriesInViewport = useCallback(async (bbox: ViewportBBox) => {
    if (isLoadingRef.current) return
    isLoadingRef.current = true

    try {
      const newTerritories = await getTerritoriesInViewport(bbox)
      const { territories, addTerritory, updateTerritory, removeTerritory } = storeRef.current()

      const newIds = new Set(newTerritories.map((t) => t.id))

      // Tambah atau perbarui wilayah baru
      for (const territory of newTerritories) {
        const existing = territories.get(territory.id)
        if (!existing) {
          addTerritory(territory)
        } else if (existing.updatedAt !== territory.updatedAt) {
          updateTerritory(territory.id, {
            geom: territory.geom,
            areaKm2: territory.areaKm2,
            userColor: territory.userColor,
            username: territory.username,
            updatedAt: territory.updatedAt,
          })
        }
      }

      // Hapus wilayah yang benar-benar di luar viewport
      for (const [id] of territories) {
        if (!newIds.has(id)) {
          const territory = territories.get(id)
          if (territory) {
            const geom = territory.geom
            if (geom?.type === 'Feature' && geom.geometry?.type === 'Polygon') {
              const coords = geom.geometry.coordinates[0]
              if (coords && coords.length > 0) {
                let minLng = Infinity, maxLng = -Infinity
                let minLat = Infinity, maxLat = -Infinity
                for (const [lng, lat] of coords) {
                  if (typeof lng === 'number' && typeof lat === 'number') {
                    minLng = Math.min(minLng, lng)
                    maxLng = Math.max(maxLng, lng)
                    minLat = Math.min(minLat, lat)
                    maxLat = Math.max(maxLat, lat)
                  }
                }
                const isOutside =
                  maxLng < bbox.minLng ||
                  minLng > bbox.maxLng ||
                  maxLat < bbox.minLat ||
                  minLat > bbox.maxLat
                if (isOutside) {
                  removeTerritory(id)
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('[useMapViewport] Gagal memuat wilayah dalam viewport:', error)
    } finally {
      isLoadingRef.current = false
    }
  }, []) // dependency kosong — akses store via ref

  const handleViewportChange = useCallback((bounds: ViewportBBox) => {
    lastBBoxRef.current = bounds

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (lastBBoxRef.current) {
        loadTerritoriesInViewport(lastBBoxRef.current)
      }
    }, VIEWPORT_DEBOUNCE_MS)
  }, [loadTerritoriesInViewport])

  return {
    handleViewportChange,
    isLoading: isLoadingRef.current,
  }
}
