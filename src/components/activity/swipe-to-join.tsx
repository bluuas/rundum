'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import {
  requestToJoin,
  type JoinErrorCode,
} from '@/app/[locale]/(app)/activities/actions'
import { useI18n } from '@/lib/i18n/provider'

/** How far the row must travel before releasing sends the request. */
const THRESHOLD_PX = 88

/** Past the threshold the row keeps moving, but grudgingly. */
const MAX_PX = 128

/** Below this, a drag is still ambiguous and the browser keeps the gesture. */
const SLOP_PX = 10

/**
 * Swipe an activity to the right to ask for a place, the way a mail app swipes
 * a message.
 *
 * It is an accelerator, never the only way in: the detail page keeps the real
 * button, which is what keyboard and screen-reader users get. So the revealed
 * panel is aria-hidden and only the result is announced.
 *
 * The gesture is offered only where it can succeed — signed in, and not on your
 * own activity. Everything else the database decides: the request may still
 * come back "already started" or "full", and that answer is shown in place.
 */
export function SwipeToJoin({
  activityId,
  enabled,
  children,
}: {
  activityId: string
  enabled: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [pending, startTransition] = useTransition()
  const [offset, setOffset] = useState(0)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<JoinErrorCode | null>(null)

  const start = useRef<{ x: number; y: number } | null>(null)
  const dragging = useRef(false)
  // The release has to read how far the row actually travelled, not how far it
  // had travelled when this render's handler was created — with a fast swipe
  // those differ, and the request is silently dropped.
  const travelled = useRef(0)
  // A drag ends in a click event the <Link> would otherwise follow.
  const swallowClick = useRef(false)

  // Once the gesture has been spent — sending, sent, or refused — the row goes
  // back to being an ordinary row and the outcome is stated underneath.
  if (!enabled || pending || sent || error !== null) {
    return (
      <div>
        <div className="-mx-2">{children}</div>
        {pending ? <Status className="text-fg-muted">{t.join.sending}</Status> : null}
        {sent ? <Status className="text-success">{t.join.pendingTitle}</Status> : null}
        {error ? <Status className="text-danger">{t.join.errors[error]}</Status> : null}
      </div>
    )
  }

  function move(to: number) {
    travelled.current = to
    setOffset(to)
  }

  function reset() {
    start.current = null
    dragging.current = false
    move(0)
  }

  function send() {
    startTransition(async () => {
      const result = await requestToJoin(activityId)
      if (result.ok) {
        setSent(true)
        router.refresh()
      } else {
        setError(result.code ?? 'unknown')
      }
    })
    move(0)
  }

  return (
    /*
      The negative margin lives here rather than on the card: it widens the row
      into the page gutter so the hover tint reaches past the text, and it is
      also the box the swipe is clipped to, which keeps a dragged row from
      scrolling the page sideways.
    */
    <div className="relative -mx-2 overflow-hidden">
      {/*
        The panel the row slides off. Purely visual: the status below is what
        gets announced.
      */}
      <div
        aria-hidden
        className="bg-brand text-brand-fg absolute inset-0 flex items-center px-4 text-sm font-medium"
        style={{ opacity: offset > 0 ? 1 : 0 }}
      >
        <span className={offset >= THRESHOLD_PX ? '' : 'opacity-60'}>
          {t.detail.requestToJoin}
        </span>
      </div>

      <div
        // pan-y keeps vertical scrolling native while horizontal pans reach us.
        className="bg-bg relative touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          // No transition while the finger is down, so the row tracks it
          // exactly; the spring back to 0 is the only thing worth animating.
          transition: offset === 0 ? 'transform 180ms ease-out' : undefined,
        }}
        onPointerDown={(event) => {
          if (pending) return
          start.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerMove={(event) => {
          if (!start.current) return
          const dx = event.clientX - start.current.x
          const dy = event.clientY - start.current.y

          if (!dragging.current) {
            // Let a vertical intent stay a scroll, and ignore leftward pulls:
            // there is nothing behind the row on that side.
            if (Math.abs(dy) > Math.abs(dx)) return reset()
            if (dx < SLOP_PX) return
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
          }

          move(dx > MAX_PX ? MAX_PX + (dx - MAX_PX) * 0.2 : dx)
        }}
        onPointerUp={() => {
          const passed = dragging.current && travelled.current >= THRESHOLD_PX
          if (dragging.current) swallowClick.current = true
          dragging.current = false
          start.current = null
          if (passed) send()
          else move(0)
        }}
        onPointerCancel={reset}
        /*
          The row is a link, and dragging a link starts a native drag-and-drop
          — which cancels the pointer one move in, so the swipe never got past
          the first few pixels.
        */
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={(event) => {
          if (!swallowClick.current) return
          event.preventDefault()
          event.stopPropagation()
          swallowClick.current = false
        }}
      >
        {children}
      </div>
    </div>
  )
}

function Status({
  className,
  children,
}: {
  className: string
  children: React.ReactNode
}) {
  return (
    <p role="status" className={`px-2 pb-3 text-xs font-medium ${className}`}>
      {children}
    </p>
  )
}
