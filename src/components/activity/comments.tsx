'use client'

import { useRouter } from 'next/navigation'
import { useOptimistic, useRef, useState, useTransition } from 'react'
import { addComment, deleteComment } from '@/app/(app)/activities/actions'
import { StravaConnectedBadge } from '@/components/activity/badges'
import { Button } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { formatRelative } from '@/lib/format'
import type { CommentWithAuthor } from '@/lib/queries/activity-detail'

export function Comments({
  activityId,
  comments,
  currentUserId,
  activityOwnerId,
}: {
  activityId: string
  comments: CommentWithAuthor[]
  currentUserId: string | null
  activityOwnerId: string
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Optimistic append so the comment appears instantly; a failure re-syncs it
  // away on the next refresh and surfaces the error.
  const [optimisticComments, addOptimistic] = useOptimistic(
    comments,
    (current: CommentWithAuthor[], draft: CommentWithAuthor) => [...current, draft],
  )

  function onSubmit(formData: FormData) {
    const text = String(formData.get('body') ?? '').trim()
    if (!text) return

    setError(null)
    setBody('')

    startTransition(async () => {
      addOptimistic({
        id: `optimistic-${Date.now()}`,
        body: text,
        createdAt: new Date().toISOString(),
        authorId: currentUserId ?? '',
        authorName: 'You',
        authorStravaConnected: false,
      })

      const result = await addComment({ activityId, body: text })
      if (!result.ok) {
        setError(result.error)
        setBody(text)
        return
      }
      router.refresh()
    })
  }

  function onDelete(commentId: string) {
    setError(null)
    startTransition(async () => {
      const result = await deleteComment(commentId, activityId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-4">
      <h2 id="comments-heading" className="text-fg text-base font-semibold">
        Comments
        <span className="text-fg-subtle ml-1.5 font-normal">
          ({optimisticComments.length})
        </span>
      </h2>

      {optimisticComments.length === 0 ? (
        <p className="text-fg-muted border-border rounded-card border border-dashed px-4 py-6 text-center text-sm">
          No comments yet. Ask a question, or say you are coming.
        </p>
      ) : (
        <ul className="space-y-3">
          {optimisticComments.map((comment) => {
            const isOptimistic = comment.id.startsWith('optimistic-')
            // Authors delete their own; the organizer moderates all. The same
            // rule is enforced in the database by delete_comment().
            const canDelete =
              !isOptimistic &&
              currentUserId !== null &&
              (comment.authorId === currentUserId || currentUserId === activityOwnerId)

            return (
              <li
                key={comment.id}
                className="border-border bg-surface rounded-card border p-3"
                style={isOptimistic ? { opacity: 0.6 } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-fg text-sm font-medium">
                      {comment.authorName}
                      {comment.authorId === activityOwnerId ? (
                        <span className="text-brand ml-1.5 text-[11px] font-semibold">
                          Organizer
                        </span>
                      ) : null}
                    </p>
                    {comment.authorStravaConnected ? <StravaConnectedBadge /> : null}
                  </div>
                  <time
                    dateTime={comment.createdAt}
                    className="text-fg-subtle shrink-0 text-xs"
                  >
                    {isOptimistic ? 'Sending…' : formatRelative(comment.createdAt)}
                  </time>
                </div>

                <p className="text-fg mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>

                {canDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(comment.id)}
                    disabled={pending}
                    className="text-fg-subtle hover:text-danger mt-2 min-h-11 text-xs underline"
                  >
                    {comment.authorId === currentUserId
                      ? 'Delete'
                      : 'Remove as organizer'}
                  </button>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {currentUserId ? (
        <form ref={formRef} action={onSubmit} className="space-y-2">
          <label htmlFor="comment-body" className="sr-only">
            Write a comment
          </label>
          <TextArea
            id="comment-body"
            name="body"
            value={body}
            maxLength={1000}
            placeholder="Ask a question, or say you are coming"
            onChange={(event) => setBody(event.target.value)}
          />
          {error ? (
            <p role="alert" className="text-danger text-xs">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending || body.trim().length === 0}>
            {pending ? 'Posting…' : 'Post comment'}
          </Button>
        </form>
      ) : (
        <p className="text-fg-muted text-sm">Sign in to join the conversation.</p>
      )}
    </section>
  )
}
