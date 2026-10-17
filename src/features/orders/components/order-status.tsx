import { useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { Order } from '@/contracts'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle } from '@/shared/ui/dialog'
import { OrderDeclined } from './order-declined'
import { OrderPending } from './order-pending'
import { OrderReceipt } from './order-receipt'

/** Anunciado quando o resultado chega com a página aberta (vazio enquanto pendente). */
const ANNOUNCEMENTS: Record<Order['status'], string> = {
  pending: '',
  confirmed: 'Pagamento confirmado. Seus NFTs estão na sua carteira.',
  declined: 'Pagamento recusado.',
}

/**
 * Tela do pedido por status. A confirmação só aparece com `confirmed` vindo do servidor;
 * pendente e recusado nunca mostram recibo.
 */
export function OrderStatus({ order }: { order: Order }) {
  let view
  if (order.status === 'confirmed') view = <OrderConfirmed order={order} />
  else if (order.status === 'declined') view = <OrderDeclined order={order} />
  else view = <OrderPending order={order} />
  return (
    <>
      <p aria-live="polite" className="sr-only">
        {ANNOUNCEMENTS[order.status]}
      </p>
      {view}
    </>
  )
}

/** Recibo em modal sobre o fundo no desktop (como no Figma) e em página no mobile. */
function OrderConfirmed({ order }: { order: Order }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(open) => !open && void navigate({ to: '/' })}>
        <DialogPortal>
          {/* O BG #140D0A do frame cobre a página e rola com o recibo, que começa em y 166. */}
          <DialogOverlay className="overflow-y-auto bg-ink">
            <DialogPrimitive.Content
              ref={contentRef}
              aria-describedby={undefined}
              // Foco no próprio recibo: o leitor de tela anuncia o título antes do botão do rodapé,
              // e o fundo não rola (o recibo abre pelo topo, como no frame).
              onOpenAutoFocus={(event) => {
                event.preventDefault()
                contentRef.current?.focus({ preventScroll: true })
              }}
              className="relative mx-auto mt-[166px] mb-10 w-[578px] bg-surface text-cream outline-none"
            >
              <DialogTitle asChild>
                <h1 className="sr-only">Pedido confirmado</h1>
              </DialogTitle>
              <OrderReceipt order={order} />
              <DialogClose className="absolute top-4 right-4 rounded-xs p-1 text-primary transition-colors hover:text-primary-hi">
                <XIcon aria-hidden="true" className="size-5" />
                <span className="sr-only">Fechar</span>
              </DialogClose>
            </DialogPrimitive.Content>
          </DialogOverlay>
        </DialogPortal>
      </Dialog>
    )
  }

  return (
    <article aria-labelledby="order-title" className="grid gap-6">
      <h1 id="order-title" className="sr-only">
        Pedido confirmado
      </h1>
      <OrderReceipt order={order} />
      <Link to="/" hash="catalogo" className="mx-auto font-bold text-primary-hi hover:underline">
        Continuar explorando
      </Link>
    </article>
  )
}
