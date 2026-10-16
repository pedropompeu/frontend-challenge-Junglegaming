import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute, useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { AlsoViewed } from '@/features/cart/components/also-viewed'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { CartTable, CartTableSkeleton } from '@/features/cart/components/cart-table'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { EmptyCart } from '@/features/cart/components/empty-cart'
import {
  availabilityMessage,
  conflictAvailable,
  isAvailabilityConflict,
  useCart,
} from '@/features/cart/queries'
import { setCheckoutPrefs, useCheckoutPrefs } from '@/features/quote/checkout-prefs'
import { quoteQuery, quoteRequestOf } from '@/features/quote/queries'
import { errorMessage, isApiError } from '@/shared/lib/api-error'
import { qk } from '@/shared/lib/query-keys'

export const Route = createFileRoute('/carrinho')({
  component: CartPage,
})

const COUPON_ERRORS = new Set(['COUPON_INVALID', 'COUPON_EXPIRED'])

function CartPage() {
  const { ownerKey } = useSession()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const cart = useCart()
  const prefs = useCheckoutPrefs(ownerKey)
  const items = cart.data?.items ?? []
  const quote = useQuery({
    ...quoteQuery(ownerKey, quoteRequestOf(prefs)),
    enabled: items.length > 0,
  })

  // Cupom salvo que deixou de valer (expirou entre visitas): sai das preferências com aviso.
  const quoteError = quote.error
  useEffect(() => {
    if (!isApiError(quoteError)) return
    if (COUPON_ERRORS.has(quoteError.code)) {
      setCheckoutPrefs(ownerKey, { couponCode: null })
      toast.error(
        `${quoteError.fieldErrors?.couponCode ?? quoteError.message}. O cupom foi removido.`,
      )
    } else if (isAvailabilityConflict(quoteError)) {
      const available = conflictAvailable(quoteError)
      if (available !== null) toast.error(availabilityMessage(available))
      void queryClient.invalidateQueries({ queryKey: qk.cart(ownerKey) })
    }
  }, [quoteError, ownerKey, queryClient])

  const blockingQuoteError =
    quote.isError && !(isApiError(quote.error) && COUPON_ERRORS.has(quote.error.code))
  const overStock = items.some((i) => i.quantity > i.available)
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
      <TitleBar />
      <div className="mt-6 grid gap-8 md:mt-6 lg:grid-cols-[minmax(0,1fr)_332px] lg:gap-[86px]">
        <div>{list}</div>
        {showSummary ? (
          <section
            aria-labelledby="cart-summary-title"
            className="-mx-4 rounded-t-[32px] border-t border-line bg-surface px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] max-md:sticky max-md:bottom-0 max-md:z-20 md:mx-0 md:rounded-none md:border-0 md:bg-transparent md:p-0 lg:self-start"
          >
            <h2
              id="cart-summary-title"
              className="text-lg font-bold max-md:sr-only md:border-b md:border-line md:pb-3"
            >
              Resumo da carteira
            </h2>
            <CouponForm
              appliedCode={prefs.couponCode}
              onRemove={() => setCheckoutPrefs(ownerKey, { couponCode: null })}
              className="mb-5 md:mt-6"
            />
            {blockingQuoteError ? (
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
              className="mt-6 h-14 w-full rounded-full bg-gradient-to-r from-primary-hi to-primary font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:rounded-md"
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

/** No mobile, voltar + título (o Figma não tem header); no desktop o título fica só para leitores. */
function TitleBar() {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const back =
    'grid size-10 place-items-center rounded-full border border-line-strong bg-surface-2 text-cream'
  const icon = <ChevronLeftIcon aria-hidden="true" className="size-5" />
  return (
    <div className="relative flex h-12 items-center justify-center md:contents">
      {canGoBack ? (
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.history.back()}
          className={`${back} absolute left-0 md:hidden`}
        >
          {icon}
        </button>
      ) : (
        <Link to="/" aria-label="Voltar" className={`${back} absolute left-0 md:hidden`}>
          {icon}
        </Link>
      )}
      <h1 className="text-xl font-bold md:sr-only">Carrinho de NFTs</h1>
    </div>
  )
}

function RetryBox({
  title,
  error,
  onRetry,
}: {
  title: string
  error: unknown
  onRetry: () => void
}) {
  return (
    <div role="alert" className="rounded-[10px] bg-surface px-6 py-8 text-center">
      <p className="font-bold">{title}</p>
      <p className="mt-2 text-sm text-sand">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md bg-primary px-5 py-2 font-bold text-ink hover:bg-primary-hi"
      >
        Tentar novamente
      </button>
    </div>
  )
}
