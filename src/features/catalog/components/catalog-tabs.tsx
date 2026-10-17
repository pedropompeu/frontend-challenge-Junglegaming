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
  // Frame mobile: 16 px entre as abas e a linha de 2 px colada ao texto (4,6 px abaixo da base).
  // Desktop: 15/500 em todas as abas; a ativa muda só de cor e ganha o sublinhado.
  return (
    <div
      role="tablist"
      aria-label="Seções do catálogo"
      className={cn('flex gap-4 md:gap-8 xl:gap-9', className)}
    >
      {TABS.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          aria-controls={GRID_ID}
          onClick={() => onChange(t.value)}
          className="border-b-2 border-transparent text-sm whitespace-nowrap text-cream transition-colors hover:text-primary-hi aria-selected:border-primary aria-selected:font-bold aria-selected:text-primary-hi md:pb-1 md:font-normal xl:text-[15px] xl:leading-5 xl:font-medium xl:aria-selected:font-medium"
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
