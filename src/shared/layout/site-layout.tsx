import type { ReactNode } from 'react'
import { useRouterState } from '@tanstack/react-router'
import { cn } from '@/shared/lib/utils'
import { BottomNav, mobileChromeOf } from './bottom-nav'
import { FeatureStrip } from './feature-strip'
import { Footer } from './footer'
import { Header } from './header'

export function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const chrome = mobileChromeOf(pathname)
  return (
    <div
      className={cn(
        'flex min-h-dvh flex-col',
        chrome === 'bottom-nav' && 'pb-24 md:pb-0',
        chrome === 'action-bar' && 'pb-52 md:pb-0',
      )}
    >
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <div className={cn(chrome === 'bare' && 'hidden md:block')}>
        <FeatureStrip />
        <Footer />
      </div>
      {chrome === 'bottom-nav' ? <BottomNav /> : null}
    </div>
  )
}
