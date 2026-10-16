import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import { useSession } from '@/features/auth/use-session'
import { OrderStatus } from '@/features/orders/components/order-status'
import { orderQuery } from '@/features/orders/queries'
import { settleLocalState } from '@/features/realtime/apply-order-update'
import { isApiError } from '@/shared/lib/api-error'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_auth/pedido/$orderId')({
  head: () => pageHead('Pedido', 'Acompanhe em tempo real o status do seu pedido de NFTs.'),
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

  return <OrderStatus order={data} />
}
