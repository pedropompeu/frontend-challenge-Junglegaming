import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { useCatalogNavigation } from '../use-catalog-navigation'
import { FiltersSheet } from './filters-sheet'

const DEBOUNCE_MS = 300

/**
 * Campo de busca do catálogo. Digita localmente e grava `q` na URL (replace) após 300 ms
 * parado; se a URL mudar por fora (busca do header, "Limpar filtros"), o campo acompanha.
 */
export function SearchInput({ className }: { className?: string }) {
  const { search, setQuery } = useCatalogNavigation()
  const urlQ = search.q ?? ''
  const [value, setValue] = useState(urlQ)
  const [seenUrlQ, setSeenUrlQ] = useState(urlQ)
  // Último `q` gravado por este campo; a URL só sobrescreve o texto quando muda por fora.
  const [committed, setCommitted] = useState(urlQ)

  if (urlQ !== seenUrlQ) {
    setSeenUrlQ(urlQ)
    if (urlQ !== committed) {
      setCommitted(urlQ)
      setValue(urlQ)
    }
  }

  const commit = (next: string) => {
    setCommitted(next)
    void setQuery(next)
  }

  useEffect(() => {
    const next = value.trim().slice(0, 80)
    if (next === committed) return
    const t = setTimeout(() => {
      setCommitted(next)
      void setQuery(next)
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [value, committed, setQuery])

  return (
    <form
      role="search"
      className={cn('relative flex-1', className)}
      onSubmit={(e) => {
        e.preventDefault()
        commit(value.trim().slice(0, 80))
      }}
    >
      {/* Mobile: lupa de 22 px e placeholder 14 bold #B39463 a 42 px da borda, como no frame. */}
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-[22px] -translate-y-1/2 text-khaki md:left-4 md:size-5 md:text-sand"
      />
      <input
        type="search"
        name="q"
        aria-label="Buscar NFTs"
        placeholder="Explorar coleções"
        value={value}
        maxLength={80}
        onChange={(e) => setValue(e.target.value)}
        className="h-[45px] w-full rounded-[10px] bg-surface pr-4 pl-[42px] text-sm text-cream placeholder:font-bold placeholder:text-khaki md:h-12 md:rounded-[14px] md:pl-12 md:placeholder:font-normal md:placeholder:text-sand"
      />
    </form>
  )
}

/** Barra do topo da Início no mobile: busca + botão da gaveta de filtros. */
export function MobileSearch({ resultCount }: { resultCount?: number }) {
  return (
    <div className="flex items-center gap-2 md:hidden">
      <SearchInput />
      <FiltersSheet resultCount={resultCount} />
    </div>
  )
}
