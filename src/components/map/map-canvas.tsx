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
        /*
          Styled through a class rather than a colour literal, so the circle
          follows the brand token — including when the viewer switches to dark
          mode with the map already on screen. Leaflet writes colours as SVG
          presentation attributes, which the stylesheet overrides.
        */
        pathOptions={{ className: 'area-circle', weight: 2, fillOpacity: 0.12 }}
      />

      {onCenterChange ? <CenterReporter onCenterChange={onCenterChange} /> : null}
      <RecenterOnChange center={center} interactive={interactive} />
      <InvalidateSizeOnResize />
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

/**
 * Keeps Leaflet's idea of the container size in step with reality.
 *
 * Leaflet measures its container once, when the map initialises, and caches the
 * result. If the container has not reached its final size at that moment — the
 * map mounts inside a step that was just revealed, a webfont lands, the dynamic
 * import's placeholder is swapped out — the map computes the wrong viewport and
 * requests too few tiles. The symptom is a map that looks blank or half-drawn
 * until you zoom, because zooming is one of the few things that forces Leaflet
 * to re-measure.
 *
 * invalidateSize() is that re-measure. It runs once after the first paint, and
 * then whenever the container actually changes size — which also covers the
 * on-screen keyboard opening and closing on a phone.
 */
function InvalidateSizeOnResize() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()

    // After paint rather than immediately: on mount the element may still be
    // mid-layout, and re-measuring then would cache the same wrong size again.
    const frame = requestAnimationFrame(() => map.invalidateSize())

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [map])

  return null
}
