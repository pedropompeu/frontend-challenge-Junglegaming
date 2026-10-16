import type { MouseEvent, ReactNode } from 'react'
import { Slot } from 'radix-ui'
import { toast } from 'sonner'
import { cn } from '@/shared/lib/utils'

export const UNAVAILABLE_MESSAGE = 'Indisponível nesta demonstração'

type UnavailableProps = {
  children: ReactNode
  /** Repassa as props ao filho (link, botão do Figma) em vez de renderizar um `<button>`. */
  asChild?: boolean
  /** Mensagem do toast; o padrão é {@link UNAVAILABLE_MESSAGE}. */
  label?: string
  className?: string
}

/**
 * Ação fora do escopo do desafio: continua visível como no Figma, mas marcada com
 * `aria-disabled` e, ao ser acionada, avisa por toast em vez de aparentar sucesso.
 */
export function Unavailable({ children, asChild = false, label, className }: UnavailableProps) {
  const Comp = asChild ? Slot.Root : 'button'
  const message = label ?? UNAVAILABLE_MESSAGE

  function handleClick(event: MouseEvent) {
    event.preventDefault()
    toast(message, { id: 'unavailable' })
  }

  return (
    <Comp
      {...(asChild ? {} : { type: 'button' as const })}
      aria-disabled="true"
      title={message}
      onClick={handleClick}
      className={cn('cursor-not-allowed', className)}
    >
      {children}
    </Comp>
  )
}
