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
    />
  )

  return (
    <li className="relative grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 overflow-hidden rounded-[20px] bg-surface pr-12 [grid-template-areas:'img_info'_'img_price'_'img_qty'] md:grid-cols-[70px_minmax(0,1fr)_110px_150px_110px_44px] md:items-center md:gap-x-4 md:rounded-none md:pr-4 md:[grid-template-areas:'img_info_price_qty_total_remove']">
      <Link
        to="/nft/$nftId"
        params={{ nftId: item.nftId }}
        tabIndex={-1}
        aria-hidden="true"
        className="row-span-3 [grid-area:img] md:row-span-1"
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
      <div className="flex min-w-0 flex-col gap-1 pt-3 [grid-area:info] md:pt-0">
        <h3 className="truncate text-[15px] font-bold">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-primary-hi">
            {item.name}
          </Link>
        </h3>
        <p className="text-sm text-sand">Edição: {EDITION_LABELS[item.editionKind]}</p>
        {notices.length > 0 ? (
          <ul aria-label="Mudanças recentes" className="flex flex-wrap gap-1.5">
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
      <EthPrice value={item.unitPrice} className="[grid-area:price]" />
      <div className="pt-1 pb-3 [grid-area:qty] md:py-0">
        {stepper}
        {warning ? (
          <p role="alert" className="mt-1 text-xs font-bold text-coral">
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
