import type { ReactNode } from 'react'
import type { Quote } from '@/contracts'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { CartSummarySkeleton } from './cart-summary-skeleton'

type CartSummaryProps = { quote: Quote | undefined; isLoading: boolean }

/** Totais do carrinho, sempre os da cotação do servidor (nada é somado no cliente). */
export function CartSummary({ quote, isLoading }: CartSummaryProps) {
  if (isLoading || !quote) return <CartSummarySkeleton />
  const discountLabel = quote.coupon
    ? `Desconto do lançamento (${quote.coupon.percentOff}%)`
    : 'Desconto do lançamento'
  return (
    <SummaryList>
      <SummaryRow label="Subtotal" testId="summary-subtotal">
        {formatEth(quote.subtotal)}
      </SummaryRow>
      <SummaryRow label={discountLabel} testId="summary-discount">
        (-) {formatEth(quote.discount)}
      </SummaryRow>
      <SummaryRow label="Taxa de rede" testId="summary-fee" note="Taxa estimada">
        {formatEth(quote.networkFee)}
      </SummaryRow>
      <SummaryRow label="Total" testId="summary-total" total>
        {formatEth(quote.total)}
      </SummaryRow>
    </SummaryList>
  )
}

export function SummaryList({ children }: { children: ReactNode }) {
  return <dl className="grid gap-3 text-[15px]">{children}</dl>
}

export function SummaryRow({
  label,
  testId,
  note,
  total = false,
  children,
}: {
  label: string
  testId?: string
  note?: string
  total?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', total && 'mt-3')}>
      <dt className={cn(total && 'font-bold')}>{label}</dt>
      <dd className="flex min-h-7 flex-col items-end text-right">
        <span data-testid={testId} className={cn('text-lg', total && 'font-bold text-primary-hi')}>
          {children}
        </span>
        {note ? <span className="text-xs text-primary-hi">{note}</span> : null}
      </dd>
    </div>
  )
}
