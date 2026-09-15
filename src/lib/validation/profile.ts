import { z } from 'zod'

/**
 * Your own profile fields.
 *
 * Lives here rather than beside the Server Action because a `'use server'`
 * module may only export async functions — exporting a schema from one is a
 * runtime error that neither the type checker nor ESLint catches. The same
 * separation the other validation schemas already have.
 */
export const profileInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters')
    .max(50, 'Keep it under 50 characters'),
  bio: z
    .string()
    .trim()
    .max(300, 'Keep your bio under 300 characters')
    .optional()
    .transform((value) => (value ? value : null)),
})

export type ProfileInput = z.infer<typeof profileInputSchema>
