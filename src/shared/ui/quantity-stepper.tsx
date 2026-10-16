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
  /** Formato do frame: o detalhe usa pílulas nos dois breakpoints; o carrinho, só na tabela desktop. */
  look: 'detail' | 'cart'
  className?: string
}

// O `after` estende o alvo de toque das pílulas de 20 px para 36 × 46 sem mudar o desenho.
const stepButton =
  'relative grid place-items-center rounded-full border transition-[opacity,background-color] after:absolute after:-inset-2 disabled:cursor-not-allowed disabled:opacity-40'
const pill = 'border-ink bg-primary text-ink shadow-step hover:opacity-90'

const looks = {
  detail: {
    group: 'gap-3',
    button: `h-[30px] w-5 md:h-[49.5px] md:w-[33px] ${pill}`,
    icon: 'size-4 md:size-6.5',
    value: 'text-lg font-medium md:text-xl md:font-normal',
  },
  // O card mobile do frame usa círculos `surface-2` de 23 px + o contorno centrado (A-035), com 57 px
  // entre os centros; a tabela desktop, as pílulas.
  cart: {
    group: 'gap-1 md:gap-3',
    button:
      'size-6 border-line bg-surface-2 text-cream hover:bg-line md:h-[30px] md:w-5 md:border-ink md:bg-primary md:text-ink md:shadow-step md:hover:bg-primary md:hover:opacity-90',
    icon: 'size-4',
    value: 'md:text-[17px]',
  },
} as const

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  label,
  look,
  className,
}: QuantityStepperProps) {
  const { group, button, icon, value: valueClass } = looks[look]
  const clamp = (n: number) => Math.min(Math.max(n, min), Math.max(min, max))
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center', group, className)}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        className={cn(stepButton, button)}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
      >
        <MinusIcon aria-hidden="true" className={icon} />
      </button>
      <output aria-live="polite" className={cn('min-w-6 text-center tabular-nums', valueClass)}>
        {value}
      </output>
      <button
        type="button"
        aria-label="Aumentar quantidade"
        className={cn(stepButton, button)}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
      >
        <PlusIcon aria-hidden="true" className={icon} />
      </button>
    </div>
  )
}
