'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { createActivity } from '@/app/(app)/activities/actions'
import { AreaMap } from '@/components/map/area-map'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import {
  DEFAULT_CITY_CENTER,
  DEFAULT_RADIUS_M,
  RADIUS_OPTIONS_M,
  formatRadius,
  parsePace,
  snapToGrid,
  type LatLng,
} from '@/lib/geo'
import { LEVELS, LEVEL_LABELS, SPORTS, getSport, type SportKey } from '@/lib/sports'
import { activityInputSchema, combineDateAndTime } from '@/lib/validation/activity'
import { cn } from '@/lib/utils'
import { z } from 'zod'

/** The circle drawn for a meeting area. Matches the 250 m storage grid. */
const AREA_CIRCLE_RADIUS_M = 250

const STEPS = ['Sport', 'When', 'Where', 'Details', 'Review'] as const
type Step = (typeof STEPS)[number]

export function CreateActivityForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState(0)
  const [sportKey, setSportKey] = useState<SportKey | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [center, setCenter] = useState<LatLng>(DEFAULT_CITY_CENTER)
  const [locationLabel, setLocationLabel] = useState('')
  const [visibilityRadiusM, setVisibilityRadiusM] = useState(DEFAULT_RADIUS_M)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [pace, setPace] = useState('')
  const [level, setLevel] = useState('')
  const [maxParticipants, setMaxParticipants] = useState('10')

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const sport = sportKey ? getSport(sportKey) : null

  // The stored point, not the raw map centre — so the review step shows exactly
  // what will be saved.
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
      distanceM:
        sport?.supportsDistance && distanceKm
          ? Math.round(Number(distanceKm) * 1000)
          : null,
      paceSecondsPerKm: sport?.supportsPace && pace ? parsePace(pace) : null,
      level: level ? level : null,
      maxParticipants: Number(maxParticipants),
    }
  }

  function canAdvance(current: Step): boolean {
    switch (current) {
      case 'Sport':
        return sportKey !== null
      case 'When':
        return Boolean(date && time) && combineDateAndTime(date, time) > new Date()
      case 'Where':
        return locationLabel.trim().length >= 2
      case 'Details':
        return title.trim().length >= 3 && Number(maxParticipants) >= 1
      default:
        return true
    }
  }

  function submit() {
    setFormError(null)
    setFieldErrors({})

    // Parse client-side first for instant feedback. The Server Action parses
    // the same schema again; this is convenience, not a security boundary.
    const parsed = activityInputSchema.safeParse(buildInput())
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error)
      setFieldErrors(flat.fieldErrors as Record<string, string[]>)
      setFormError('Please check the highlighted fields')
      return
    }

    startTransition(async () => {
      const result = await createActivity(buildInput())
      if (!result.ok) {
        setFormError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      router.push(`/activities/${result.data.id}`)
    })
  }

  if (!signedIn) {
    return (
      <div className="border-border bg-surface rounded-card border p-6 text-center">
        <p className="text-fg font-semibold">Sign in to create an activity</p>
        <p className="text-fg-muted mt-2 text-sm">
          Use the account switcher in the header while Strava sign-in is still being
          built.
        </p>
      </div>
    )
  }

  const currentStep = STEPS[step]

  return (
    <div className="space-y-5">
      <Progress step={step} />

      {currentStep === 'Sport' ? (
        <fieldset className="space-y-3">
          <legend className="text-fg text-base font-semibold">
            What are you planning?
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {SPORTS.map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={sportKey === option.key}
                onClick={() => {
                  setSportKey(option.key)
                  setStep(1)
                }}
                className={cn(
                  'rounded-card flex min-h-14 items-center gap-2 border px-3 text-left text-sm font-medium transition-colors',
                  sportKey === option.key
                    ? 'border-brand bg-brand-soft text-brand-soft-fg'
                    : 'border-border-strong text-fg hover:bg-surface-muted',
                )}
              >
                <span aria-hidden className="text-lg">
                  {option.icon}
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {currentStep === 'When' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">When is it?</h2>
          <Field label="Date" htmlFor="date" error={fieldErrors.startsAt?.[0]}>
            <TextInput
              id="date"
              type="date"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
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
          {date && time && combineDateAndTime(date, time) <= new Date() ? (
            <p role="alert" className="text-danger text-xs">
              That time has already passed. Pick a time in the future.
            </p>
          ) : null}
        </div>
      ) : null}

      {currentStep === 'Where' ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-fg text-base font-semibold">Where do you meet?</h2>
            <p className="text-fg-muted mt-1 text-sm">
              Drag the map to set an approximate meeting area. Rundum stores a rough area,
              never an exact address.
            </p>
          </div>

          <AreaMap
            center={center}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            onCenterChange={setCenter}
            showCrosshair
            className="h-64"
          />

          <Field
            label="Name this area"
            htmlFor="locationLabel"
            hint='Something people will recognise, like "Hauptplatz Schwyz".'
            error={fieldErrors.locationLabel?.[0]}
          >
            <TextInput
              id="locationLabel"
              value={locationLabel}
              maxLength={80}
              placeholder="Hauptplatz Schwyz"
              onChange={(event) => setLocationLabel(event.target.value)}
            />
          </Field>

          <Field
            label="Who can discover this"
            htmlFor="radius"
            hint="People searching from further away than this will not see it."
          >
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
        </div>
      ) : null}

      {currentStep === 'Details' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">Tell people about it</h2>

          <Field label="Title" htmlFor="title" error={fieldErrors.title?.[0]}>
            <TextInput
              id="title"
              value={title}
              maxLength={80}
              placeholder="Easy morning loop around Ibach"
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            optional
            hint="Pace, route, what to bring, where exactly to meet."
            error={fieldErrors.description?.[0]}
          >
            <TextArea
              id="description"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          {/* Distance and pace only exist for sports that have them. */}
          {sport?.supportsDistance ? (
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

          {sport?.supportsPace ? (
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
                placeholder="5:30"
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
        </div>
      ) : null}

      {currentStep === 'Review' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">Ready to publish?</h2>

          <AreaMap
            center={snapped}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            interactive={false}
            className="h-40"
          />

          <dl className="border-border bg-surface rounded-card divide-border divide-y border text-sm">
            <Row label="Sport" value={sport?.label ?? '—'} />
            <Row label="Title" value={title} />
            <Row
              label="When"
              value={
                date && time
                  ? combineDateAndTime(date, time).toLocaleString('en-CH', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '—'
              }
            />
            <Row label="Where" value={`${locationLabel} (approximate area)`} />
            <Row
              label="Discoverable"
              value={`Within ${formatRadius(visibilityRadiusM)}`}
            />
            {sport?.supportsDistance && distanceKm ? (
              <Row label="Distance" value={`${distanceKm} km`} />
            ) : null}
            {sport?.supportsPace && pace ? (
              <Row label="Pace" value={`${pace} /km`} />
            ) : null}
            {level ? <Row label="Level" value={LEVEL_LABELS[level as never]} /> : null}
            <Row label="Max participants" value={maxParticipants} />
          </dl>

          {formError ? (
            <p role="alert" className="text-danger text-sm">
              {formError}
            </p>
          ) : null}

          <Button fullWidth size="lg" onClick={submit} disabled={pending}>
            {pending ? 'Publishing…' : 'Publish activity'}
          </Button>
        </div>
      ) : null}

      <div className="flex gap-2">
        {step > 0 ? (
          <Button
            variant="secondary"
            onClick={() => setStep((s) => s - 1)}
            disabled={pending}
          >
            Back
          </Button>
        ) : null}

        {step < STEPS.length - 1 ? (
          <Button
            fullWidth
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance(currentStep)}
          >
            Continue
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function Progress({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((label, index) => (
        <li key={label} className="flex-1">
          <span className="sr-only">
            {label}
            {index === step ? ' (current)' : ''}
          </span>
          <div
            className={cn(
              'h-1 rounded-full transition-colors',
              index <= step ? 'bg-brand' : 'bg-border',
            )}
          />
        </li>
      ))}
    </ol>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5">
      <dt className="text-fg-muted shrink-0">{label}</dt>
      <dd className="text-fg text-right font-medium">{value}</dd>
    </div>
  )
}
