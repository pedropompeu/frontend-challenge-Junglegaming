import { Link } from '@tanstack/react-router'
import { Trash2Icon } from 'lucide-react'
import type { CartItem, QuoteLine } from '@/contracts'
import { EDITION_LABELS } from '@/features/nft/editions'
import { EthPrice } from '@/shared/ui/eth-price'
import { QuantityStepper } from '@/shared/ui/quantity-stepper'
import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'
import { CART_LINE_NOTICE_LABELS, clearCartLineNotice, useCartLineNotices } from '../line-notices'
import {
  availabilityMessage,
  conflictAvailable,
  isAvailabilityConflict,
  useRemoveCartItem,
  useUpdateCartItem,
} from '../queries'

type CartItemRowProps = {
  item: CartItem
  /** Linha da cotação deste item; o total da linha só aparece quando bate com o item. */
  line: QuoteLine | undefined
}

/** Item do carrinho: cartão no mobile, linha da tabela (grid) no desktop. */
export function CartItemRow({ item, line }: CartItemRowProps) {
  const update = useUpdateCartItem(item.id)
  const remove = useRemoveCartItem(item.id)
  const notices = useCartLineNotices(item.id)
  const conflict = isAvailabilityConflict(update.error)
  const overStock = item.quantity > item.available
  const warning =
    conflict || overStock
      ? availabilityMessage(conflictAvailable(update.error) ?? item.available)
      : null
  const lineMatches =
    line?.quantity === item.quantity && line.unitPrice === item.unitPrice ? line : null

  const stepper = (
    <QuantityStepper
      value={item.quantity}
      // O teto é o estoque: acima dele o servidor recusa, então o "−" vai direto ao que resta.
      max={Math.max(item.available, 1)}
      disabled={item.available === 0}
      onChange={(q) => {
        clearCartLineNotice(item.id)
        update.mutate(q)
      }}
      label={`Quantidade de ${item.name}`}
      look="cart"
      className="[grid-area:qty]"
    />
  )

  return (
    // Mobile: o card de 100 px do frame, com o stepper na linha do preço (a lixeira fica no canto
    // de cima, onde o frame a sobrepõe ao "+"). Desktop: a linha da tabela.
    <li className="relative mx-1 grid min-h-[100px] grid-cols-[100px_minmax(0,1fr)_auto] items-center gap-x-[9px] overflow-hidden rounded-[14px] bg-surface pr-4 shadow-card [grid-template-areas:'img_info_info'_'img_price_qty'_'img_warn_warn'] md:mx-0 md:min-h-0 md:grid-cols-[70px_minmax(0,1fr)_110px_150px_110px_44px] md:gap-x-4 md:rounded-none md:shadow-none md:[grid-template-areas:'img_info_price_qty_total_remove']">
      <Link
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
        tabIndex={-1}
        aria-hidden="true"
        className="row-span-3 self-stretch [grid-area:img] md:row-span-1 md:self-center"
      >
        <img
          src={item.image.src}
          alt=""
          width={item.image.width}
          height={item.image.height}
          loading="lazy"
          className="size-full object-cover md:size-[70px]"
        />
      </Link>
      <div className="flex min-w-0 flex-col pt-2.5 pr-8 [grid-area:info] md:gap-1 md:pt-0 md:pr-0">
        <h3 className="truncate text-[15px] font-bold">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-primary-hi">
            {item.name}
          </Link>
        </h3>
        <p className="text-sm text-sand">Edição: {EDITION_LABELS[item.editionKind]}</p>
        {notices.length > 0 ? (
          <ul aria-label="Mudanças recentes" className="flex flex-wrap gap-1.5 max-md:mt-1">
            {notices.map((kind) => (
              <li
                key={kind}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-bold text-primary-hi"
              >
                {CART_LINE_NOTICE_LABELS[kind]}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <EthPrice
        value={item.unitPrice}
        className="my-[9.5px] [grid-area:price] md:my-0"
        amountClassName="text-lg md:text-base"
      />
      {/* No mobile o stepper e o aviso viram itens do grid (linha do preço e linha de baixo). */}
      <div className="contents md:block md:[grid-area:qty]">
        {stepper}
        {warning ? (
          <p
            role="alert"
            className="mb-2.5 text-xs font-bold text-coral [grid-area:warn] md:mt-1 md:mb-0"
          >
            {warning}
          </p>
        ) : null}
      </div>
      <div className="hidden [grid-area:total] md:block">
        {lineMatches ? (
          <EthPrice value={lineMatches.lineTotal} />
        ) : (
          <SkeletonShimmer className="h-5 w-20" />
        )}
      </div>
      <button
        type="button"
        aria-label={`Remover ${item.name} do carrinho`}
        disabled={remove.isPending}
        onClick={() => {
          clearCartLineNotice(item.id)
          remove.mutate()
        }}
        className="absolute top-2 right-2 grid size-10 place-items-center rounded-md text-primary-hi hover:bg-surface-2 disabled:opacity-50 md:static md:[grid-area:remove]"
      >
        <Trash2Icon aria-hidden="true" className="size-5" />
      </button>
    </li>
  )
}
