import { z } from 'zod'

/**
 * The optional note attached to a join request.
 *
 * Trimmed to null when empty so an accidental whitespace-only message is not
 * stored as one — the database treats null as "no message" and renders nothing.
 */
export const joinMessageSchema = z
  .string()
  .trim()
  .max(300, 'Keep your message under 300 characters')
  .optional()
  .transform((value) => (value ? value : null))

export type JoinMessage = z.infer<typeof joinMessageSchema>
