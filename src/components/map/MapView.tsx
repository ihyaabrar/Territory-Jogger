/**
 * MapView — Territory Runner
 * Dark map dengan koordinat overlay, compass, zoom controls
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { Map as LeafletMap, Polygon as LeafletPolygon, Polyline, Marker, LayerGroup, Renderer } from 'leaflet'
import type { Feature, LineString, Position } from 'geojson'
import type { Territory } from '../../types/index'
import { IconCrosshair, IconZoomIn, IconZoomOut, IconCompass } from '../ui/Icons'
import 'leaflet/dist/leaflet.css'

// Cache the Leaflet module after first import to avoid repeated dynamic imports
let leafletCache: typeof import('leaflet') | null = null
async function getLeaflet() {
  if (!leafletCache) leafletCache = await import('leaflet')
  return leafletCache
}

const DARK_MAP_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const CARTO_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
const DEFAULT_CENTER: [number, number] = [-7.7956, 110.3695]
const DEFAULT_ZOOM = 15

export interface MapViewProps {
  territories: Territory[]
  userPosition?: { lat: number; lng: number } | null
  userColor?: string
  runTrack?: Feature<LineString> | null
  onViewportChange?: (bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }) => void
  className?: string
  /** When true, calls map.invalidateSize() to fix tiles after visibility change */
  isVisible?: boolean
}

