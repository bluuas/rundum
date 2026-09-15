'use client'

import 'leaflet/dist/leaflet.css'
import { Circle, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useEffect } from 'react'
import type { LatLng } from '@/lib/geo'

/**
 * Leaflet map primitives.
 *
 * Rundum draws a translucent circle for a meeting area and never a marker pin.
 * A pin reads as "the person is here"; a circle reads as "somewhere around
 * here", which is the only thing the data actually supports. It also sidesteps
 * Leaflet's bundled marker-icon paths entirely.
 *
 * OpenStreetMap raster tiles: no API key, no account, no per-load billing.
 */

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

export type MapCanvasProps = {
  center: LatLng
  zoom?: number
  /** Radius of the translucent area circle, in metres. */
  areaRadiusM: number
  /** Called with the new map centre after the user stops panning. */
  onCenterChange?: (center: LatLng) => void
  interactive?: boolean
  className?: string
}

export default function MapCanvas({
  center,
  zoom = 13,
  areaRadiusM,
  onCenterChange,
  interactive = true,
  className,
}: MapCanvasProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      attributionControl
      className={className}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

      <Circle
        center={[center.lat, center.lng]}
        radius={areaRadiusM}
        pathOptions={{
          color: '#0f766e',
          weight: 2,
          fillColor: '#0f766e',
          fillOpacity: 0.12,
        }}
      />

      {onCenterChange ? <CenterReporter onCenterChange={onCenterChange} /> : null}
      <RecenterOnChange center={center} interactive={interactive} />
    </MapContainer>
  )
}

/** Reports the map centre once panning settles, not on every frame. */
function CenterReporter({
  onCenterChange,
}: {
  onCenterChange: (center: LatLng) => void
}) {
  useMapEvents({
    moveend(event) {
      const { lat, lng } = event.target.getCenter()
      onCenterChange({ lat, lng })
    },
  })
  return null
}

/**
 * Follows external centre changes (for example "use my location"), but only
 * when the map is not interactive or the jump is large — otherwise it would
 * fight the user's own panning.
 */
function RecenterOnChange({
  center,
  interactive,
}: {
  center: LatLng
  interactive: boolean
}) {
  const map = useMap()

  useEffect(() => {
    const current = map.getCenter()
    const moved = Math.abs(current.lat - center.lat) + Math.abs(current.lng - center.lng)
    if (!interactive || moved > 0.01) {
      map.setView([center.lat, center.lng], map.getZoom())
    }
  }, [center, interactive, map])

  return null
}
