import { SlidersHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet'
import { useCatalogNavigation } from '../use-catalog-navigation'
import { FiltersPanel } from './filters-panel'
import { SortSelect } from './sort-select'

/** Gaveta de filtros do mobile; o Radix prende o foco e o devolve ao botão ao fechar. */
export function FiltersSheet({ resultCount }: { resultCount?: number }) {
  const [open, setOpen] = useState(false)
  const { search, setFilters, clearFilters } = useCatalogNavigation()
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-primary-hi to-primary text-ink">
        <SlidersHorizontalIcon aria-hidden="true" className="size-5" />
        <span className="sr-only">Filtros</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-[28px] border-line bg-ink">
        <SheetHeader>
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>Os resultados atualizam a cada escolha.</SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4">
          <SortSelect
            value={search.sort}
            onChange={(sort) => setFilters({ sort })}
            className="mb-6"
          />
          <FiltersPanel search={search} onChange={setFilters} />
        </div>
        <SheetFooter className="flex-row gap-3">
          <button
            type="button"
            onClick={clearFilters}
            className="h-11 flex-1 rounded-md border border-line-strong text-sm text-cream"
          >
            Limpar filtros
          </button>
          <SheetClose className="h-11 flex-1 rounded-md bg-primary text-sm font-bold text-ink">
            Ver resultados
            {resultCount !== undefined ? <span className="sr-only"> ({resultCount})</span> : null}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
