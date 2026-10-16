import type { NftTab } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { GRID_ID } from './catalog-grid'

const TABS: Array<{ value: NftTab; label: string }> = [
  { value: 'all', label: 'Todos os NFTs' },
  { value: 'new', label: 'Novos lançamentos' },
  { value: 'trending', label: 'Em alta' },
]

/** Abas que filtram a grade; a aba ativa vive na URL (`tab`). */
export function CatalogTabs({
  value,
  onChange,
  className,
}: {
  value: NftTab
  onChange: (tab: NftTab) => void
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label="Seções do catálogo"
      className={cn('flex gap-6 md:gap-8', className)}
    >
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          aria-controls={GRID_ID}
          onClick={() => onChange(t.value)}
          className="border-b-2 border-transparent pb-1 text-sm whitespace-nowrap text-cream transition-colors hover:text-primary-hi aria-selected:border-primary aria-selected:font-bold aria-selected:text-primary-hi md:font-normal"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