export function MapView({
  territories, userPosition, userColor = '#C0392B',
  runTrack, onViewportChange, className = '', isVisible = true,
}: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const canvasRendererRef = useRef<Renderer | null>(null)
  const territoryLayerRef = useRef<LayerGroup | null>(null)
  const territoryPolygonsRef = useRef<Map<string, LeafletPolygon>>(new Map())
  const userMarkerRef = useRef<Marker | null>(null)
  const runTrackPolylineRef = useRef<Polyline | null>(null)
  const markerRafRef = useRef<number | null>(null)
  const pendingMarkerPositionRef = useRef<{ lat: number; lng: number } | null>(null)
  const hasAutoFollowedRef = useRef(false)

  // Koordinat selalu dari userPosition (GPS) — fallback ke center peta
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [territoryCount, setTerritoryCount] = useState(0)

  // Koordinat yang ditampilkan: GPS jika ada, else center peta
  const displayCoords = userPosition ?? mapCenter

  // ─── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return

    getLeaflet().then((L) => {
      if (!mapContainerRef.current || mapRef.current) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapContainerRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
      })

      L.tileLayer(DARK_MAP_URL, {
        attribution: CARTO_ATTRIBUTION,
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map)

      const canvasRenderer = L.canvas({ padding: 0.5 })
      canvasRendererRef.current = canvasRenderer

      const territoryLayer = L.layerGroup().addTo(map)
      territoryLayerRef.current = territoryLayer

      mapRef.current = map

      // Update center koordinat saat peta bergerak (untuk display saat GPS tidak aktif)
      const updateCenter = () => {
        const c = map.getCenter()
        setMapCenter({ lat: c.lat, lng: c.lng })
        setZoom(map.getZoom())
        if (onViewportChange) {
          const b = map.getBounds()
          onViewportChange({ minLng: b.getWest(), minLat: b.getSouth(), maxLng: b.getEast(), maxLat: b.getNorth() })
        }
      }

      map.on('moveend', updateCenter)
      map.on('zoomend', updateCenter)
      // Update koordinat saat drag — throttled via moveend (fires after drag ends)
      // Removed mousemove handler: caused 60fps re-renders on desktop

      // Initial — set koordinat langsung saat peta siap
      setTimeout(() => updateCenter(), 100)
    })

    return () => {
      if (markerRafRef.current !== null) cancelAnimationFrame(markerRafRef.current)
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        canvasRendererRef.current = null
        territoryLayerRef.current = null
        territoryPolygonsRef.current.clear()
        userMarkerRef.current = null
        runTrackPolylineRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Invalidate size when map becomes visible ──────────────────────────────
  useEffect(() => {
    if (!isVisible || !mapRef.current) return
    // Delay slightly to let CSS visibility/display apply before measuring
    const t = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false })
    }, 60)
    return () => clearTimeout(t)
  }, [isVisible])
  // ─── Update territories ────────────────────────────────────────────────────
  const updateTerritories = useCallback(async (newTerritories: Territory[]) => {
    if (!mapRef.current || !territoryLayerRef.current) return
    const L = await getLeaflet()
    const layer = territoryLayerRef.current
    const existing = territoryPolygonsRef.current
    const newIds = new Set(newTerritories.map((t) => t.id))

    for (const [id, polygon] of existing) {
      if (!newIds.has(id)) { layer.removeLayer(polygon); existing.delete(id) }
    }

    for (const territory of newTerritories) {
      const geom = territory.geom
      if (!geom || geom.type !== 'Feature' || geom.geometry?.type !== 'Polygon') continue
      const coords = geom.geometry.coordinates[0] as Position[]
      const latLngs = coords.map(([lng, lat]) => L.latLng(lat as number, lng as number))
      const ex = existing.get(territory.id)
      if (ex) {
        ex.setLatLngs(latLngs)
        ex.setStyle({ color: territory.userColor, fillColor: territory.userColor, fillOpacity: 0.3, weight: 2, opacity: 0.9 })
      } else {
        const polygon = L.polygon(latLngs, {
          color: territory.userColor,
          fillColor: territory.userColor,
          fillOpacity: 0.3,
          weight: 2,
          opacity: 0.9,
          renderer: canvasRendererRef.current ?? undefined,
        })
        polygon.bindTooltip(
          `<div style="background:#fff;border:1px solid rgba(0,0,0,0.1);border-radius:8px;padding:6px 10px;color:#111;font-family:Inter,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.12)">
            <strong style="color:${territory.userColor}">${territory.username}</strong>
            <br/><span style="font-size:11px;color:#888">${territory.areaKm2.toFixed(4)} km²</span>
          </div>`,
          { sticky: true, className: 'tj-tooltip' }
        )
        layer.addLayer(polygon)
        existing.set(territory.id, polygon)
      }
    }
    setTerritoryCount(newTerritories.length)
  }, [])

  useEffect(() => { updateTerritories(territories) }, [territories, updateTerritories])

  // ─── Update user marker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    pendingMarkerPositionRef.current = userPosition ?? null
    if (markerRafRef.current !== null) cancelAnimationFrame(markerRafRef.current)

    markerRafRef.current = requestAnimationFrame(() => {
      markerRafRef.current = null
      getLeaflet().then((L) => {
        if (!mapRef.current) return
        const position = pendingMarkerPositionRef.current

        if (!position) {
          if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
          hasAutoFollowedRef.current = false
          return
        }

        const markerIcon = L.divIcon({
          className: '',
          html: `<div style="position:relative;width:20px;height:20px">
            <div style="position:absolute;inset:0;border-radius:50%;background:${userColor};opacity:0.25;animation:tj-pulse 2s ease-in-out infinite;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:${userColor};border:2.5px solid #fff;box-shadow:0 0 8px ${userColor};"></div>
          </div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        })

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([position.lat, position.lng])
          userMarkerRef.current.setIcon(markerIcon)
        } else {
          const marker = L.marker([position.lat, position.lng], { icon: markerIcon, zIndexOffset: 1000 }).addTo(mapRef.current)
          userMarkerRef.current = marker
          if (!hasAutoFollowedRef.current) {
            hasAutoFollowedRef.current = true
            mapRef.current.flyTo([position.lat, position.lng], 17, { duration: 1.2 })
          }
        }
      })
    })
  }, [userPosition, userColor])

  // ─── Update run track ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    getLeaflet().then((L) => {
      if (!mapRef.current) return
      if (!runTrack) {
        if (runTrackPolylineRef.current) { runTrackPolylineRef.current.remove(); runTrackPolylineRef.current = null }
        return
      }
      if (runTrack.type !== 'Feature' || runTrack.geometry?.type !== 'LineString') return
      const coordinates = runTrack.geometry.coordinates as Position[]
      const latLngs = coordinates.map(([lng, lat]) => L.latLng(lat as number, lng as number))
      if (runTrackPolylineRef.current) {
        runTrackPolylineRef.current.setLatLngs(latLngs)
        runTrackPolylineRef.current.setStyle({ color: userColor })
      } else {
        const polyline = L.polyline(latLngs, {
          color: userColor, weight: 4, opacity: 1,
          lineJoin: 'round', lineCap: 'round',
        }).addTo(mapRef.current)
        runTrackPolylineRef.current = polyline
      }
    })
  }, [runTrack, userColor])

  // ─── Controls ─────────────────────────────────────────────────────────────
  const handleZoomIn = () => mapRef.current?.zoomIn()
  const handleZoomOut = () => mapRef.current?.zoomOut()
  const handleLocate = () => {
    if (userPosition && mapRef.current) {
      mapRef.current.flyTo([userPosition.lat, userPosition.lng], 17, { duration: 0.8 })
    } else if (mapRef.current) {
      mapRef.current.locate({ setView: true, maxZoom: 17 })
    }
  }
  // Kompas: reset bearing ke utara (0°)
  const handleCompass = () => {
    if (mapRef.current) {
      // Leaflet standard map tidak support bearing rotation
      // Tapi kita bisa fly ke posisi saat ini dengan zoom yang sama untuk "reset"
      // Untuk bearing rotation perlu leaflet-rotate plugin
      // Sementara: fly ke lokasi user atau center dengan zoom reset
      const center = mapRef.current.getCenter()
      mapRef.current.flyTo(center, mapRef.current.getZoom(), { animate: true, duration: 0.5 })
    }
  }

  const ctrlBtn: React.CSSProperties = {
    width: 38, height: 38,
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#888',
    transition: 'all 0.15s',
    outline: 'none',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Pulse animation */}
      <style>{`
        @keyframes tj-pulse {
          0%, 100% { transform: scale(1); opacity: 0.25; }
          50% { transform: scale(2.5); opacity: 0; }
        }
        .leaflet-attribution-flag { display: none !important; }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.85) !important;
          color: #aaa !important;
          font-size: 9px !important;
          padding: 2px 6px !important;
          border-radius: 4px !important;
        }
        .leaflet-control-attribution a { color: #bbb !important; }
      `}</style>

      {/* Map container — position absolute fills parent */}
      <div
        ref={mapContainerRef}
        className={className}
        style={{ position: 'absolute', inset: 0 }}
        aria-label="Peta wilayah Territory Runner"
        role="application"
      />

      {/* ── Koordinat overlay — top left ── */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 500,
        display: 'flex', flexDirection: 'column', gap: 6,
        pointerEvents: 'none',
      }}>
        {/* Koordinat box — selalu tampil */}
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 10,
          padding: '6px 10px',
          minWidth: 148,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: '#C0392B', fontWeight: 700, letterSpacing: '0.1em' }}>LAT</span>
            <span style={{ fontSize: 11, color: '#111', fontFamily: 'monospace', fontWeight: 600 }}>
              {displayCoords.lat.toFixed(6)}°
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#C0392B', fontWeight: 700, letterSpacing: '0.1em' }}>LNG</span>
            <span style={{ fontSize: 11, color: '#111', fontFamily: 'monospace', fontWeight: 600 }}>
              {displayCoords.lng.toFixed(6)}°
            </span>
          </div>
        </div>

        {/* Territory count */}
        {territoryCount > 0 && (
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(192,57,43,0.2)',
            borderRadius: 10,
            padding: '4px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C0392B', boxShadow: '0 0 6px #C0392B' }} />
            <span style={{ fontSize: 10, color: '#555', fontWeight: 600 }}>
              {territoryCount} wilayah
            </span>
          </div>
        )}
      </div>

      {/* ── Zoom level — top right ── */}
      <div style={{
        position: 'absolute', top: 12, right: 12, zIndex: 500,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 10,
        padding: '4px 8px',
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}>
        <span style={{ fontSize: 10, color: '#aaa', fontWeight: 700, fontFamily: 'monospace' }}>Z{zoom}</span>
      </div>

      {/* ── Map controls — right center ── */}
      <div style={{
        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
        zIndex: 500, display: 'flex', flexDirection: 'column', gap: 6,
      }}>
        <button type="button" onClick={handleZoomIn} style={ctrlBtn} aria-label="Zoom in"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#111'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.2)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)' }}
        ><IconZoomIn size={17} /></button>

        <button type="button" onClick={handleZoomOut} style={ctrlBtn} aria-label="Zoom out"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#111'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.2)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,0,0,0.1)' }}
        ><IconZoomOut size={17} /></button>

        <div style={{ height: 1, background: 'rgba(0,0,0,0.08)', margin: '2px 0' }} />

        <button type="button" onClick={handleLocate}
          style={{ ...ctrlBtn, color: userPosition ? '#C0392B' : '#888', borderColor: userPosition ? 'rgba(192,57,43,0.3)' : 'rgba(0,0,0,0.1)' }}
          aria-label="Lokasi saya"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(192,57,43,0.5)' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = userPosition ? 'rgba(192,57,43,0.3)' : 'rgba(0,0,0,0.1)' }}
        ><IconCrosshair size={17} /></button>

        <button type="button" style={ctrlBtn} aria-label="Kompas — reset ke utara"
          onClick={handleCompass}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#111' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
        ><IconCompass size={17} /></button>
      </div>

      {/* ── Scale bar — bottom left ── */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 500,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 8,
        padding: '3px 8px',
        pointerEvents: 'none',
        display: 'flex', alignItems: 'center', gap: 6,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <div style={{ width: 36, height: 2, background: '#ccc', borderRadius: 1 }} />
        <span style={{ fontSize: 9, color: '#aaa', fontWeight: 600 }}>
          {zoom >= 16 ? '100m' : zoom >= 14 ? '500m' : zoom >= 12 ? '2km' : '10km'}
        </span>
      </div>

      {/* ── GPS position — bottom right ── */}
      {userPosition && (
        <div style={{
          position: 'absolute', bottom: 12, right: 12, zIndex: 500,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${userColor}40`,
          borderRadius: 10,
          padding: '5px 10px',
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: userColor, boxShadow: `0 0 6px ${userColor}` }} />
            <span style={{ fontSize: 9, color: '#888', fontWeight: 600, letterSpacing: '0.06em' }}>GPS AKTIF</span>
          </div>
          <span style={{ fontSize: 10, color: '#333', fontFamily: 'monospace', display: 'block' }}>
            {userPosition.lat.toFixed(6)}, {userPosition.lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  )
}

export default MapView
