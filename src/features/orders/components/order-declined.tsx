import { Link } from '@tanstack/react-router'
import type { Order } from '@/contracts'
import { OrderLines } from './order-lines'

/** Liquidação recusada: nada foi cobrado, o estoque voltou e o carrinho segue intacto. */
export function OrderDeclined({ order }: { order: Order }) {
  return (
    <article
      aria-labelledby="order-title"
      className="mx-auto grid max-w-[578px] gap-6 rounded-[16px] bg-surface px-5 py-8 md:px-11"
    >
      <header className="grid justify-items-center gap-3 text-center">
        <span className="rounded-full bg-coral px-3 py-1 text-xs font-bold text-ink">Recusado</span>
        <h1 id="order-title" className="text-2xl font-bold md:text-3xl">
          Pagamento recusado
        </h1>
        <p className="font-bold text-sand">
          {order.declineReason ?? 'A carteira não aprovou o pagamento.'}
        </p>
        <p className="text-sm text-khaki">
          Nenhum valor foi cobrado e seus itens continuam no carrinho.
        </p>
      </header>
      <OrderLines order={order} />
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
        <Link
          to="/carrinho"
          className="inline-flex h-11 items-center rounded-md cta-fill px-6 font-bold text-ink"
        >
          Voltar ao carrinho
        </Link>
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
