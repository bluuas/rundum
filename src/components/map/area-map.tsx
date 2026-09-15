'use client'

import dynamic from 'next/dynamic'
import type { LatLng } from '@/lib/geo'
import { cn } from '@/lib/utils'

/**
 * Client-side wrapper for the Leaflet canvas.
 *
 * Leaflet touches `window` at import time, so the map must be loaded with
 * `ssr: false`. That option is only allowed inside a Client Component, which is
 * the entire reason this wrapper exists.
 */
const MapCanvas = dynamic(() => import('./map-canvas'), {
  ssr: false,
  loading: () => <div className="shimmer h-full w-full" />,
})

export function AreaMap({
  center,
  areaRadiusM,
  zoom,
  onCenterChange,
  interactive = true,
  className,
  showCrosshair = false,
}: {
  center: LatLng
  areaRadiusM: number
  zoom?: number
  onCenterChange?: (center: LatLng) => void
  interactive?: boolean
  className?: string
  showCrosshair?: boolean
}) {
  return (
    <div
      className={cn(
        'border-border bg-surface-muted rounded-card relative overflow-hidden border',
        className,
      )}
    >
      <MapCanvas
        center={center}
        zoom={zoom}
        areaRadiusM={areaRadiusM}
        onCenterChange={onCenterChange}
        interactive={interactive}
      />

      {/*
        The picker sets the location by panning the map under a fixed
        crosshair, rather than tapping a point. On a phone that is far more
        accurate than hitting a small target with a thumb.
      */}
      {showCrosshair ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center"
        >
          <div className="border-brand bg-brand/20 h-5 w-5 rounded-full border-2 shadow-sm" />
        </div>
      ) : null}
    </div>
  )
}
