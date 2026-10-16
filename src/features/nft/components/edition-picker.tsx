import type { Edition } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { EDITION_LABELS } from '../editions'

type EditionPickerProps = {
  editions: Edition[]
  selectedId: string
  onSelect: (edition: Edition) => void
  className?: string
}

/** Chips de edição; esgotada fica desabilitada e com texto, sem depender só de cor. */
export function EditionPicker({ editions, selectedId, onSelect, className }: EditionPickerProps) {
  return (
    <div className={className}>
      <p id="edition-label" className="text-[15px] font-bold md:text-base">
        Edição:
      </p>
      <div
        role="group"
        aria-labelledby="edition-label"
        className="mt-2 flex flex-wrap gap-3 md:gap-2"
      >
        {editions.map((edition) => {
          const soldOut = edition.available === 0
          return (
            <button
              key={edition.id}
              type="button"
              aria-pressed={edition.id === selectedId}
              disabled={soldOut}
              onClick={() => onSelect(edition)}
              className={cn(
                // Mobile: as elipses de 28 px do frame ("Ellipse 25"); desktop: pílulas de 32 px.
                'h-7 rounded-[50%] border border-line px-1.5 text-sm text-sand uppercase transition-colors md:h-8 md:rounded-full md:px-3',
                'hover:border-primary-hi hover:text-cream aria-pressed:border-primary aria-pressed:font-medium aria-pressed:text-primary-hi',
                'disabled:cursor-not-allowed disabled:border-line disabled:text-khaki/70',
              )}
            >
              {EDITION_LABELS[edition.kind]}
              {soldOut ? <span className="ml-1 normal-case no-underline">· Esgotada</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
