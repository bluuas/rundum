'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateProfile } from '@/app/[locale]/(app)/profile/actions'
import { Button } from '@/components/ui/button'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { useI18n } from '@/lib/i18n/provider'

/**
 * Edit your own display name and bio.
 *
 * Collapsed by default: the profile page is mostly for reading, and an
 * always-open form makes a settings screen out of it. Open, it is the path for
 * anyone who declined the Strava consent card and is still carrying the
 * generated placeholder name.
 */
export function ProfileEditor({
  displayName,
  bio,
}: {
  displayName: string
  bio: string | null
}) {
  const router = useRouter()
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [name, setName] = useState(displayName)
  const [about, setAbout] = useState(bio ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!open) {
    return (
      <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
        {t.profile.edit}
      </Button>
    )
  }

  function save() {
    setError(null)
    setFieldErrors({})
    setSaved(false)

    startTransition(async () => {
      const result = await updateProfile({ displayName: name, bio: about })
      if (!result.ok) {
        setError(result.error)
        setFieldErrors(result.fieldErrors ?? {})
        return
      }
      setSaved(true)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <section className="border-border bg-surface rounded-card space-y-4 border p-4">
      <h2 className="text-fg text-sm font-semibold">{t.profile.editHeading}</h2>

      <Field
        label={t.profile.displayName}
        htmlFor="display-name"
        hint={t.profile.displayNameHint}
        error={fieldErrors.displayName?.[0]}
      >
        <TextInput
          id="display-name"
          value={name}
          maxLength={50}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field
        label={t.profile.bio}
        htmlFor="bio"
        hint={t.profile.bioHint}
        error={fieldErrors.bio?.[0]}
      >
        <TextArea
          id="bio"
          value={about}
          maxLength={300}
          rows={3}
          onChange={(event) => setAbout(event.target.value)}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      ) : null}
      {saved ? <p className="text-success text-sm">{t.profile.saved}</p> : null}

      <div className="flex gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          {t.common.cancel}
        </Button>
        <Button fullWidth disabled={pending} onClick={save}>
          {pending ? t.common.saving : t.common.save}
        </Button>
      </div>
    </section>
  )
}
