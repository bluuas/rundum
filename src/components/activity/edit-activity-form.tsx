'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { z } from 'zod'
import { updateActivity } from '@/app/(app)/activities/actions'
import { AreaMap } from '@/components/map/area-map'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import {
  RADIUS_OPTIONS_M,
  formatPace,
  formatRadius,
  parsePace,
  snapToGrid,
  type LatLng,
} from '@/lib/geo'
import { LEVELS, LEVEL_LABELS, SPORTS, getSport, type SportKey } from '@/lib/sports'
import { activityInputSchema, combineDateAndTime } from '@/lib/validation/activity'
import type { ActivityDetail } from '@/lib/queries/activity-detail'

const AREA_CIRCLE_RADIUS_M = 250

/**
 * Editing is a single page, not the five-step wizard used for creating.
 *
 * The wizard exists to stop a blank form from being intimidating. When you are
 * changing one field on something that already exists, stepping through five
 * screens to reach it is friction, not guidance.
 */
export function EditActivityForm({ activity }: { activity: ActivityDetail }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const starts = useMemo(() => new Date(activity.startsAt), [activity.startsAt])

  const [sportKey, setSportKey] = useState<SportKey>(activity.sportKey as SportKey)
  const [date, setDate] = useState(toDateInput(starts))
  const [time, setTime] = useState(toTimeInput(starts))
  const [center, setCenter] = useState<LatLng>({ lat: activity.lat, lng: activity.lng })
  const [locationLabel, setLocationLabel] = useState(activity.locationLabel)
  const [visibilityRadiusM, setVisibilityRadiusM] = useState(activity.visibilityRadiusM)
  const [title, setTitle] = useState(activity.title)
  const [description, setDescription] = useState(activity.description ?? '')
  const [distanceKm, setDistanceKm] = useState(
    activity.distanceM ? String(activity.distanceM / 1000) : '',
  )
  const [pace, setPace] = useState(
    activity.paceSecondsPerKm
      ? (formatPace(activity.paceSecondsPerKm) ?? '').replace(' /km', '')
      : '',
  )
  const [level, setLevel] = useState<string>(activity.level ?? '')
  const [maxParticipants, setMaxParticipants] = useState(String(activity.maxParticipants))

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const sport = getSport(sportKey)
  const snapped = useMemo(() => snapToGrid(center), [center])

  function buildInput() {
    return {
      sportKey,
      title: title.trim(),
      description: description.trim() || undefined,
      startsAt: date && time ? combineDateAndTime(date, time) : new Date(Number.NaN),
      lat: snapped.lat,
      lng: snapped.lng,
      locationLabel: locationLabel.trim(),
      visibilityRadiusM,
      // Changing to a sport without distance or pace must clear them, or the
      // schema rejects values the form no longer shows.
      distanceM:
        sport.supportsDistance && distanceKm
          ? Math.round(Number(distanceKm) * 1000)
          : null,
      paceSecondsPerKm: sport.supportsPace && pace ? parsePace(pace) : null,
      level: level ? level : null,
      maxParticipants: Number(maxParticipants),
    }
  }

  function submit() {
    setFormError(null)
    setFieldErrors({})

    const parsed = activityInputSchema.safeParse(buildInput())
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as Record<string, string[]>)
      setFormError('Please check the highlighted fields')
      return
    }

    startTransition(async () => {
      const result = await updateActivity(activity.id, buildInput())
      if (!result.ok) {
        setFormError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      router.push(`/activities/${activity.id}`)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      <Field label="Sport" htmlFor="sport">
        <SelectInput
          id="sport"
          value={sportKey}
          onChange={(event) => setSportKey(event.target.value as SportKey)}
        >
          {SPORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label="Title" htmlFor="title" error={fieldErrors.title?.[0]}>
        <TextInput
          id="title"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        optional
        error={fieldErrors.description?.[0]}
      >
        <TextArea
          id="description"
          value={description}
          maxLength={1000}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" htmlFor="date" error={fieldErrors.startsAt?.[0]}>
          <TextInput
            id="date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Start time" htmlFor="time">
          <TextInput
            id="time"
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-fg text-sm font-medium">Meeting area</p>
        <p className="text-fg-muted text-xs">
          Drag the map to move it. Rundum stores a rough area, never an exact address.
        </p>
        <AreaMap
          center={center}
          areaRadiusM={AREA_CIRCLE_RADIUS_M}
          onCenterChange={setCenter}
          showCrosshair
          className="h-56"
        />
      </div>

      <Field
        label="Name this area"
        htmlFor="locationLabel"
        error={fieldErrors.locationLabel?.[0]}
      >
        <TextInput
          id="locationLabel"
          value={locationLabel}
          maxLength={80}
          onChange={(event) => setLocationLabel(event.target.value)}
        />
      </Field>

      <Field label="Who can discover this" htmlFor="radius">
        <SelectInput
          id="radius"
          value={String(visibilityRadiusM)}
          onChange={(event) => setVisibilityRadiusM(Number(event.target.value))}
        >
          {RADIUS_OPTIONS_M.map((meters) => (
            <option key={meters} value={meters}>
              Within {formatRadius(meters)}
            </option>
          ))}
        </SelectInput>
      </Field>

      {sport.supportsDistance ? (
        <Field
          label="Distance"
          htmlFor="distance"
          optional
          error={fieldErrors.distanceM?.[0]}
        >
          <div className="flex items-center gap-2">
            <TextInput
              id="distance"
              type="number"
              inputMode="decimal"
              min="0.1"
              step="0.1"
              value={distanceKm}
              onChange={(event) => setDistanceKm(event.target.value)}
            />
            <span className="text-fg-muted text-sm">km</span>
          </div>
        </Field>
      ) : null}

      {sport.supportsPace ? (
        <Field
          label="Pace"
          htmlFor="pace"
          optional
          hint="Minutes per kilometre, like 5:30."
          error={fieldErrors.paceSecondsPerKm?.[0]}
        >
          <TextInput
            id="pace"
            value={pace}
            onChange={(event) => setPace(event.target.value)}
          />
        </Field>
      ) : null}

      <Field label="Level" htmlFor="level" optional>
        <SelectInput
          id="level"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
        >
          <option value="">Not specified</option>
          {LEVELS.map((option) => (
            <option key={option} value={option}>
              {LEVEL_LABELS[option]}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field
        label="Maximum participants"
        htmlFor="max"
        hint={
          activity.participantCount > 0
            ? `${activity.participantCount} ${activity.participantCount === 1 ? 'person has' : 'people have'} already joined.`
            : undefined
        }
        error={fieldErrors.maxParticipants?.[0]}
      >
        <TextInput
          id="max"
          type="number"
          inputMode="numeric"
          min="1"
          max="100"
          value={maxParticipants}
          onChange={(event) => setMaxParticipants(event.target.value)}
        />
      </Field>

      {formError ? (
        <p role="alert" className="text-danger text-sm">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(`/activities/${activity.id}`)}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button fullWidth size="lg" onClick={submit} disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}

/** Local date, not UTC: toISOString() would shift the day either side of midnight. */
function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function toTimeInput(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
