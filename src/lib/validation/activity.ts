import { z } from 'zod'
import { LEVELS, SPORT_KEYS, getSport } from '@/lib/sports'
import { instantAt } from '@/lib/time'

/**
 * The single source of truth for activity input.
 *
 * Imported by both the create form and the Server Action, so client-side
 * validation and server-side validation cannot drift apart. The Server Action
 * always re-parses: a Server Action is a public POST endpoint, and the client
 * form is not a security boundary.
 */

/** How far ahead an activity may be scheduled. A year is plenty and blocks junk. */
const MAX_DAYS_AHEAD = 365

export const activityInputSchema = z
  .object({
    sportKey: z.enum(SPORT_KEYS),

    title: z
      .string()
      .trim()
      .min(3, 'Give your activity a title of at least 3 characters')
      .max(80, 'Keep the title under 80 characters'),

    description: z
      .string()
      .trim()
      .max(1000, 'Keep the description under 1000 characters')
      .optional()
      .transform((value) => (value ? value : null)),

    /** Local date and time, combined into startsAt by the caller. */
    startsAt: z.coerce
      .date()
      .refine((date) => date.getTime() > Date.now(), {
        message: 'Pick a time in the future',
      })
      .refine((date) => date.getTime() < Date.now() + MAX_DAYS_AHEAD * 86_400_000, {
        message: 'Pick a date within the next year',
      }),

    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),

    locationLabel: z
      .string()
      .trim()
      .min(2, 'Name the meeting area, for example "Hauptplatz Schwyz"')
      .max(80),

    visibilityRadiusM: z
      .number()
      .int()
      .min(1_000, 'Visibility must be at least 1 km')
      .max(200_000),

    /** Route length in metres. Only meaningful for distance-based sports. */
    distanceM: z
      .number()
      .int()
      .min(100)
      .max(1_000_000)
      .nullable()
      .optional()
      .transform((value) => value ?? null),

    paceSecondsPerKm: z
      .number()
      .int()
      .min(60)
      .max(3_600)
      .nullable()
      .optional()
      .transform((value) => value ?? null),

    level: z
      .enum(LEVELS)
      .nullable()
      .optional()
      .transform((value) => value ?? null),

    // null means no limit. Kept as null rather than a sentinel so it can never
    // be mistaken for a count.
    maxParticipants: z
      .number()
      .int()
      .min(1, 'Allow at least one participant')
      .max(100, 'Pick a number up to 100, or choose no limit')
      .nullable(),
  })
  // Distance and pace are meaningless for yoga or padel. Rejecting them here
  // rather than silently dropping them keeps bad client state visible.
  .refine(
    (input) => input.distanceM === null || getSport(input.sportKey).supportsDistance,
    {
      message: 'This sport does not take a distance',
      path: ['distanceM'],
    },
  )
  .refine(
    (input) => input.paceSecondsPerKm === null || getSport(input.sportKey).supportsPace,
    { message: 'This sport does not take a pace', path: ['paceSecondsPerKm'] },
  )

export type ActivityInput = z.infer<typeof activityInputSchema>

/**
 * Combines the form's separate date and time fields into one instant.
 *
 * The numbers are read as the city's clock, not the browser's. `new
 * Date('2026-07-15T18:30')` parses as local time, so an organizer setting up a
 * run while travelling would have stored 18:30 in wherever they happened to
 * be — and it would have looked right to them and wrong to everyone in Schwyz.
 */
export function combineDateAndTime(date: string, time: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return new Date(Number.NaN)
  }

  return instantAt(year, month, day, hour, minute)
}
