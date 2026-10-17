import type { ReactNode } from 'react'
import type { Quote } from '@/contracts'
import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { CartSummarySkeleton } from './cart-summary-skeleton'

type CartSummaryProps = {
  quote: Quote | undefined
  isLoading: boolean
  /** O frame do Pagamento (e não o do Carrinho) separa o Total das taxas com a divisória. */
  dividedTotal?: boolean
}

/** Totais do carrinho, sempre os da cotação do servidor (nada é somado no cliente). */
export function CartSummary({ quote, isLoading, dividedTotal = false }: CartSummaryProps) {
  if (isLoading || !quote) return <CartSummarySkeleton />
  const discountLabel = quote.coupon
    ? `Desconto do lançamento (${quote.coupon.percentOff}%)`
    : 'Desconto do lançamento'
  return (
    <SummaryList>
      <SummaryRow label="Subtotal" testId="summary-subtotal">
        {formatEth(quote.subtotal)}
      </SummaryRow>
      <SummaryRow label={discountLabel} testId="summary-discount" labelSized>
        (-) {formatEth(quote.discount)}
      </SummaryRow>
      <SummaryRow label="Taxa de rede" testId="summary-fee" note="Taxa estimada">
        {formatEth(quote.networkFee)}
      </SummaryRow>
      <SummaryRow label="Total" testId="summary-total" total divided={dividedTotal}>
        {formatEth(quote.total)}
      </SummaryRow>
    </SummaryList>
  )
}

export function SummaryList({ children }: { children: ReactNode }) {
  // Linhas de 28 px com 4 px entre elas: o passo de 32 px dos frames.
  return <dl className="grid gap-1 text-[15px]">{children}</dl>
}

export function SummaryRow({
  label,
  testId,
  note,
  total = false,
  divided = false,
  labelSized = false,
  children,
}: {
  label: string
  testId?: string
  note?: string
  total?: boolean
  divided?: boolean
  /** Valor no tamanho do rótulo (15 px), como o desconto nos frames. */
  labelSized?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4',
        // Desktop: a nota e o Total descem para as linhas de base do frame; no Pagamento a
        // divisória fica a ~44 px da Taxa e o Total, a ~26 px da divisória.
        total && 'md:mt-[15px]',
        divided && 'md:mt-1 md:border-t md:border-divider md:pt-2',
      )}
    >
      <dt className={cn('md:leading-7', total && 'text-base font-bold')}>{label}</dt>
      <dd className="flex min-h-7 flex-col items-end text-right">
        <span
          data-testid={testId}
          className={cn(
            // No mobile, Subtotal e Taxa ficam em 16 (o Total segue 18); no desktop, todos em 18.
            labelSized ? 'leading-7' : total ? 'text-lg' : 'text-base leading-7 md:text-lg',
            total && 'font-bold text-primary-hi',
          )}
        >
          {children}
        </span>
        {note ? <span className="text-xs text-primary-hi md:mt-2">{note}</span> : null}
      </dd>
    </div>
  )
}
