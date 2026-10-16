import type { Quote } from '@/contracts'
import { formatEth } from '@/shared/lib/money'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

type StaleQuoteDialogProps = {
  change: { before: Quote; after: Quote } | null
  /** Aceita os valores novos: a revisão passa a usar a cotação nova e pede outro clique. */
  onReview: () => void
}

const ROWS = [
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'discount', label: 'Desconto' },
  { key: 'networkFee', label: 'Taxa de rede' },
  { key: 'total', label: 'Total' },
] as const

/** 409 `QUOTE_STALE`: mostra antes/depois e só segue quando o usuário revisa de novo. */
export function StaleQuoteDialog({ change, onReview }: StaleQuoteDialogProps) {
  return (
    <Dialog open={change !== null} onOpenChange={(open) => (open ? undefined : onReview())}>
      {change ? (
        <DialogContent showCloseButton={false} className="border-line-strong bg-ink">
          <DialogHeader>
            <DialogTitle>Os valores mudaram</DialogTitle>
            <DialogDescription className="text-sand">
              O preço, o cupom ou a taxa mudaram desde a sua revisão. Confira antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-sand">
                <th scope="col" className="py-1 font-normal">
                  <span className="sr-only">Valor</span>
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Antes
                </th>
                <th scope="col" className="py-1 text-right font-normal">
                  Agora
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(({ key, label }) => {
                const changed = change.before[key] !== change.after[key]
                return (
                  <tr key={key} className={changed ? 'font-bold' : undefined}>
                    <th scope="row" className="py-1 text-left font-normal">
                      {label}
                    </th>
                    <td className="py-1 text-right text-sand">{formatEth(change.before[key])}</td>
                    <td className="py-1 text-right text-primary-hi">
                      {formatEth(change.after[key])}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <DialogFooter>
            <button
              type="button"
              onClick={onReview}
              className="h-11 rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
            >
              Revisar novamente
            </button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
