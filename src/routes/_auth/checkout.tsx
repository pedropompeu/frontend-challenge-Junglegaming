import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm, useWatch, type FieldPath, type FieldPathValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { pageHead } from '@/app/page-head'
import {
  QuoteSchema,
  type CreateOrderBody,
  type Network,
  type Order,
  type Quote,
  type User,
  type Wallet,
} from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { CartSummarySkeleton } from '@/features/cart/components/cart-summary-skeleton'
import { CouponForm } from '@/features/cart/components/coupon-form'
import { availabilityMessage, conflictAvailable, useCart } from '@/features/cart/queries'
import { isCouponError, useQuoteRecovery } from '@/features/cart/use-quote-recovery'
import { bindAttempt, clearAttempt, getOrCreateAttempt } from '@/features/checkout/attempt-store'
import { CheckoutForm } from '@/features/checkout/components/checkout-form'
import { CheckoutSummary } from '@/features/checkout/components/checkout-summary'
import { OrderReview } from '@/features/checkout/components/order-review'
import { ProviderSelector } from '@/features/checkout/components/provider-selector'
import { StaleQuoteDialog } from '@/features/checkout/components/stale-quote-dialog'
import { WalletSelector } from '@/features/checkout/components/wallet-selector'
import { WalletStatus } from '@/features/checkout/components/wallet-status'
import { flushDraft, loadDraft, saveDraft } from '@/features/checkout/draft-store'
import {
  initialCheckoutValues,
  primaryWalletOf,
  sameQuoteValues,
  walletFieldsOf,
} from '@/features/checkout/form-values'
import {
  CheckoutFormSchema,
  buyerOf,
  walletSessionBodyOf,
  type CheckoutFormValues,
} from '@/features/checkout/schemas'
import { targetOf, useWalletSession } from '@/features/checkout/wallet-session'
import { createOrder } from '@/features/orders/api'
import {
  clearPendingOrder,
  loadPendingOrder,
  savePendingOrder,
} from '@/features/orders/pending-order'
import { orderQuery } from '@/features/orders/queries'
import {
  getCheckoutPrefs,
  setCheckoutPrefs,
  useCheckoutPrefs,
} from '@/features/quote/checkout-prefs'
import { quoteQuery, quoteRequestOf, quotesKeyOf } from '@/features/quote/queries'
import { settleLocalState } from '@/features/realtime/apply-order-update'
import { walletsQuery } from '@/features/wallets/queries'
import { TitleBar } from '@/shared/layout/title-bar'
import { announce } from '@/shared/lib/announce'
import { errorMessage, isApiError } from '@/shared/lib/api-error'
import { formatEth } from '@/shared/lib/money'
import { qk } from '@/shared/lib/query-keys'
import { getStoredSession } from '@/shared/lib/session-store'
import { Form } from '@/shared/ui/form'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_auth/checkout')({
  head: () =>
    pageHead('Pagamento', 'Escolha a carteira e a rede e confirme a compra dos seus NFTs em ETH.'),
  // Pedido enviado e ainda sem resposta da carteira: o checkout leva a ele, não a outra compra.
  beforeLoad: async ({ context }) => {
    const userId = getStoredSession()?.userId
    const orderId = userId ? loadPendingOrder(userId) : null
    if (!userId || !orderId) return
    let order: Order
    try {
      order = await context.queryClient.fetchQuery({ ...orderQuery(userId, orderId), staleTime: 0 })
    } catch (error) {
      // Pedido que não existe mais não prende o checkout; sem rede, segue e o servidor decide.
      if (isApiError(error) && error.status === 404) clearPendingOrder(userId, orderId)
      return
    }
    if (order.status === 'pending') throw redirect({ to: '/pedido/$orderId', params: { orderId } })
    settleLocalState(context.queryClient, userId, order)
  },
  component: CheckoutPage,
})

const FORM_ID = 'checkout-form'

const primaryButton =
  'h-14 w-full rounded-full bg-gradient-to-r from-primary-hi to-primary font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:rounded-md'

function CheckoutShell({ children }: { children: ReactNode }) {
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
        / <span aria-current="page">Pagamento</span>
      </nav>
      <TitleBar title="Pagamento com carteira" />
      {children}
    </div>
  )
}

