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
      <p
        id="edition-label"
        className="text-[15px] font-bold md:text-base xl:text-[15px] xl:leading-5"
      >
        Edição:
      </p>
      <div
        role="group"
        aria-labelledby="edition-label"
        className="mt-2 flex flex-wrap gap-3 md:gap-2 xl:mt-[10.5px] xl:gap-[7px]"
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
                // Elipses do frame ("Ellipse 24–27"): 28 px no mobile, 27 no desktop; pílulas de 32 px entre os dois.
                'h-7 rounded-[50%] border border-line px-1.5 text-sm text-sand uppercase transition-colors md:h-8 md:rounded-full md:px-3 xl:h-[27px] xl:rounded-[50%] xl:px-[5px]',
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
