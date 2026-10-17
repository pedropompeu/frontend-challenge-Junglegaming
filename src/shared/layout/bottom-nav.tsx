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
/** Ícones a 50 px do topo da barra (centros do frame de 414: 46, 118, 301,5 e 364). */
const slot = 'absolute top-[26px]'

/** Navegação inferior do mobile (< 768px), com o Scan central fora do escopo. */
export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  return (
    <nav
      aria-label="Navegação inferior"
      className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {/* Barra do frame: 95 px, cantos de 29 e o recorte em U do "Tab Bar" no meio (path do SVG,
          em largura fixa); as laterais cobrem o resto, e a sombra do filtro acompanha o recorte. */}
      <div aria-hidden="true" className="absolute inset-0 drop-shadow-dock">
        <div className="absolute inset-y-0 right-[calc(50%+80px)] left-0 rounded-tl-[29px] bg-surface" />
        <div className="absolute inset-y-0 right-0 left-[calc(50%+80px)] rounded-tr-[29px] bg-surface" />
        <svg
          viewBox="123 801 168 95"
          className="absolute top-0 left-1/2 h-[95px] w-[168px] -translate-x-1/2 fill-surface"
        >
          <path d="M123 801H131.15C144.9 801 157.13 809.2 162.98 821.65C170.74 838.18 187.54 849.62 207 849.62C226.46 849.62 243.26 838.17 251.02 821.65C256.87 809.2 269.09 801 282.85 801H291V896H123Z" />
        </svg>
        <div className="absolute inset-x-0 top-[95px] bottom-0 bg-surface" />
      </div>
      <ul className="relative h-[95px]">
        <li className={cn(slot, 'left-[22px]')}>
          <Link to="/" className={item} aria-current={pathname === '/' ? 'page' : undefined}>
            <HouseIcon aria-hidden="true" className="size-6" />
            <span className="sr-only">Início</span>
          </Link>
        </li>
        <li className={cn(slot, 'left-[94px]')}>
          <Link to="/favoritos" className={item}>
            <HeartIcon aria-hidden="true" className="size-6" />
            <span className="sr-only">Favoritos</span>
          </Link>
        </li>
        {/* Scan de 65 px centrado 1,5 px abaixo da borda; o vetor do degradê vai de 11 px acima a
            6 px abaixo do círculo (#D28A4C de 40% a 100%). */}
        <li className="absolute -top-[31px] left-1/2 -translate-x-1/2">
          <Unavailable className="grid size-[65px] place-items-center rounded-full bg-[linear-gradient(180deg,rgb(210_138_76/0.4)_-16.9%,var(--primary)_109.2%)] text-cream">
            <ScanLineIcon aria-hidden="true" strokeWidth={1.5} className="size-8" />
            <span className="sr-only">Escanear</span>
          </Unavailable>
        </li>
        <li className={cn(slot, 'right-[88.5px]')}>
          <CartNavLink />
        </li>
        <li className={cn(slot, 'right-[26px]')}>
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