function CheckoutSkeleton() {
  return (
    <div aria-busy="true" className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-16">
      <span className="sr-only">Carregando checkout…</span>
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-none bg-surface" />
        ))}
      </div>
      <CartSummarySkeleton />
    </div>
  )
}

function CheckoutPage() {
  const { user } = useSession()
  return (
    <CheckoutShell>{user ? <CheckoutLoader user={user} /> : <CheckoutSkeleton />}</CheckoutShell>
  )
}

/** As carteiras definem os valores iniciais do formulário: ele só nasce depois delas. */
function CheckoutLoader({ user }: { user: User }) {
  const wallets = useQuery(walletsQuery(user.id))
  if (wallets.isError) {
    return (
      <div className="mt-6">
        <RetryBox
          title="Não foi possível carregar suas carteiras"
          error={wallets.error}
          onRetry={() => void wallets.refetch()}
        />
      </div>
    )
  }
  if (!wallets.data) return <CheckoutSkeleton />
  return <Checkout key={user.id} user={user} wallets={wallets.data} />
}

/**
 * editing → (formulário válido) reviewing → (confirmar) POST /orders.
 * `uncertain`: o envio ficou sem resposta (timeout/rede); só resta reenviar o MESMO corpo,
 * com a mesma chave, para descobrir se o pedido existe.
 */
type Mode =
  | { kind: 'editing' }
  | { kind: 'reviewing'; quote: Quote }
  | { kind: 'uncertain'; quote: Quote; body: CreateOrderBody }

const VALUES_CHANGED = 'Valores atualizados — revise antes de confirmar'
const STOCK_CHANGED = 'Um item não tem mais estoque suficiente — ajuste o carrinho para continuar'
const noticeBox =
  'flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-coral/60 px-4 py-3 text-sm'

