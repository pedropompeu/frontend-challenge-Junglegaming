import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { SearchIcon, ShoppingCartIcon, XIcon } from 'lucide-react'
import { AccountMenu } from '@/features/auth/components/account-menu'
import { useCartCount } from '@/features/cart/queries'
import { RealtimeIndicator } from '@/features/realtime/components/realtime-indicator'
import { cn } from '@/shared/lib/utils'
import { Unavailable } from '@/shared/ui/unavailable'

/** Rotas do fluxo de compra, onde o Figma destaca "Mercado" em vez de "Início". */
const MARKET_PREFIXES = ['/nft/', '/carrinho', '/checkout', '/pedido/']

// Frame desktop: nav 16 px, a ativa em negrito com sublinhado de 3 px colado à divisória.
const navLink =
  'relative inline-flex h-full items-center px-1 text-cream transition-colors hover:text-primary-hi aria-[current=page]:text-primary-hi aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-px aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-primary lg:px-0 lg:aria-[current=page]:font-bold lg:aria-[current=page]:after:h-[3px]'

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const inMarket = MARKET_PREFIXES.some((p) => pathname.startsWith(p))
  const current = (active: boolean) => (active ? ('page' as const) : undefined)

  return (
    <header className="hidden md:block">
      <div className="page-container">
        <div className="relative flex h-[68px] items-center justify-between gap-6 border-b border-divider">
          <Link to="/" className="text-sm font-bold tracking-[0.2em] text-cream">
            KURIO
          </Link>

          {/* A partir de 1280 px a nav fica em x 496 do frame, sem depender da largura dos ícones. */}
          <nav aria-label="Principal" className="h-full xl:absolute xl:left-[376px]">
            <ul className="flex h-full items-center gap-6 text-[15px] lg:gap-10 lg:text-base">
              <li className="h-full">
                <Link to="/" className={navLink} aria-current={current(pathname === '/')}>
                  Início
                </Link>
              </li>
              <li className="h-full">
                {/* Com hash, o Link não se marca ativo sozinho em `/` (ele força aria-current). */}
                <Link
                  to="/"
                  hash="catalogo"
                  activeOptions={{ includeHash: true }}
                  className={navLink}
                  aria-current={current(inMarket)}
                >
                  Mercado
                </Link>
              </li>
              <li className="h-full">
                <Unavailable asChild>
                  <a href="/criadores" className={navLink}>
                    Criadores
                  </a>
                </Unavailable>
              </li>
              <li className="h-full">
                <Unavailable asChild>
                  <a href="/aprenda" className={navLink}>
                    Aprenda
                  </a>
                </Unavailable>
              </li>
            </ul>
          </nav>

          <div className="flex items-center gap-4 lg:gap-6">
            <RealtimeIndicator />
            <HeaderSearch />
            <CartLink />
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  )
}

/** "1 item" / "N itens": usado no rótulo dos atalhos do carrinho. */
export function cartLabel(count: number): string {
  return `Carrinho, ${count} ${count === 1 ? 'item' : 'itens'}`
}

export function CartBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      className="absolute top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 font-bold text-ink"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function CartLink() {
  const count = useCartCount()
  return (
    <Link
      to="/carrinho"
      className="relative grid size-10 place-items-center rounded-md text-cream hover:text-primary-hi"
    >
      <ShoppingCartIcon aria-hidden="true" className="size-6" />
      <span className="sr-only">{cartLabel(count)}</span>
      <CartBadge count={count} />
    </Link>
  )
}

/** Lupa do header: abre um campo de busca que leva ao catálogo com `?q=`. */
function HeaderSearch() {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = String(new FormData(event.currentTarget).get('q') ?? '').trim()
    setOpen(false)
    void navigate({ to: '/', search: q ? { q } : {} })
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="header-search"
        onClick={() => setOpen((v) => !v)}
        className="grid size-10 place-items-center rounded-md text-cream hover:text-primary-hi"
      >
        {open ? (
          <XIcon aria-hidden="true" className="size-6" />
        ) : (
          <SearchIcon aria-hidden="true" className="size-6" />
        )}
        <span className="sr-only">{open ? 'Fechar busca' : 'Buscar'}</span>
      </button>
      <form
        id="header-search"
        role="search"
        hidden={!open}
        onSubmit={submit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false)
        }}
        className={cn(
          'absolute top-full right-0 z-40 mt-3 w-80 rounded-lg border border-line bg-surface p-2 shadow-xl',
        )}
      >
        <label htmlFor="header-search-input" className="sr-only">
          Buscar NFTs
        </label>
        <input
          ref={inputRef}
          id="header-search-input"
          name="q"
          type="search"
          maxLength={80}
          placeholder="Buscar NFTs, coleções…"
          className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-cream placeholder:text-khaki"
        />
      </form>
    </div>
  )
}
