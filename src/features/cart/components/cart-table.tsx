import type { CartItem, Quote } from '@/contracts'
import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'
import { CartItemRow } from './cart-item-row'

type CartTableProps = { items: CartItem[]; quote: Quote | undefined }

const HEAD = 'text-[15px] font-bold'

/** Lista do carrinho com o cabeçalho de colunas do Figma no desktop. */
export function CartTable({ items, quote }: CartTableProps) {
  return (
    <div>
      {/* Liga o h1 da página aos h3 dos itens: sem ele a hierarquia salta um nível. */}
      <h2 className="sr-only">Itens do carrinho</h2>
      <div
        aria-hidden="true"
        className="hidden grid-cols-[70px_minmax(0,1fr)_110px_150px_110px_44px] gap-x-4 border-b border-line pr-4 pb-3 md:grid"
      >
        <span className={`${HEAD} col-span-2`}>NFTs</span>
        <span className={HEAD}>Preço</span>
        <span className={HEAD}>Quantidade</span>
        <span className={HEAD}>Total</span>
      </div>
      <ul aria-label="Itens do carrinho" className="grid gap-3 md:mt-3">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            line={quote?.lines.find((l) => l.cartItemId === item.id)}
          />
        ))}
      </ul>
    </div>
  )
}

export function CartTableSkeleton() {
  return (
    <div aria-hidden="true" className="grid gap-3 md:mt-[42px]">
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="flex gap-3 overflow-hidden rounded-[20px] bg-surface md:rounded-none"
        >
          <SkeletonShimmer className="size-24 rounded-none md:size-[70px]" />
          <div className="flex flex-1 flex-col justify-center gap-2 py-3">
            <SkeletonShimmer className="h-4 w-1/2" />
            <SkeletonShimmer className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
