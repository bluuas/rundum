import { BottomNav } from '@/components/shell/bottom-nav'

/**
 * Shell for every browsing screen. Deliberately unconstrained: the sticky
 * header needs to span the full viewport so its background and border reach the
 * edges on wide screens. Pages centre their own content with <PageBody>.
 */
export default function AppLayout({ children }: LayoutProps<'/[locale]'>) {
  return (
    <>
      <div className="flex-1">{children}</div>
      <BottomNav />
    </>
  )
}
