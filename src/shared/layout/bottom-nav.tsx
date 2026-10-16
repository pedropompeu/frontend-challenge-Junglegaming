import { Link, useRouterState } from '@tanstack/react-router'
import { HeartIcon, HouseIcon, ScanLineIcon, ShoppingCartIcon, UserRoundIcon } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { Unavailable } from '@/shared/ui/unavailable'

/** Telas mobile que têm barra de ação fixa no Figma (detalhe, carrinho, pagamento). */
export const ROUTES_WITH_ACTION_BAR = ['/nft/', '/carrinho', '/checkout']
/** Telas mobile cheias, sem navegação nem rodapé (entrar, cadastro). */
export const BARE_ROUTES = ['/entrar', '/cadastro']

export type MobileChrome = 'bottom-nav' | 'action-bar' | 'bare'

export function mobileChromeOf(pathname: string): MobileChrome {
  if (BARE_ROUTES.some((p) => pathname.startsWith(p))) return 'bare'
  if (ROUTES_WITH_ACTION_BAR.some((p) => pathname.startsWith(p))) return 'action-bar'
  return 'bottom-nav'
}

const item =
  'grid size-12 place-items-center rounded-full text-sand transition-colors hover:text-primary-hi aria-[current=page]:text-primary-hi'

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>

function NavAnchor({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: NavIcon
  active: boolean
}) {
  return (
    <a href={href} className={item} aria-current={active ? 'page' : undefined}>
      <Icon aria-hidden="true" className="size-6" />
      <span className="sr-only">{label}</span>
    </a>
  )
}

/** Navegação inferior do mobile (< 768px), com o Scan central fora do escopo. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-30 rounded-t-[32px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid h-[72px] max-w-md grid-cols-5 items-center justify-items-center px-4">
        <li>
          <Link to="/" className={item} aria-current={pathname === '/' ? 'page' : undefined}>
            <HouseIcon aria-hidden="true" className="size-6" />
            <span className="sr-only">Início</span>
          </Link>
        </li>
        <li>
          <NavAnchor
            href="/favoritos"
            label="Favoritos"
            Icon={HeartIcon}
            active={pathname.startsWith('/favoritos')}
          />
        </li>
        <li className="-mt-10">
          <Unavailable className="grid size-16 place-items-center rounded-full border-4 border-ink bg-gradient-to-br from-primary-hi to-primary text-ink shadow-lg">
            <ScanLineIcon aria-hidden="true" className="size-7" />
            <span className="sr-only">Escanear</span>
          </Unavailable>
        </li>
        <li>
          <NavAnchor
            href="/carrinho"
            label="Carrinho"
            Icon={ShoppingCartIcon}
            active={pathname.startsWith('/carrinho')}
          />
        </li>
        <li>
          <NavAnchor
            href="/perfil"
            label="Perfil"
            Icon={UserRoundIcon}
            active={pathname.startsWith('/perfil')}
          />
        </li>
      </ul>
    </nav>
  )
}
