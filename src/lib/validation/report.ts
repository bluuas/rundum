import { z } from 'zod'

/**
 * Why someone is reporting something.
 *
 * Stored as a stable key, never as translated text: a moderator grouping
 * reports wants categories that do not vary with the reporter's language, and
 * the UI can reword a label without invalidating the history.
 */
export const REPORT_REASONS = [
  'spam',
  'harassment',
  'unsafe',
  'misleading',
  'other',
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]

export const REPORT_TARGETS = ['activity', 'comment', 'user'] as const
export type ReportTarget = (typeof REPORT_TARGETS)[number]

export const reportInputSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z
    .string()
    .trim()
    .max(1000, 'Keep it under 1000 characters')
    .optional()
    .transform((value) => (value ? value : null)),
})

export type ReportInput = z.infer<typeof reportInputSchema>
