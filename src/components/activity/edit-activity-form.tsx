'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { z } from 'zod'
import { updateActivity } from '@/app/[locale]/(app)/activities/actions'
import { AreaMap } from '@/components/map/area-map'
import { Button } from '@/components/ui/button'
import { Field, SelectInput, TextArea, TextInput } from '@/components/ui/field'
import { ParticipantLimitField } from '@/components/activity/participant-limit-field'
import { WhenFields } from '@/components/activity/when-fields'
import {
  RADIUS_OPTIONS_M,
  formatPace,
  formatRadius,
  parsePace,
  snapToGrid,
  type LatLng,
} from '@/lib/geo'
import { LEVELS, SPORTS, getSport, type SportKey } from '@/lib/sports'
import { activityInputSchema, combineDateAndTime } from '@/lib/validation/activity'
import { toDateInputValue, toTimeInputValue } from '@/lib/format'
import type { ActivityDetail } from '@/lib/queries/activity-detail'
import { fill, plural } from '@/lib/i18n'
import { localeHref } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/provider'

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
  const { locale, t } = useI18n()
  const [pending, startTransition] = useTransition()

  const starts = useMemo(() => new Date(activity.startsAt), [activity.startsAt])

  const [sportKey, setSportKey] = useState<SportKey>(activity.sportKey as SportKey)
  const [date, setDate] = useState(toDateInputValue(starts))
  const [time, setTime] = useState(toTimeInputValue(starts))
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
  const [maxParticipants, setMaxParticipants] = useState<number | null>(
    activity.maxParticipants,
  )

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
      maxParticipants,
    }
  }

  function submit() {
    setFormError(null)
    setFieldErrors({})

    const parsed = activityInputSchema.safeParse(buildInput())
    if (!parsed.success) {
      setFieldErrors(z.flattenError(parsed.error).fieldErrors as Record<string, string[]>)
      setFormError(t.create.checkFields)
      return
    }

    startTransition(async () => {
      const result = await updateActivity(activity.id, buildInput())
      if (!result.ok) {
        // Failures with a code are phrased here, in the reader's language;
        // result.error is the English fallback for everything else.
        setFormError(
          result.code === 'belowApprovedCount'
            ? fill(t.edit.belowApprovedCount, { count: activity.participantCount })
            : result.error,
        )
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      // push() alone is enough: updateActivity already called revalidatePath,
      // so the destination renders with fresh data. An extra refresh() here
      // fetched the same route a second time and aborted the first stream,
      // which is what logged "The destination stream closed early".
      router.push(localeHref(locale, `/activities/${activity.id}`))
    })
  }

  return (
    <div className="space-y-5">
      <Field label={t.create.steps.sport} htmlFor="sport">
        <SelectInput
          id="sport"
          value={sportKey}
          onChange={(event) => setSportKey(event.target.value as SportKey)}
        >
          {SPORTS.map((option) => (
            <option key={option.key} value={option.key}>
              {t.sports[option.key]}
            </option>
          ))}
        </SelectInput>
      </Field>

      <Field label={t.create.fieldTitle} htmlFor="title" error={fieldErrors.title?.[0]}>
        <TextInput
          id="title"
          value={title}
          maxLength={80}
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Field
        label={t.create.fieldDescription}
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

      <WhenFields
        date={date}
        time={time}
        onDateChange={setDate}
        onTimeChange={setTime}
        dateError={fieldErrors.startsAt?.[0]}
        layout="side-by-side"
      />

      <div className="space-y-2">
        <p className="text-fg text-sm font-medium">{t.create.whereHeading}</p>
        <p className="text-fg-muted text-xs">{t.create.whereBody}</p>
        <AreaMap
          center={center}
          areaRadiusM={AREA_CIRCLE_RADIUS_M}
          onCenterChange={setCenter}
          showCrosshair
          className="h-56"
        />
      </div>

      <Field
        label={t.create.fieldLocationLabel}
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

      <Field label={t.create.fieldVisibility} htmlFor="radius">
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

      {sport.supportsDistance ? (
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

      {sport.supportsPace ? (
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
        // Already-approved participants are never dropped to fit a smaller
        // limit, so the limit cannot go below them.
        minimum={Math.max(activity.participantCount, 1)}
        hint={
          activity.participantCount > 0
            ? plural(activity.participantCount, {
                one: t.create.alreadyJoinedOne,
                other: t.create.alreadyJoinedOther,
              })
            : undefined
        }
        error={fieldErrors.maxParticipants?.[0]}
      />

      {formError ? (
        <p role="alert" className="text-danger text-sm">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => router.push(localeHref(locale, `/activities/${activity.id}`))}
          disabled={pending}
        >
          {t.common.cancel}
        </Button>
        <Button fullWidth size="lg" onClick={submit} disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </div>
  )
}
