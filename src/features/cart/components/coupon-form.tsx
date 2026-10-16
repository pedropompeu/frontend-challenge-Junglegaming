import { useId, useState, type FormEvent } from 'react'
import { XIcon } from 'lucide-react'
import { useApplyCoupon } from '@/features/quote/queries'
import { announce } from '@/shared/lib/announce'
import { errorMessage, isApiError } from '@/shared/lib/api-error'
import { cn } from '@/shared/lib/utils'

type CouponFormProps = {
  /** Cupom já aceito pelo servidor (vem das preferências). */
  appliedCode: string | null
  onRemove: () => void
  className?: string
}

/** Código promocional: validado pelo servidor via `POST /quotes` antes de ficar salvo. */
export function CouponForm({ appliedCode, onRemove, className }: CouponFormProps) {
  const id = useId()
  const apply = useApplyCoupon()
  const [code, setCode] = useState('')
  const [emptyError, setEmptyError] = useState(false)
  const serverError = apply.error
    ? (isApiError(apply.error) && apply.error.fieldErrors?.couponCode) || errorMessage(apply.error)
    : null
  const error = emptyError ? 'Digite um código promocional' : serverError

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!code.trim()) {
      setEmptyError(true)
      return
    }
    setEmptyError(false)
    apply.mutate(code, {
      onSuccess: (quote) => {
        setCode('')
        announce(`Cupom ${quote.coupon?.code ?? ''} aplicado`)
      },
    })
  }

  if (appliedCode) {
    return (
      <div className={cn('flex items-center justify-between gap-3', className)}>
        <p className="text-sm">
          <span className="font-bold text-primary-hi">{appliedCode}</span> aplicado
        </p>
        <button
          type="button"
          onClick={() => {
            apply.reset()
            onRemove()
          }}
          className="inline-flex items-center gap-1 text-sm text-sand hover:text-primary-hi"
        >
          <XIcon aria-hidden="true" className="size-4" />
          Remover cupom
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} noValidate className={className}>
      <label htmlFor={`${id}-code`} className="mb-2 block text-sm font-bold max-md:sr-only">
        Código promocional
      </label>
      <div className="flex">
        <input
          id={`${id}-code`}
          name="couponCode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="Digite o código promocional..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="h-11 min-w-0 flex-1 rounded-l-full border border-line-strong bg-transparent px-4 text-sm placeholder:text-khaki aria-invalid:border-coral md:rounded-l-md md:border-primary"
        />
        <button
          type="submit"
          disabled={apply.isPending}
          className="h-11 rounded-r-full bg-gradient-to-r from-primary-hi to-primary px-6 text-sm font-bold text-ink disabled:opacity-60 md:rounded-r-md"
        >
          {apply.isPending ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-bold text-coral">
          {error}
        </p>
      ) : null}
    </form>
  )
}
