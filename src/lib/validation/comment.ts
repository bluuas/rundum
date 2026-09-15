import { z } from 'zod'

export const commentInputSchema = z.object({
  activityId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, 'Write something first')
    .max(1000, 'Keep comments under 1000 characters'),
})

export type CommentInput = z.infer<typeof commentInputSchema>
