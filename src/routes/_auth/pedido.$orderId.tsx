import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import type { Order } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { EDITION_LABELS } from '@/features/nft/editions'
import { orderQuery } from '@/features/orders/queries'
import { settleLocalState } from '@/features/realtime/apply-order-update'
import { isApiError } from '@/shared/lib/api-error'
import { formatEth } from '@/shared/lib/money'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_auth/pedido/$orderId')({
  component: OrderPage,
})

/** Acompanhamento do pedido: `order.updated` (tempo real) leva de "Pendente" ao resultado. */
function OrderPage() {
  const { orderId } = Route.useParams()
  const { user } = useSession()
  return (
    <div className="page-container pt-6 pb-10">
      {user ? <OrderView userId={user.id} orderId={orderId} /> : <OrderSkeleton />}
    </div>
  )
}

function OrderSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <span className="sr-only">Carregando pedido…</span>
      <Skeleton className="h-10 w-72 bg-surface" />
      <Skeleton className="h-48 bg-surface" />
    </div>
  )
}

const HEADINGS: Record<Order['status'], string> = {
  pending: 'Pagamento em processamento',
  confirmed: 'Pedido confirmado',
  declined: 'Pagamento recusado',
}

const BADGES: Record<Order['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
}

function OrderView({ userId, orderId }: { userId: string; orderId: string }) {
  const queryClient = useQueryClient()
  const order = useQuery(orderQuery(userId, orderId))
  const data = order.data

  // Resultado visto pela REST (recarga, socket perdido): os mesmos efeitos do tempo real.
  useEffect(() => {
    if (data && data.status !== 'pending') settleLocalState(queryClient, userId, data)
  }, [data, queryClient, userId])

  if (order.isError && isApiError(order.error) && order.error.status === 404) {
    return (
      <div className="rounded-[10px] bg-surface px-6 py-12 text-center">
        <h1 className="text-2xl font-bold">Pedido não encontrado</h1>
        <Link to="/" className="mt-6 inline-block font-bold text-primary-hi hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }
  if (order.isError && !data) {
    return (
      <RetryBox
        title="Não foi possível carregar o pedido"
        error={order.error}
        onRetry={() => void order.refetch()}
      />
    )
  }
  if (!data) return <OrderSkeleton />

  return (
    <article aria-labelledby="order-title" className="grid max-w-3xl gap-6">
      <header className="grid gap-3">
        <span
          className={
            data.status === 'confirmed'
              ? 'w-fit rounded-full bg-primary-hi px-3 py-1 text-xs font-bold text-ink'
              : data.status === 'declined'
                ? 'w-fit rounded-full bg-coral px-3 py-1 text-xs font-bold text-ink'
                : 'w-fit rounded-full border border-primary-hi px-3 py-1 text-xs font-bold text-primary-hi'
          }
        >
          {BADGES[data.status]}
        </span>
        <h1 id="order-title" className="text-2xl font-bold md:text-4xl">
          {HEADINGS[data.status]}
        </h1>
        <p role="status" className="text-sand">
          {data.status === 'pending'
            ? 'Aguardando a carteira aprovar o pagamento. Esta página se atualiza sozinha.'
            : data.status === 'declined'
              ? (data.declineReason ?? 'A carteira não aprovou o pagamento.')
              : 'Seus NFTs já estão a caminho da sua carteira.'}
        </p>
      </header>

      <section
        aria-labelledby="order-items-title"
        className="rounded-[16px] bg-surface px-5 py-6 md:px-8"
      >
        <h2 id="order-items-title" className="font-bold">
          Pedido {data.id}
        </h2>
        <ul aria-label="Itens do pedido" className="mt-4 grid gap-2 text-[15px]">
          {data.lines.map((line) => (
            <li key={line.cartItemId} className="flex items-start justify-between gap-4">
              <span>
                {line.name}{' '}
                <span className="text-sand">
                  · Edição {EDITION_LABELS[line.editionKind]} (x {line.quantity})
                </span>
              </span>
              <span>{formatEth(line.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[15px]">
          <Amount label="Subtotal" testId="receipt-subtotal" value={formatEth(data.subtotal)} />
          <Amount
            label={data.coupon ? `Cupom ${data.coupon.code}` : 'Desconto'}
            testId="receipt-discount"
            value={formatEth(data.discount)}
          />
          <Amount label="Taxa de rede" testId="receipt-fee" value={formatEth(data.networkFee)} />
          <Amount label="Total" testId="receipt-total" value={formatEth(data.total)} strong />
        </dl>
        <dl className="mt-4 grid gap-2 border-t border-line pt-4 text-[15px]">
          <Amount label="Carteira" value={data.wallet.label} />
          <Amount label="Rede" value={NETWORK_LABELS[data.network]} />
        </dl>
      </section>

      <div className="flex flex-wrap gap-4">
        {data.status === 'declined' ? (
          <Link
            to="/carrinho"
            className="inline-flex h-11 items-center rounded-md bg-gradient-to-r from-primary-hi to-primary px-6 font-bold text-ink"
          >
            Voltar ao carrinho
          </Link>
        ) : null}
        <Link
          to="/"
          hash="catalogo"
          className="inline-flex h-11 items-center font-bold text-primary-hi hover:underline"
        >
          Continuar explorando
        </Link>
      </div>
    </article>
  )
}

function Amount({
  label,
  value,
  testId,
  strong,
}: {
  label: string
  value: string
  testId?: string
  strong?: boolean
}) {
  return (
    <div className={strong ? 'flex justify-between gap-4 font-bold' : 'flex justify-between gap-4'}>
      <dt className={strong ? undefined : 'text-sand'}>{label}</dt>
      <dd data-testid={testId} className={strong ? 'text-lg text-primary-hi' : undefined}>
        {value}
      </dd>
    </div>
  )
}
