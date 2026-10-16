import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import { useSession } from '@/features/auth/use-session'
import { AlsoViewed } from '@/features/cart/components/also-viewed'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { CartTable, CartTableSkeleton } from '@/features/cart/components/cart-table'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { EmptyCart } from '@/features/cart/components/empty-cart'
import { useCart } from '@/features/cart/queries'
import { isCouponError, useQuoteRecovery } from '@/features/cart/use-quote-recovery'
import { setCheckoutPrefs, useCheckoutPrefs } from '@/features/quote/checkout-prefs'
import { quoteQuery, quoteRequestOf } from '@/features/quote/queries'
import { TitleBar } from '@/shared/layout/title-bar'
import { RetryBox } from '@/shared/ui/retry-box'

export const Route = createFileRoute('/carrinho')({
  head: () =>
    pageHead(
      'Carrinho',
      'Revise os NFTs do seu carrinho, aplique um cupom e veja o total em ETH antes de pagar.',
    ),
  component: CartPage,
})

function CartPage() {
  const { ownerKey } = useSession()
  const navigate = useNavigate()
  const cart = useCart()
  const prefs = useCheckoutPrefs(ownerKey)
  const items = cart.data?.items ?? []
  // Com quantidade acima do estoque o servidor recusaria a cotação: espera o ajuste.
  const overStock = items.some((i) => i.quantity > i.available)
  const quote = useQuery({
    ...quoteQuery(ownerKey, quoteRequestOf(prefs)),
    enabled: items.length > 0 && !overStock,
  })

  // Cupom salvo que deixou de valer (expirou entre visitas): sai das preferências com aviso.
  useQuoteRecovery(quote.error, ownerKey)

  const blockingQuoteError = quote.isError && !isCouponError(quote.error)
  const canCheckout = Boolean(quote.data) && !quote.isFetching && !overStock && items.length > 0

  let list
  if (cart.isError) {
    list = (
      <RetryBox
        title="Não foi possível carregar seu carrinho"
        error={cart.error}
        onRetry={() => void cart.refetch()}
      />
    )
  } else if (!cart.data) {
    list = <CartTableSkeleton />
  } else if (items.length === 0) {
    list = <EmptyCart />
  } else {
    list = <CartTable items={items} quote={quote.data} />
  }

  const showSummary = !cart.data || items.length > 0

  return (
    <div className="page-container pt-4 pb-10 md:pt-6">
      <nav aria-label="Trilha" className="hidden text-sm font-bold md:block">
        <Link to="/" className="hover:text-primary-hi">
          Início
        </Link>{' '}
        /{' '}
        <Link to="/" hash="catalogo" className="hover:text-primary-hi">
          Mercado
        </Link>{' '}
        / <span aria-current="page">Carrinho</span>
      </nav>
      <TitleBar title="Carrinho de NFTs" />
      <div className="mt-6 grid gap-8 md:mt-6 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
        <div>{list}</div>
        {showSummary ? (
          <section
            aria-labelledby="cart-summary-title"
            className="-mx-6 rounded-t-[40px] bg-surface px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-float max-md:sticky max-md:bottom-0 max-md:z-20 md:mx-0 md:rounded-none md:bg-transparent md:p-0 md:shadow-none lg:self-start"
          >
            <h2
              id="cart-summary-title"
              className="text-lg font-bold max-md:sr-only md:border-b md:border-divider md:pb-3"
            >
              Resumo da carteira
            </h2>
            <CouponForm
              appliedCode={prefs.couponCode}
              onRemove={() => setCheckoutPrefs(ownerKey, { couponCode: null })}
              className="mb-[11px] md:mt-6 md:mb-5"
            />
            {overStock ? (
              <p
                role="status"
                className="rounded-[10px] bg-surface-2 px-4 py-3 text-sm text-sand md:bg-surface"
              >
                Ajuste as quantidades destacadas para ver o resumo atualizado.
              </p>
            ) : blockingQuoteError ? (
              <RetryBox
                title="Não foi possível calcular o resumo"
                error={quote.error}
                onRetry={() => void quote.refetch()}
              />
            ) : (
              <CartSummary quote={quote.data} isLoading={!quote.data} />
            )}
            <button
              type="button"
              disabled={!canCheckout}
              onClick={() => void navigate({ to: '/checkout' })}
              className="mt-6 h-[60px] w-full rounded-full cta-fill font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:rounded-md"
            >
              Conectar e finalizar
            </button>
            <Link
              to="/"
              hash="catalogo"
              className="mt-4 hidden text-center text-sm text-primary-hi hover:underline md:block"
            >
              Continuar explorando
            </Link>
          </section>
        ) : null}
      </div>
      <AlsoViewed excludeIds={items.map((i) => i.nftId)} />
    </div>
  )
}