function Checkout({ user, wallets }: { user: User; wallets: Wallet[] }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { ownerKey } = useSession()
  const prefs = useCheckoutPrefs(ownerKey)
  const cart = useCart()
  const items = cart.data?.items ?? []
  // Com quantidade acima do estoque o servidor recusaria a cotação: o ajuste é no carrinho.
  const overStock = items.some((i) => i.quantity > i.available)
  const quote = useQuery({
    ...quoteQuery(ownerKey, quoteRequestOf(prefs)),
    enabled: items.length > 0 && !overStock,
  })
  useQuoteRecovery(quote.error, ownerKey)

  const [initialValues] = useState(() =>
    initialCheckoutValues({
      user,
      wallets,
      draft: loadDraft(user.id),
      network: getCheckoutPrefs(ownerKey).network,
    }),
  )
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: initialValues,
  })
  const values = useWatch({ control: form.control }) as CheckoutFormValues

  // Rascunho a cada mudança (com debounce); ao sair da página, grava o que estiver pendente.
  useEffect(() => {
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: ({ values: next }) => saveDraft(user.id, next),
    })
    return () => {
      unsubscribe()
      flushDraft(user.id)
    }
  }, [form, user.id])

  const wallet = useWalletSession()
  const sessionBody = walletSessionBodyOf(values)
  // A sessão só vale para a carteira, o provedor e a rede com que foi aberta.
  const sessionMatches =
    wallet.target !== null && wallet.target === (sessionBody && targetOf(sessionBody))
  const readySession = wallet.status === 'connected' && sessionMatches ? wallet.session : null
  const walletStatus = wallet.status === 'connected' && !sessionMatches ? 'idle' : wallet.status

  const [mode, setMode] = useState<Mode>({ kind: 'editing' })
  const [stale, setStale] = useState<{ before: Quote; after: Quote } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const latest = quote.data
  const changed =
    mode.kind === 'reviewing' && latest !== undefined && !sameQuoteValues(latest, mode.quote)
  const summaryQuote =
    mode.kind === 'uncertain'
      ? mode.quote
      : mode.kind === 'reviewing'
        ? (latest ?? mode.quote)
        : latest
  const order = useMutation({
    mutationFn: ({ body, key }: { body: CreateOrderBody; key: string }) => createOrder(body, key),
    // Mesma chave: repetir é seguro, mas só quando o servidor disse que a falha é passageira.
    retry: (failures, error) => isApiError(error) && error.code === 'TRANSIENT' && failures < 2,
  })
  // Estoque que acabou durante a revisão: a cotação revisada não vale mais e o ajuste é no
  // carrinho. Depois do envio, quem consome o estoque é o próprio pedido.
  const stockBlocked =
    mode.kind === 'reviewing' && overStock && !order.isPending && !order.isSuccess
  // Mesmos valores revisados: envia a cotação mais recente (o id muda a cada recálculo).
  const confirmQuote =
    mode.kind === 'reviewing' && !changed && !stockBlocked ? (latest ?? mode.quote) : null
  const sending = useRef(false)

  const reviewHeading = useRef<HTMLHeadingElement>(null)
  const focusFormOnEdit = useRef(false)
  useEffect(() => {
    if (mode.kind === 'reviewing') {
      reviewHeading.current?.focus()
    } else if (mode.kind === 'editing' && focusFormOnEdit.current) {
      focusFormOnEdit.current = false
      form.setFocus('displayName')
    }
  }, [mode.kind, form])

  useEffect(() => {
    if (changed) announce(VALUES_CHANGED, 'assertive')
  }, [changed])

  function setField<K extends FieldPath<CheckoutFormValues>>(
    name: K,
    value: FieldPathValue<CheckoutFormValues, K>,
  ) {
    form.setValue(name, value, { shouldDirty: true, shouldValidate: form.formState.isSubmitted })
  }

  function applyWallet(w: Wallet) {
    const fields = walletFieldsOf(w)
    setField('useCustomWallet', fields.useCustomWallet)
    setField('walletId', fields.walletId)
    setField('walletAddress', fields.walletAddress)
    setField('secondaryAddress', fields.secondaryAddress)
    setField('walletType', fields.walletType)
  }

  function selectWallet(w: Wallet) {
    applyWallet(w)
    // O cartão mostra a rede da carteira: escolhê-lo escolhe a rede (e recalcula a taxa).
    setField('network', w.network)
    setCheckoutPrefs(ownerKey, { network: w.network })
  }

  function toggleCustomWallet(custom: boolean) {
    if (custom) {
      setField('useCustomWallet', true)
      setField('walletAddress', '')
      setField('secondaryAddress', '')
      return
    }
    const chosen = wallets.find((w) => w.id === values.walletId) ?? primaryWalletOf(wallets)
    if (chosen) applyWallet(chosen)
  }

  function changeNetwork(network: Network) {
    setCheckoutPrefs(ownerKey, { network })
  }

  function startReview() {
    if (!quote.data) return
    setSubmitError(null)
    setMode({ kind: 'reviewing', quote: quote.data })
  }

  function edit() {
    focusFormOnEdit.current = true
    setSubmitError(null)
    setMode({ kind: 'editing' })
  }

  function send(body: CreateOrderBody, sentQuote: Quote) {
    if (sending.current) return
    sending.current = true
    setSubmitError(null)
    // A chave é salva ANTES do POST: retry, recarga ou duplo clique reaproveitam a mesma.
    const attempt = getOrCreateAttempt(user.id, body.quoteId, body)
    order.mutate(
      { body, key: attempt.idempotencyKey },
      {
        onSuccess: (created) => {
          bindAttempt(user.id, created.id)
          queryClient.setQueryData(qk.order(user.id, created.id), created)
          if (created.status === 'pending') savePendingOrder(user.id, created.id)
          else settleLocalState(queryClient, user.id, created)
          void navigate({ to: '/pedido/$orderId', params: { orderId: created.id } })
        },
        onError: (error) => handleOrderError(error, body, sentQuote),
        onSettled: () => {
          sending.current = false
        },
      },
    )
  }

  function handleOrderError(error: unknown, body: CreateOrderBody, sentQuote: Quote) {
    const code = isApiError(error) ? error.code : 'UNKNOWN'
    if (code === 'TIMEOUT' || code === 'NETWORK') {
      setMode({ kind: 'uncertain', quote: sentQuote, body })
      return
    }
    // O servidor respondeu: a dúvida sobre o envio acabou, a revisão volta a valer.
    setMode((m) => (m.kind === 'uncertain' ? { kind: 'reviewing', quote: m.quote } : m))
    if (!isApiError(error)) {
      setSubmitError(errorMessage(error))
      return
    }
    // Sessão expirada: o provedor de sessão leva ao login; o rascunho já está salvo.
    if (error.status === 401) return
    switch (error.code) {
      case 'QUOTE_STALE': {
        const fresh = QuoteSchema.safeParse(
          (error.details as { quote?: unknown } | undefined)?.quote,
        )
        if (fresh.success) {
          setStale({ before: sentQuote, after: fresh.data })
        } else {
          setSubmitError(error.message)
          void queryClient.invalidateQueries({ queryKey: quotesKeyOf(ownerKey) })
        }
        return
      }
      case 'AVAILABILITY_CONFLICT': {
        const available = conflictAvailable(error)
        toast.error(
          available === null
            ? error.message
            : `${availabilityMessage(available)}. Ajuste o carrinho para continuar.`,
        )
        void queryClient.invalidateQueries({ queryKey: qk.cart(ownerKey) })
        void queryClient.invalidateQueries({ queryKey: quotesKeyOf(ownerKey) })
        void navigate({ to: '/carrinho' })
        return
      }
      case 'WALLET_REJECTED':
        wallet.markDisconnected()
        setSubmitError(error.message)
        return
      case 'IDEMPOTENCY_CONFLICT':
        // A chave salva não serve a este pedido: o próximo envio nasce com outra.
        clearAttempt(user.id)
        setSubmitError('Não foi possível enviar este pedido. Confirme a compra novamente.')
        return
      default:
        setSubmitError(errorMessage(error))
        void queryClient.invalidateQueries({ queryKey: quotesKeyOf(ownerKey) })
    }
  }

  function confirm() {
    if (!confirmQuote || !readySession) return
    send(
      {
        quoteId: confirmQuote.id,
        walletSessionId: readySession.id,
        buyer: buyerOf(form.getValues()),
      },
      confirmQuote,
    )
  }

  function acceptFreshQuote() {
    if (!stale) return
    const { after } = stale
    const couponCode = after.coupon?.code ?? null
    // O servidor pode ter tirado um cupom que expirou: as preferências acompanham a cotação.
    if (couponCode !== prefs.couponCode) setCheckoutPrefs(ownerKey, { couponCode })
    queryClient.setQueryData(
      qk.quote(ownerKey, quoteRequestOf({ couponCode, network: after.network })),
      after,
    )
    setStale(null)
    setMode({ kind: 'reviewing', quote: after })
  }

  // Carrinho vazio não tem o que pagar. Na revisão ou com envio em dúvida, a tela fica.
  if (mode.kind === 'editing' && cart.data && items.length === 0) {
    return <Navigate to="/carrinho" replace />
  }

  const walletLabel = values.useCustomWallet
    ? 'Carteira avulsa'
    : (wallets.find((w) => w.id === values.walletId)?.nickname ?? 'Carteira')
  const blockedReason = sessionBody
    ? null
    : values.useCustomWallet
      ? 'Informe um endereço válido para a rede e o tipo da carteira para conectar.'
      : 'Escolha uma carteira para conectar.'
  const blockingQuoteError = quote.isError && !isCouponError(quote.error) && !quote.data
  const canReview = Boolean(quote.data) && !quote.isFetching && !overStock
  const canConfirm =
    readySession !== null && confirmQuote !== null && !quote.isFetching && !order.isPending
  const locked = mode.kind !== 'editing'

  let summaryFallback: ReactNode = null
  if (mode.kind === 'editing' && overStock) {
    summaryFallback = (
      <p role="status" className="rounded-[10px] bg-surface px-4 py-3 text-sm text-sand">
        Algumas quantidades passam do estoque.{' '}
        <Link to="/carrinho" className="font-bold text-primary-hi hover:underline">
          Ajuste o carrinho
        </Link>{' '}
        para continuar.
      </p>
    )
  } else if (mode.kind === 'editing' && blockingQuoteError) {
    summaryFallback = (
      <RetryBox
        title="Não foi possível calcular o resumo"
        error={quote.error}
        onRetry={() => void quote.refetch()}
      />
    )
  }

  return (
    <Form {...form}>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_405px] lg:gap-16">
        <div className="min-w-0">
          {mode.kind === 'editing' ? (
            <CheckoutForm
              id={FORM_ID}
              onValid={startReview}
              onNetworkChange={changeNetwork}
              onUseCustomWalletChange={toggleCustomWallet}
              hasWallets={wallets.length > 0}
            />
          ) : (
            <OrderReview
              quote={summaryQuote ?? mode.quote}
              values={values}
              walletLabel={walletLabel}
              headingRef={reviewHeading}
              onEdit={edit}
              editDisabled={mode.kind === 'uncertain' || order.isPending}
              notice={
                stockBlocked ? (
                  <div className={noticeBox}>
                    <p className="font-bold text-coral">{STOCK_CHANGED}</p>
                    <Link to="/carrinho" className="font-bold text-primary-hi hover:underline">
                      Voltar ao carrinho
                    </Link>
                  </div>
                ) : changed ? (
                  <div className={noticeBox}>
                    <p className="font-bold text-coral">{VALUES_CHANGED}</p>
                    <button
                      type="button"
                      onClick={() => latest && setMode({ kind: 'reviewing', quote: latest })}
                      className="font-bold text-primary-hi hover:underline"
                    >
                      Revisar novamente
                    </button>
                  </div>
                ) : null
              }
            />
          )}
        </div>

        {/* Abaixo de lg a coluna se dissolve no grid: o CTA sticky gruda desde o topo. */}
        <div className="grid min-w-0 content-start gap-8 max-lg:contents">
          <CheckoutSummary
            items={items}
            quote={summaryFallback ? undefined : summaryQuote}
            coupon={
              mode.kind === 'editing' ? (
                <CouponForm
                  appliedCode={prefs.couponCode}
                  onRemove={() => setCheckoutPrefs(ownerKey, { couponCode: null })}
                />
              ) : null
            }
            fallback={summaryFallback}
          />
          <WalletSelector
            wallets={wallets}
            value={values.useCustomWallet ? '' : values.walletId}
            onSelect={selectWallet}
            disabled={locked}
          />
          {form.formState.errors.walletId ? (
            <p role="alert" className="-mt-5 text-xs font-bold text-coral">
              {form.formState.errors.walletId.message}
            </p>
          ) : null}
          <ProviderSelector
            value={values.provider}
            onChange={(provider) => setField('provider', provider)}
            disabled={order.isPending || mode.kind === 'uncertain'}
          />
          <WalletStatus
            status={walletStatus}
            session={readySession}
            blockedReason={blockedReason}
            onConnect={() => {
              if (sessionBody) void wallet.connect(sessionBody)
            }}
            onDisconnect={wallet.disconnect}
          />

          <div className="-mx-4 grid gap-4 rounded-t-[32px] border-t border-line bg-surface px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-md:sticky max-md:bottom-0 max-md:z-20 md:mx-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            {submitError ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm"
              >
                {submitError}
              </p>
            ) : null}
            {mode.kind === 'uncertain' ? (
              <div
                role="alert"
                className="grid gap-3 rounded-[10px] border border-coral/60 px-4 py-3 text-sm"
              >
                <p>
                  <span className="font-bold">Não confirmamos o envio.</span> A resposta não chegou
                  a tempo. Tente de novo: reenviamos o mesmo pedido, sem risco de compra duplicada.
                </p>
                <button
                  type="button"
                  onClick={() => send(mode.body, mode.quote)}
                  disabled={order.isPending}
                  className={primaryButton}
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                <p className="flex items-baseline justify-between text-lg md:hidden">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-primary-hi">
                    {summaryQuote ? formatEth(summaryQuote.total) : '—'}
                  </span>
                </p>
                {mode.kind === 'editing' ? (
                  <button
                    type="submit"
                    form={FORM_ID}
                    disabled={!canReview}
                    className={primaryButton}
                  >
                    Revisar pedido
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={!canConfirm}
                    aria-busy={order.isPending || undefined}
                    className={primaryButton}
                  >
                    Confirmar compra
                  </button>
                )}
                {order.isPending ? (
                  <p role="status" className="text-center text-sm text-sand">
                    Enviando pedido…
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
      <StaleQuoteDialog change={stale} onReview={acceptFreshQuote} />
    </Form>
  )
}
