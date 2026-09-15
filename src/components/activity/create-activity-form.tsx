'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { createActivity } from '@/app/[locale]/(app)/activities/actions'
import { AreaMap } from '@/components/map/area-map'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import { ParticipantLimitField } from '@/components/activity/participant-limit-field'
import { WhenFields } from '@/components/activity/when-fields'
import {
  DEFAULT_CITY_CENTER,
  DEFAULT_RADIUS_M,
  RADIUS_OPTIONS_M,
  formatRadius,
  parsePace,
  snapToGrid,
  type LatLng,
} from '@/lib/geo'
import { LEVELS, SPORTS, getSport, type Level, type SportKey } from '@/lib/sports'
import { activityInputSchema, combineDateAndTime } from '@/lib/validation/activity'
import { formatStartFull, toDateInputValue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fill } from '@/lib/i18n'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'
import { z } from 'zod'

/** The circle drawn for a meeting area. Matches the 250 m storage grid. */
const AREA_CIRCLE_RADIUS_M = 250

const STEPS = ['Sport', 'When', 'Where', 'Details', 'Review'] as const
type Step = (typeof STEPS)[number]

export function CreateActivityForm({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState(0)
  const [sportKey, setSportKey] = useState<SportKey | null>(null)
  // Prefilled with today: most activities are planned for the next day or
  // two, so an empty date field is one tap of pure friction.
  const [date, setDate] = useState(() => toDateInputValue(new Date()))
  const [time, setTime] = useState('')
  const [center, setCenter] = useState<LatLng>(DEFAULT_CITY_CENTER)
  const [locationLabel, setLocationLabel] = useState('')
  const [visibilityRadiusM, setVisibilityRadiusM] = useState(DEFAULT_RADIUS_M)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [pace, setPace] = useState('')
  const [level, setLevel] = useState('')
  const [maxParticipants, setMaxParticipants] = useState<number | null>(10)

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
      maxParticipants,
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
        return (
          title.trim().length >= 3 && (maxParticipants === null || maxParticipants >= 1)
        )
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
      setFormError(t.create.checkFields)
      return
    }

    startTransition(async () => {
      const result = await createActivity(buildInput())
      if (!result.ok) {
        setFormError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      // Through localeHref: an unprefixed path makes proxy.ts answer the
      // client-side navigation with a 307, and a redirect in the middle of an
      // RSC fetch cannot be parsed — the browser falls back to a full page
      // load, having logged an error. It also loses the language you were
      // reading in, since the proxy picks from the cookie instead.
      router.push(localeHref(locale, `/activities/${result.data.id}`))
    })
  }

  if (!signedIn) {
    return (
      <div className="border-border bg-surface rounded-card border p-6 text-center">
        <p className="text-fg font-semibold">{t.create.signInTitle}</p>
        <p className="text-fg-muted mt-2 text-sm">{t.create.signInBody}</p>
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
            {t.create.sportHeading}
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
                {t.sports[option.key]}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      {currentStep === 'When' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">{t.create.whenHeading}</h2>
          <WhenFields
            date={date}
            time={time}
            onDateChange={setDate}
            onTimeChange={setTime}
            dateError={fieldErrors.startsAt?.[0]}
          />
        </div>
      ) : null}

      {currentStep === 'Where' ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-fg text-base font-semibold">{t.create.whereHeading}</h2>
            <p className="text-fg-muted mt-1 text-sm">{t.create.whereBody}</p>
          </div>

          <AreaMap
            center={center}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            onCenterChange={setCenter}
            showCrosshair
            className="h-64"
          />

          <Field
            label={t.create.fieldLocationLabel}
            htmlFor="locationLabel"
            hint={t.create.locationHint}
            error={fieldErrors.locationLabel?.[0]}
          >
            <TextInput
              id="locationLabel"
              value={locationLabel}
              maxLength={80}
              placeholder={t.create.locationPlaceholder}
              onChange={(event) => setLocationLabel(event.target.value)}
            />
          </Field>

          <Field
            label={t.create.fieldVisibility}
            htmlFor="radius"
            hint={t.create.visibilityHint}
          >
            <SelectInput
              id="radius"
              value={String(visibilityRadiusM)}
              onChange={(event) => setVisibilityRadiusM(Number(event.target.value))}
            >
              {RADIUS_OPTIONS_M.map((meters) => (
                <option key={meters} value={meters}>
                  {fill(t.create.withinOption, { radius: formatRadius(meters) })}
                </option>
              ))}
            </SelectInput>
          </Field>
        </div>
      ) : null}

      {currentStep === 'Details' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">{t.create.detailsHeading}</h2>

          <Field
            label={t.create.fieldTitle}
            htmlFor="title"
            error={fieldErrors.title?.[0]}
          >
            <TextInput
              id="title"
              value={title}
              maxLength={80}
              placeholder={t.create.titlePlaceholder}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>

          <Field
            label={t.create.fieldDescription}
            htmlFor="description"
            optional
            hint={t.create.descriptionHint}
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
              label={t.create.fieldDistance}
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
              label={t.create.fieldPace}
              htmlFor="pace"
              optional
              hint={t.create.paceHint}
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

          <Field label={t.create.fieldLevel} htmlFor="level" optional>
            <SelectInput
              id="level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              <option value="">{t.create.levelUnspecified}</option>
              {LEVELS.map((option) => (
                <option key={option} value={option}>
                  {t.levels[option]}
                </option>
              ))}
            </SelectInput>
          </Field>

          <ParticipantLimitField
            value={maxParticipants}
            onChange={setMaxParticipants}
            error={fieldErrors.maxParticipants?.[0]}
          />
        </div>
      ) : null}

      {currentStep === 'Review' ? (
        <div className="space-y-4">
          <h2 className="text-fg text-base font-semibold">{t.create.reviewHeading}</h2>

          <AreaMap
            center={snapped}
            areaRadiusM={AREA_CIRCLE_RADIUS_M}
            interactive={false}
            className="h-40"
          />

          <dl className="border-border bg-surface rounded-card divide-border divide-y border text-sm">
            <Row
              label={t.create.reviewSport}
              value={sportKey ? t.sports[sportKey] : '—'}
            />
            <Row label={t.create.reviewTitle} value={title} />
            <Row
              label={t.create.reviewWhen}
              value={
                date && time
                  ? formatStartFull(combineDateAndTime(date, time), locale)
                  : '—'
              }
            />
            <Row
              label={t.create.reviewWhere}
              value={fill(t.create.reviewWhereValue, { label: locationLabel })}
            />
            <Row
              label={t.create.reviewDiscoverable}
              value={fill(t.create.withinOption, {
                radius: formatRadius(visibilityRadiusM),
              })}
            />
            {sport?.supportsDistance && distanceKm ? (
              <Row label={t.create.reviewDistance} value={`${distanceKm} km`} />
            ) : null}
            {sport?.supportsPace && pace ? (
              <Row label={t.create.reviewPace} value={`${pace} /km`} />
            ) : null}
            {level ? (
              <Row label={t.create.reviewLevel} value={t.levels[level as Level]} />
            ) : null}
            <Row
              label={t.create.reviewMax}
              value={
                maxParticipants === null
                  ? t.create.reviewNoLimit
                  : String(maxParticipants)
              }
            />
          </dl>

          {formError ? (
            <p role="alert" className="text-danger text-sm">
              {formError}
            </p>
          ) : null}

          <Button fullWidth size="lg" onClick={submit} disabled={pending}>
            {pending ? t.create.publishing : t.create.publish}
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
            {t.common.back}
          </Button>
        ) : null}

        {step < STEPS.length - 1 ? (
          <Button
            fullWidth
            onClick={() => setStep((s) => s + 1)}
            disabled={!canAdvance(currentStep)}
          >
            {t.common.continue}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function Progress({ step }: { step: number }) {
  const { t } = useI18n()
  const labels = [
    t.create.steps.sport,
    t.create.steps.when,
    t.create.steps.where,
    t.create.steps.details,
    t.create.steps.review,
  ]

  return (
    <ol className="flex items-center gap-1.5" aria-label={t.create.progress}>
      {STEPS.map((key, index) => (
        <li key={key} className="flex-1">
          <span className="sr-only">
            {labels[index]}
            {index === step ? ` (${t.create.current})` : ''}
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
