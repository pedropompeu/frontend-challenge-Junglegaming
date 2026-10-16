import type { Edition, EditionKind } from '@/contracts'

export const EDITION_LABELS: Record<EditionKind, string> = {
  '1/10': '1/10',
  '1/50': '1/50',
  open: 'Aberta',
}

/** Edição da URL quando existe; senão a primeira com estoque; senão a primeira (esgotada). */
export function selectEdition(editions: Edition[], editionId: string | undefined): Edition {
  return (
    editions.find((e) => e.id === editionId) ??
    editions.find((e) => e.available > 0) ??
    editions[0]!
  )
}
