import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

/** Páginas visíveis: primeira, última e vizinhas da atual, com reticências nos buracos. */
export function pageWindow(current: number, total: number): Array<number | 'gap'> {
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: Array<number | 'gap'> = []
  for (const p of sorted) {
    const prev = out.at(-1)
    if (typeof prev === 'number' && p - prev > 1) out.push(p - prev === 2 ? p - 1 : 'gap')
    out.push(p)
  }
  return out
}

/** Trocar de página leva ao topo do catálogo (não ao hero), como o usuário espera de uma lista. */
function toCatalogTop() {
  document.getElementById('catalogo')?.scrollIntoView({ block: 'start' })
}

const cell =
  'grid size-9 place-items-center rounded-md border border-line-strong text-sm text-cream transition-colors hover:border-primary aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:font-bold aria-[current=page]:text-ink'

export function CatalogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="Paginação" className="mt-10 flex justify-end">
      <ul className="flex items-center gap-2">
        {page > 1 ? (
          <li>
            <Link
              from="/"
              to="/"
              resetScroll={false}
              onClick={toCatalogTop}
              search={(prev) => ({ ...prev, page: page - 1 })}
              className={cell}
              aria-label="Página anterior"
            >
              <ChevronLeftIcon aria-hidden="true" className="size-4" />
            </Link>
          </li>
        ) : null}
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'gap' ? (
            <li key={`gap-${i}`} aria-hidden="true" className="px-1 text-khaki">
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                from="/"
                to="/"
                resetScroll={false}
                onClick={toCatalogTop}
                search={(prev) => ({ ...prev, page: p })}
                className={cn(cell, 'tabular-nums')}
                aria-label={`Página ${p}`}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </Link>
            </li>
          ),
        )}
        {page < totalPages ? (
          <li>
            <Link
              from="/"
              to="/"
              resetScroll={false}
              onClick={toCatalogTop}
              search={(prev) => ({ ...prev, page: page + 1 })}
              className={cell}
              aria-label="Próxima página"
            >
              <ChevronRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  )
}
