import { ICON_PATHS, type IconName } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * One icon from the inlined Phosphor set.
 *
 * Emoji used to do this job and were wrong twice over: the reader's operating
 * system drew them, so 🏋️ was a different figure on an iPhone, an Android and
 * a Windows laptop; and they arrived in colour on a screen that is deliberately
 * paper and one maroon accent, which made them the loudest thing on it — the
 * same objection that took the ten per-sport hues off the badges.
 *
 * Takes its colour from `currentColor`, so dark mode and the accent follow
 * without a second asset, and it is `aria-hidden` by default: every icon in
 * Rundum sits beside its own label, so announcing it would read the name
 * twice. Pass a `title` only where that is not true.
 */
export function Icon({
  name,
  className,
  title,
}: {
  name: IconName
  className?: string
  /** Only when the icon is alone. Otherwise the neighbouring text names it. */
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="currentColor"
      className={cn('h-[1em] w-[1em] shrink-0', className)}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
      dangerouslySetInnerHTML={{
        __html: (title ? `<title>${title}</title>` : '') + ICON_PATHS[name],
      }}
    />
  )
}
