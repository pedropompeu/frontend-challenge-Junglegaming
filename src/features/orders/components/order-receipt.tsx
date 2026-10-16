import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { Order } from '@/contracts'
import { NETWORK_LABELS } from '@/features/catalog/components/filters-panel'
import { PROVIDER_LABELS } from '@/features/checkout/labels'
import { formatEth } from '@/shared/lib/money'
import { formatOrderDate, shortHash } from '../format'
import { OrderLines } from './order-lines'
import { ThankYouIcon } from './thank-you-icon'

function providerLabel(provider: string): string {
  return provider in PROVIDER_LABELS
    ? PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS]
    : provider
}

/**
 * Recibo do frame "Confirmação de Pedido". Só existe para pedido `confirmed` e lê apenas
 * o snapshot gravado no pedido.
 */
export function OrderReceipt({ order }: { order: Order }) {
  const date = order.settledAt ?? order.createdAt
  return (
    <div className="overflow-hidden rounded-[16px] bg-surface md:rounded-none">
      <header className="flex flex-col items-center gap-4 px-6 pt-6 pb-5 text-center">
        <ThankYouIcon role="img" aria-label="Thank you" className="h-20 w-[66px] text-primary" />
        <p className="font-bold text-sand">Seus NFTs agora estão na sua carteira</p>
      </header>

      <dl className="grid grid-cols-2 gap-4 border-y border-primary px-6 py-4 text-sm md:flex md:justify-between md:gap-0 md:px-9">
        <Meta label="ID da transação">
          {order.txHash ? <span title={order.txHash}>{shortHash(order.txHash)}</span> : '—'}
        </Meta>
        <Meta label="Data" divided>
          <time dateTime={date}>{formatOrderDate(date)}</time>
        </Meta>
        <Meta label="Total" divided>
          {formatEth(order.total)}
        </Meta>
        <Meta label="Carteira" divided>
          {providerLabel(order.wallet.provider)}
        </Meta>
      </dl>

      <section aria-labelledby="receipt-details-title" className="px-5 pt-6 pb-10 md:px-11">
        <h2 id="receipt-details-title" className="mb-2 text-[15px] font-bold">
          Detalhes da transação
        </h2>
        <OrderLines order={order} />
        <p className="mx-auto mt-4 max-w-[340px] text-center text-sm text-sand">
          Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida
          para sua carteira conectada e registrada na rede.
        </p>
        {order.txHash ? (
          <Link
            to="/explorador/tx/$hash"
            params={{ hash: order.txHash }}
            className="mx-auto mt-5 flex h-12 w-fit items-center gap-2 rounded-[4px] bg-primary px-4 font-bold text-ink transition-opacity hover:opacity-90"
          >
            Ver no Etherscan <span className="text-xs font-normal">(simulado)</span>
          </Link>
        ) : null}
      </section>
      <div aria-hidden="true" className="h-2.5 bg-primary" />
    </div>
  )
}

function Meta({
  label,
  divided,
  children,
}: {
  label: string
  divided?: boolean
  children: ReactNode
}) {
  return (
    <div className={divided ? 'md:border-l md:border-primary md:pl-4' : undefined}>
      <dt className="font-bold text-sand">{label}</dt>
      <dd className="text-sand">{children}</dd>
    </div>
  )
}
