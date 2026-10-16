import type { ReactNode } from 'react'
import type { CartItem, Quote } from '@/contracts'
import { CartSummary } from '@/features/cart/components/cart-summary'
import { CartSummarySkeleton } from '@/features/cart/components/cart-summary-skeleton'
import { EDITION_LABELS } from '@/features/nft/editions'
import { formatEth } from '@/shared/lib/money'

type CheckoutSummaryProps = {
  items: CartItem[]
  quote: Quote | undefined
  /** Cupom (formulário ou cupom aplicado), entre os NFTs e os totais como no frame. */
  coupon: ReactNode
  /** No lugar dos totais quando a cotação falha ou espera ajuste. */
  fallback?: ReactNode
}

/** "Seus NFTs": linhas e totais da cotação do servidor, com a imagem do item do carrinho. */
export function CheckoutSummary({ items, quote, coupon, fallback }: CheckoutSummaryProps) {
  const imageOf = (cartItemId: string) => items.find((i) => i.id === cartItemId)?.image
  return (
    <section aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title" className="font-bold max-md:sr-only">
        Seus NFTs
      </h2>
      <div
        aria-hidden="true"
        className="mt-3 hidden justify-between border-b border-line pb-2 text-[15px] font-bold md:flex"
      >
        <span>NFTs</span>
        <span>Subtotal</span>
      </div>
      {quote ? (
        <ul aria-label="NFTs do pedido" className="mt-3 grid gap-3 max-md:hidden">
          {quote.lines.map((line) => {
            const image = imageOf(line.cartItemId)
            return (
              <li
                key={line.cartItemId}
                className="grid grid-cols-[70px_minmax(0,1fr)_auto_auto] items-center gap-3 bg-surface pr-4"
              >
                {image ? (
                  <img
                    src={image.src}
                    alt=""
                    width={70}
                    height={70}
                    loading="lazy"
                    className="size-[70px] object-cover"
                  />
                ) : (
                  <span className="size-[70px] bg-surface-2" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-bold">{line.name}</span>
                  <span className="block text-sm text-sand">
                    Edição {EDITION_LABELS[line.editionKind]}
                  </span>
                </span>
                <span className="text-sm text-sand">(x {line.quantity})</span>
                <span className="text-lg font-bold text-primary-hi">
                  {formatEth(line.lineTotal)}
                </span>
              </li>
            )
          })}
        </ul>
      ) : null}
      <div className="mt-4">{coupon}</div>
      <div className="mt-4">
        {fallback ??
          (quote ? <CartSummary quote={quote} isLoading={false} /> : <CartSummarySkeleton />)}
      </div>
    </section>
  )
}
