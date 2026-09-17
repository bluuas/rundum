'use client'

import { useRouter } from 'next/navigation'
import { useId, useState, useTransition } from 'react'
import { updateProfile } from '@/app/[locale]/(app)/profile/actions'
import { Button } from '@/components/ui/button'
import { Field, TextInput } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'
import { localeHref } from '@/lib/i18n/config'

/**
 * Pick the name other people will see.
 *
 * Reuses `updateProfile` rather than adding a second way to write the same
 * column — it already validates the length, is already rate limited, and is
 * already scoped to `auth.uid()`. The `display_name_chosen` flag is not sent
 * from here at all; a trigger sets it when the name changes, so no client can
 * claim to have picked a name it never picked.
 */
export function ChooseDisplayName() {
  const router = useRouter()
  const { locale, t } = useI18n()
  const fieldId = useId()
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)

  function save() {
    setError(null)
    setFieldErrors({})

    startTransition(async () => {
      const result = await updateProfile({ displayName: name })
      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      router.replace(localeHref(locale, '/'))
    })
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <p className="text-fg-muted text-sm leading-relaxed">{t.auth.welcomeBody}</p>

      <Field
        label={t.profile.displayName}
        hint={t.profile.displayNameHint}
        htmlFor={fieldId}
        error={fieldErrors.displayName?.[0]}
      >
        <TextInput
          id={fieldId}
          name="displayName"
          autoComplete="nickname"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t.common.saving : t.common.continue}
      </Button>

      <Button
        variant="secondary"
        fullWidth
        disabled={pending}
        onClick={() => router.replace(localeHref(locale, '/'))}
      >
        {t.auth.welcomeSkip}
      </Button>
    </form>
  )
}
