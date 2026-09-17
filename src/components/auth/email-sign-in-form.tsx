'use client'

import { useId, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { sendSignInLink } from '@/lib/auth/email-sign-in'
import { fill } from '@/lib/i18n'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Ask for a sign-in link.
 *
 * One field, because that is the whole of it. The confirmation deliberately
 * says a link "is on its way" without confirming that the address has an
 * account: the same words appear whether this created an account, signed an
 * existing one in, or went nowhere, so the form cannot be used to find out who
 * is a member.
 */
export function EmailSignInForm() {
  const { locale, t } = useI18n()
  const fieldId = useId()
  const [pending, startTransition] = useTransition()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  function submit() {
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await sendSignInLink({ email }, locale)
      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      setSentTo(email.trim())
    })
  }

  if (sentTo) {
    return (
      <section
        role="status"
        className="border-border bg-surface rounded-card space-y-2 border p-4"
      >
        <h2 className="text-fg text-sm font-semibold">{t.auth.sentTitle}</h2>
        <p className="text-fg-muted text-sm">
          {fill(t.auth.sentBody, { email: sentTo })}
        </p>
        <p className="text-fg-subtle text-xs">{t.auth.sentSpam}</p>
        <Button
          variant="secondary"
          fullWidth
          onClick={() => {
            setSentTo(null)
            setEmail('')
          }}
        >
          {t.auth.differentAddress}
        </Button>
      </section>
    )
  }

  return (
    <form
      className="border-border bg-surface rounded-card space-y-3 border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <h2 className="text-fg text-sm font-semibold">{t.auth.signInTitle}</h2>
      <p className="text-fg-muted text-sm">{t.auth.signInIntro}</p>

      <Field label={t.auth.emailLabel} htmlFor={fieldId} error={fieldErrors.email?.[0]}>
        <TextInput
          id={fieldId}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t.auth.sending : t.auth.sendLink}
      </Button>
    </form>
  )
}
