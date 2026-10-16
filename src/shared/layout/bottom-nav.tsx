import { Link, useRouterState } from '@tanstack/react-router'
import { HeartIcon, HouseIcon, ScanLineIcon, ShoppingCartIcon, UserRoundIcon } from 'lucide-react'
import { useCartCount } from '@/features/cart/queries'
import { cn } from '@/shared/lib/utils'
import { Unavailable } from '@/shared/ui/unavailable'
import { CartBadge, cartLabel } from './header'

/** Telas mobile com barra de ação fixa no Figma (detalhe): a página reserva o espaço dela. */
export const ROUTES_WITH_ACTION_BAR = ['/nft/']
/** Telas mobile do fluxo de compra sem navegação inferior; o resumo gruda no rodapé (sticky). */
export const FOCUSED_ROUTES = ['/carrinho', '/checkout']
/** Telas mobile cheias, sem navegação nem rodapé (entrar, cadastro). */
export const BARE_ROUTES = ['/entrar', '/cadastro']

export type MobileChrome = 'bottom-nav' | 'action-bar' | 'focused' | 'bare'

export function mobileChromeOf(pathname: string): MobileChrome {
  if (BARE_ROUTES.some((p) => pathname.startsWith(p))) return 'bare'
  if (ROUTES_WITH_ACTION_BAR.some((p) => pathname.startsWith(p))) return 'action-bar'
  if (FOCUSED_ROUTES.some((p) => pathname.startsWith(p))) return 'focused'
  return 'bottom-nav'
}

const item =
  'grid size-12 place-items-center rounded-full text-sand transition-colors hover:text-primary-hi aria-[current=page]:text-primary-hi'

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
          <Link to="/favoritos" className={item}>
            <HeartIcon aria-hidden="true" className="size-6" />
            <span className="sr-only">Favoritos</span>
          </Link>
        </li>
        <li className="-mt-10">
          <Unavailable className="grid size-16 place-items-center rounded-full border-4 border-ink bg-gradient-to-br from-primary-hi to-primary text-ink shadow-lg">
            <ScanLineIcon aria-hidden="true" className="size-7" />
            <span className="sr-only">Escanear</span>
          </Unavailable>
        </li>
        <li>
          <CartNavLink />
        </li>
        <li>
          <Link to="/perfil" className={item}>
            <UserRoundIcon aria-hidden="true" className="size-6" />
            <span className="sr-only">Perfil</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}

function CartNavLink() {
  const count = useCartCount()
  return (
    <Link to="/carrinho" className={cn(item, 'relative')}>
      <ShoppingCartIcon aria-hidden="true" className="size-6" />
      <span className="sr-only">{cartLabel(count)}</span>
      <CartBadge count={count} />
    </Link>
  )
}
