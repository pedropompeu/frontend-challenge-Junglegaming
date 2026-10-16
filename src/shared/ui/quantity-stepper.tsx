import { MinusIcon, PlusIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

type QuantityStepperProps = {
  value: number
  min?: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
  /** Rótulo do grupo, ex.: "Quantidade de Emerald Ape #042". */
  label: string
  className?: string
}

const stepButton =
  'grid size-7 place-items-center rounded-full border border-line bg-surface-2 text-cream transition-colors hover:bg-line disabled:cursor-not-allowed disabled:opacity-40'

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  label,
  className,
}: QuantityStepperProps) {
  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(min, max))
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-3', className)}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        className={stepButton}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>
      <output aria-live="polite" className="min-w-6 text-center tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        className={stepButton}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  )
}
