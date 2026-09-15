import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  optional,
}: {
  label: string
  hint?: string
  error?: string
  htmlFor?: string
  children: ReactNode
  optional?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-fg block text-sm font-medium">
        {label}
        {optional ? (
          <span className="text-fg-subtle font-normal"> (optional)</span>
        ) : null}
      </label>
      {hint ? <p className="text-fg-muted text-xs">{hint}</p> : null}
      {children}
      {error ? (
        <p role="alert" className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const CONTROL =
  'border-border-strong bg-surface text-fg placeholder:text-fg-subtle w-full rounded-card border px-3 py-2.5 min-h-11'

export function TextInput({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(CONTROL, className)} {...props} />
}

export function TextArea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(CONTROL, 'min-h-24', className)} {...props} />
}

export function SelectInput({ className, ...props }: React.ComponentProps<'select'>) {
  return <select className={cn(CONTROL, className)} {...props} />
}
