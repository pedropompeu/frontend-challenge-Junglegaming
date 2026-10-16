import type { ReactNode } from 'react'
import { ShoppingCartIcon } from 'lucide-react'
import type { Edition } from '@/contracts'
import { EthPrice } from '@/shared/ui/eth-price'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'

type PurchaseBarProps = {
  nftName: string
  edition: Edition
  quantity: number
  max: number
  /** Unidades desta edição que já estão no carrinho. */
  inCart?: number
  /** Adição ao carrinho em andamento: os botões esperam. */
  isPending?: boolean
  onQuantityChange: (quantity: number) => void
  onBuy: () => void
  onAddToCart: () => void
  /** Botão de favoritar ao lado do CTA no desktop (Task 14). */
  favoriteSlot?: ReactNode
}

/**
 * Quantidade + compra. No mobile vira a barra fixa inferior do Figma (com o preço);
 * no desktop fica no fluxo, ao lado do botão de favoritar.
 */
export function PurchaseBar({
  nftName,
  edition,
  quantity,
  max,
  inCart = 0,
  isPending = false,
  onQuantityChange,
  onBuy,
  onAddToCart,
  favoriteSlot,
}: PurchaseBarProps) {
  const soldOut = edition.available === 0
  const allInCart = !soldOut && max < 1
  const blocked = soldOut || allInCart
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[32px] bg-surface px-6 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:static md:z-auto md:flex md:items-start md:justify-between md:gap-4 shadow-float md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="text-sm text-sand md:hidden">
              Qtd.
            </span>
            <QuantityStepper
              value={quantity}
              max={Math.max(1, max)}
              onChange={onQuantityChange}
              disabled={blocked}
              label={`Quantidade de ${nftName}`}
              look="detail"
            />
          </div>
          <p data-testid="edition-available" className="text-xs text-khaki">
            {soldOut
              ? 'Sem unidades disponíveis'
              : allInCart
                ? 'Todas as unidades já estão no seu carrinho'
                : `${edition.available} ${edition.available === 1 ? 'disponível' : 'disponíveis'}${inCart > 0 ? ` · ${inCart} no carrinho` : ''}`}
          </p>
        </div>
        <EthPrice
          value={edition.price}
          original={edition.originalPrice}
          size="lg"
          className="justify-end md:hidden"
        />
      </div>
      <div className="mt-4 flex items-center gap-3 md:mt-0">
        <button
          type="button"
          disabled={blocked || isPending}
          onClick={onBuy}
          className="h-14 flex-1 rounded-full cta-fill px-6 font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:flex-none md:rounded-md md:px-8 md:text-sm md:uppercase"
        >
          {soldOut ? 'Edição indisponível' : 'Comprar NFT'}
        </button>
        <button
          type="button"
          aria-label="Adicionar ao carrinho"
          disabled={blocked || isPending}
          onClick={onAddToCart}
          className="grid size-14 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-primary-hi transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-50 md:size-11 md:rounded-md"
        >
          <ShoppingCartIcon aria-hidden="true" className="size-5" />
        </button>
        {favoriteSlot ? <div className="hidden md:block">{favoriteSlot}</div> : null}
      </div>
    </div>
  )
}
