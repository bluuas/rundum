import { z } from 'zod'

/**
 * The one field on the sign-in form.
 *
 * Shared by the form and the Server Action, like every other schema here, so
 * the two cannot disagree about what an address is.
 *
 * Lowercased and trimmed before it goes anywhere: Supabase treats addresses
 * case-insensitively, but a link requested as `Anna@example.ch` and one
 * requested as `anna@example.ch` should also be the same entry in any counter
 * or log that ever reads this.
 */
export const emailSignInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Enter your email address')
    .max(254, 'That address is too long')
    .pipe(z.email('That does not look like an email address')),
})

export type EmailSignIn = z.infer<typeof emailSignInSchema>
