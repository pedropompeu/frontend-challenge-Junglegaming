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
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-sand"
      />
      <input
        type="search"
        name="q"
        aria-label="Buscar NFTs"
        placeholder="Explorar coleções"
        value={value}
        maxLength={80}
        onChange={(e) => setValue(e.target.value)}
        className="h-12 w-full rounded-[14px] bg-surface pr-4 pl-12 text-sm text-cream placeholder:text-sand"
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
