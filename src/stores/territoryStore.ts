/**
 * Territory Store — Territory Runner
 *
 * Zustand store untuk state management wilayah di sisi klien.
 * Mengelola daftar wilayah yang sedang ditampilkan di peta dan klaim yang tertunda.
 *
 * Persyaratan: 5.1, 5.2, 5.3, 5.4
 */

import { create } from 'zustand'
import type { Feature, Polygon } from 'geojson'
import type { Territory } from '../types/index'
import type { ClaimTerritoryResponse } from '../services/territoryService'

// ─── Tipe State ───────────────────────────────────────────────────────────────

export interface TerritoryState {
  /**
   * Map wilayah yang sedang aktif, diindeks berdasarkan ID wilayah.
   * Persyaratan: 5.1, 5.3
   */
  territories: Map<string, Territory>

  /**
   * Daftar poligon klaim yang sedang menunggu konfirmasi dari server.
   * Persyaratan: 5.4
   */
  pendingClaims: Feature<Polygon>[]

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Menambahkan wilayah baru ke state.
   * Jika wilayah dengan ID yang sama sudah ada, tidak melakukan apa-apa.
   */
  addTerritory: (territory: Territory) => void

  /**
   * Memperbarui wilayah yang sudah ada di state.
   * Jika wilayah tidak ditemukan, tidak melakukan apa-apa.
   */
  updateTerritory: (id: string, updates: Partial<Territory>) => void

  /**
   * Menghapus wilayah dari state berdasarkan ID.
   */
  removeTerritory: (id: string) => void

  /**
   * Mengganti seluruh daftar wilayah dengan data baru (misalnya setelah query viewport).
   */
  setTerritories: (territories: Territory[]) => void

  /**
   * Menambahkan poligon klaim ke daftar klaim yang tertunda.
   */
  addPendingClaim: (polygon: Feature<Polygon>) => void

  /**
   * Menghapus poligon klaim dari daftar klaim yang tertunda.
   */
  removePendingClaim: (polygon: Feature<Polygon>) => void

  /**
   * Memproses respons klaim dari server dan memperbarui state wilayah lokal.
   *
   * Alur:
   * 1. Tambahkan wilayah baru yang diklaim
   * 2. Perbarui atau hapus wilayah yang terpotong (sliced)
   * 3. Hapus poligon dari daftar klaim yang tertunda
   *
   * Persyaratan: 5.1, 5.2, 5.3, 5.4
   */
  applyClaimResult: (
    claimPolygon: Feature<Polygon>,
    response: ClaimTerritoryResponse,
    currentUserId: string,
    currentUserColor: string,
    currentUsername: string,
  ) => void

  /**
   * Menghapus semua wilayah dari state (misalnya saat logout).
   */
  clearTerritories: () => void
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTerritoryStore = create<TerritoryState>((set) => ({
  territories: new Map<string, Territory>(),
  pendingClaims: [],

  // ─── addTerritory ──────────────────────────────────────────────────────────

  addTerritory: (territory: Territory) => {
    set((state) => {
      if (state.territories.has(territory.id)) {
        // Wilayah sudah ada — tidak perlu ditambahkan lagi
        return state
      }
      const next = new Map(state.territories)
      next.set(territory.id, territory)
      return { territories: next }
    })
  },

  // ─── updateTerritory ───────────────────────────────────────────────────────

  updateTerritory: (id: string, updates: Partial<Territory>) => {
    set((state) => {
      const existing = state.territories.get(id)
      if (!existing) {
        // Wilayah tidak ditemukan — tidak ada yang diperbarui
        return state
      }
      const next = new Map(state.territories)
      next.set(id, { ...existing, ...updates })
      return { territories: next }
    })
  },

  // ─── removeTerritory ───────────────────────────────────────────────────────

  removeTerritory: (id: string) => {
    set((state) => {
      if (!state.territories.has(id)) {
        return state
      }
      const next = new Map(state.territories)
      next.delete(id)
      return { territories: next }
    })
  },

  // ─── setTerritories ────────────────────────────────────────────────────────

  setTerritories: (territories: Territory[]) => {
    const next = new Map<string, Territory>()
    for (const t of territories) {
      next.set(t.id, t)
    }
    set({ territories: next })
  },

  // ─── addPendingClaim ───────────────────────────────────────────────────────

  addPendingClaim: (polygon: Feature<Polygon>) => {
    set((state) => ({
      pendingClaims: [...state.pendingClaims, polygon],
    }))
  },

  // ─── removePendingClaim ────────────────────────────────────────────────────

  removePendingClaim: (polygon: Feature<Polygon>) => {
    set((state) => ({
      pendingClaims: state.pendingClaims.filter((p) => p !== polygon),
    }))
  },

  // ─── applyClaimResult ──────────────────────────────────────────────────────

  applyClaimResult: (
    claimPolygon: Feature<Polygon>,
    response: ClaimTerritoryResponse,
    currentUserId: string,
    currentUserColor: string,
    currentUsername: string,
  ) => {
    set((state) => {
      const next = new Map(state.territories)

      // 1. Tambahkan wilayah baru yang berhasil diklaim
      if (response.newTerritoryId) {
        const newTerritory: Territory = {
          id: response.newTerritoryId,
          userId: currentUserId,
          userColor: currentUserColor,
          username: currentUsername,
          geom: claimPolygon,
          areaKm2: 0, // Akan diperbarui dari server jika tersedia
          updatedAt: new Date().toISOString(),
        }
        next.set(response.newTerritoryId, newTerritory)
      }

      // 2. Proses wilayah yang terpotong (sliced)
      for (const sliced of response.slicedTerritories) {
        if (sliced.remainderGeom === null) {
          // Wilayah sepenuhnya terpotong — hapus dari state
          next.delete(sliced.id)
        } else {
          // Wilayah sebagian terpotong — perbarui geometri dan luas
          const existing = next.get(sliced.id)
          if (existing) {
            next.set(sliced.id, {
              ...existing,
              geom: sliced.remainderGeom,
              areaKm2: sliced.areaKm2,
              updatedAt: new Date().toISOString(),
            })
          }
        }
      }

      // 3. Hapus poligon dari daftar klaim yang tertunda
      const nextPending = state.pendingClaims.filter((p) => p !== claimPolygon)

      return {
        territories: next,
        pendingClaims: nextPending,
      }
    })
  },

  // ─── clearTerritories ──────────────────────────────────────────────────────

  clearTerritories: () => {
    set({
      territories: new Map<string, Territory>(),
      pendingClaims: [],
    })
  },
}))

// ─── Selector Helpers ─────────────────────────────────────────────────────────

/**
 * Mengambil semua wilayah sebagai array (untuk rendering di peta).
 */
export function selectTerritoriesArray(state: TerritoryState): Territory[] {
  return Array.from(state.territories.values())
}

/**
 * Mengambil wilayah milik pengguna tertentu.
 */
export function selectUserTerritories(
  state: TerritoryState,
  userId: string,
): Territory[] {
  return Array.from(state.territories.values()).filter(
    (t) => t.userId === userId,
  )
}

/**
 * Menghitung total luas wilayah milik pengguna tertentu dalam km².
 */
export function selectUserTotalArea(
  state: TerritoryState,
  userId: string,
): number {
  return selectUserTerritories(state, userId).reduce(
    (sum, t) => sum + t.areaKm2,
    0,
  )
}
