import { SkeletonShimmer } from '@/shared/ui/skeleton-shimmer'
import { SummaryList, SummaryRow } from './cart-summary'

/** Mesmas linhas e alturas do resumo: os valores entram sem a coluna pular. */
export function CartSummarySkeleton() {
  return (
    <div data-testid="cart-summary-skeleton" aria-busy="true">
      <span className="sr-only">Calculando o resumo</span>
      <SummaryList>
        <SummaryRow label="Subtotal">
          <SkeletonShimmer className="mt-1 h-5 w-24" />
        </SummaryRow>
        <SummaryRow label="Desconto do lançamento">
          <SkeletonShimmer className="mt-1 h-5 w-20" />
        </SummaryRow>
        <SummaryRow label="Taxa de rede" note="Taxa estimada">
          <SkeletonShimmer className="mt-1 h-5 w-20" />
        </SummaryRow>
        <SummaryRow label="Total" total>
          <SkeletonShimmer className="mt-1 h-5 w-28" />
        </SummaryRow>
      </SummaryList>
    </div>
  )
}
