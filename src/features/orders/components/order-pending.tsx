import type { Order } from '@/contracts'
import { OrderLines } from './order-lines'

/** Pedido aceito pelo servidor e aguardando a liquidação (chega por `order.updated`). */
export function OrderPending({ order }: { order: Order }) {
  return (
    <article
      aria-labelledby="order-title"
      className="mx-auto grid max-w-[578px] gap-6 rounded-[16px] bg-surface px-5 py-8 md:px-11"
    >
      <header className="grid justify-items-center gap-3 text-center">
        <span className="rounded-full border border-primary-hi px-3 py-1 text-xs font-bold text-primary-hi">
          Pendente
        </span>
        <h1 id="order-title" className="text-2xl font-bold md:text-3xl">
          Pagamento em processamento
        </h1>
        <p role="status" className="flex items-center gap-3 font-bold text-sand">
          <span
            aria-hidden="true"
            className="size-5 animate-spin rounded-full border-2 border-primary-hi border-t-transparent motion-reduce:animate-none"
          />
          Aguardando confirmação da rede…
        </p>
        <p className="text-sm text-khaki">
          Esta página se atualiza sozinha. Se você sair, o pedido continua em processamento.
        </p>
      </header>
      <OrderLines order={order} />
    </article>
  )
}
