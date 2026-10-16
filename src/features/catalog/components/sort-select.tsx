import { useId } from 'react'
import type { NftSort } from '@/contracts'
import { cn } from '@/shared/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export const SORT_OPTIONS: Array<{ value: NftSort; label: string }> = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'newest', label: 'Listados recentemente' },
  { value: 'price-asc', label: 'Menor preço' },
  { value: 'price-desc', label: 'Maior preço' },
  { value: 'rating', label: 'Mais bem avaliados' },
]

export function SortSelect({
  value,
  onChange,
  className,
}: {
  value: NftSort
  onChange: (sort: NftSort) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <label htmlFor={id} className="text-sm whitespace-nowrap text-cream">
        Ordenar por:
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as NftSort)}>
        <SelectTrigger
          id={id}
          className="h-9 min-w-48 border-none bg-transparent text-sm text-cream shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
