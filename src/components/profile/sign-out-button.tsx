'use client'

import { useTransition } from 'react'
import { signOut } from '@/lib/auth/actions'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'

export function SignOutButton() {
  const [pending, startTransition] = useTransition()
  const { locale, t } = useI18n()

  return (
    <Button
      variant="secondary"
      fullWidth
      disabled={pending}
      onClick={() => startTransition(() => signOut(locale))}
    >
      {pending ? t.common.signingOut : t.common.signOut}
    </Button>
  )
}
