import { formatEth } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'

const SIZES = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
} as const

type EthPriceProps = {
  value: string
  /** Preço anterior (riscado) quando houve desconto ou mudança de preço. */
  original?: string | null
  size?: keyof typeof SIZES
  className?: string
}

/**
 * Preço em ETH. O texto visível fica `aria-hidden` e o leitor de tela recebe a frase
 * completa ("1.19 ETH, antes 1.5 ETH"), já que um `span` genérico não pode ter `aria-label`.
 */
export function EthPrice({ value, original, size = 'md', className }: EthPriceProps) {
  const current = formatEth(value)
  const before = original ? formatEth(original) : null
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <span className="sr-only">{before ? `${current}, antes ${before}` : current}</span>
      <span
        aria-hidden="true"
        className={cn('font-bold whitespace-nowrap text-primary-hi', SIZES[size])}
      >
        {current}
      </span>
      {before ? (
        <s aria-hidden="true" className="text-sm whitespace-nowrap text-khaki">
          {before}
        </s>
      ) : null}
    </span>
  )
}
