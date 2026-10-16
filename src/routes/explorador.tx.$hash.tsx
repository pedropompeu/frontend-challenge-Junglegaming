import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import type { Order } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { formatOrderDate } from '@/features/orders/format'
import { orderByTxQuery } from '@/features/orders/queries'
import { isApiError } from '@/shared/lib/api-error'
import { formatEth } from '@/shared/lib/money'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/explorador/tx/$hash')({
  head: () =>
    pageHead('Transação', 'Detalhes da transação de um pedido seu: status, valores e rede.'),
  component: ExplorerPage,
})

const TX_STATUS: Record<Order['status'], string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  declined: 'Recusada',
}

/**
 * Faz o papel do "Ver no Etherscan" do Figma: não existe rede real, então a transação vem
 * do próprio pedido (`GET /orders/by-tx/:hash`, só para quem comprou).
 */
function ExplorerPage() {
  const { hash } = Route.useParams()
  const { status, user } = useSession()

  let body
  if (user) body = <TxDetails userId={user.id} hash={hash} />
  else if (status === 'loading') body = <TxSkeleton />
  else {
    body = (
      <div className="rounded-[10px] bg-surface px-6 py-10 text-center">
        <p className="font-bold">Entre para ver esta transação.</p>
        <p className="mt-2 text-sm text-sand">Só quem fez a compra pode consultá-la.</p>
        <Link
          to="/entrar"
          search={{ redirect: `/explorador/tx/${hash}` }}
          className="mt-6 inline-flex h-11 items-center rounded-md cta-fill px-6 font-bold text-ink"
        >
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div className="page-container pt-6 pb-10">
      <article aria-labelledby="explorer-title" className="mx-auto grid max-w-3xl gap-6">
        <header className="grid gap-2">
          <h1 id="explorer-title" className="text-2xl font-bold md:text-3xl">
            Explorador simulado
          </h1>
          <p className="text-sm text-sand">
            Simulação: esta página faz o papel do Etherscan com os dados gravados no pedido. Nada
            aqui consulta uma rede real.
          </p>
        </header>
        {body}
      </article>
    </div>
  )
}

function TxSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Carregando transação…</span>
      <Skeleton className="h-64 bg-surface" />
    </div>
  )
}

function TxDetails({ userId, hash }: { userId: string; hash: string }) {
  const tx = useQuery(orderByTxQuery(userId, hash))

  if (tx.isError && isApiError(tx.error) && tx.error.status === 404) {
    return (
      <div className="rounded-[10px] bg-surface px-6 py-10 text-center">
        <p className="font-bold">Transação não encontrada</p>
        <Link to="/" className="mt-6 inline-block font-bold text-primary-hi hover:underline">
          Voltar ao início
        </Link>
      </div>
    )
  }
  if (tx.isError) {
    return (
      <RetryBox
        title="Não foi possível carregar a transação"
        error={tx.error}
        onRetry={() => void tx.refetch()}
      />
    )
  }
  if (!tx.data) return <TxSkeleton />

  const order = tx.data
  const date = order.settledAt ?? order.createdAt
  return (
    <section
      aria-label="Detalhes da transação"
      className="rounded-[16px] bg-surface px-5 py-6 md:px-8"
    >
      <dl className="grid gap-4 text-[15px] md:grid-cols-[180px_minmax(0,1fr)] md:gap-x-6">
        <Row label="Hash da transação">
          <span className="break-all">{order.txHash ?? hash}</span>
        </Row>
        <Row label="Status">{TX_STATUS[order.status]}</Row>
        <Row label="Data">
          <time dateTime={date}>{formatOrderDate(date)}</time>
        </Row>
        <Row label="Rede">{NETWORK_LABELS[order.network]}</Row>
        <Row label="Para">
          <span className="break-all">{order.wallet.address}</span>
        </Row>
        <Row label="Valor">
          <span className="font-bold text-primary-hi">{formatEth(order.total)}</span>
        </Row>
        <Row label="Taxa de rede">{formatEth(order.networkFee)}</Row>
      </dl>
      <Link
        to="/pedido/$orderId"
        params={{ orderId: order.id }}
        className="mt-6 inline-block font-bold text-primary-hi hover:underline"
      >
        Ver pedido
      </Link>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 md:contents">
      <dt className="text-sand">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
