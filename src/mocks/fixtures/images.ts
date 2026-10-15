import type { NftImage } from '@/contracts'

/** As 4 ilustrações do Figma e as variações de tom geradas por scripts/extract_assets.py. */
const BASES = [
  'Macaco de pelo castanho com óculos redondos verdes e jaqueta college verde',
  'Macaco de pelo dourado com fones de ouvido verdes e jaqueta creme',
  'Macaco de pelo preto com gola alta verde e blazer creme',
  'Macaco de pelo grisalho com chapéu bucket verde e moletom lilás',
] as const

const TONES = ['tons originais', 'tons âmbar', 'tons frios', 'tons noturnos'] as const

export const IMAGE_COUNT = BASES.length * TONES.length

/** Imagem n (0..15): base = n % 4, tom = floor(n / 4). */
export function nftImage(n: number): NftImage {
  const i = ((n % IMAGE_COUNT) + IMAGE_COUNT) % IMAGE_COUNT
  const base = BASES[i % BASES.length]!
  const tone = TONES[Math.floor(i / BASES.length)]!
  return {
    src: `/assets/nfts/${i + 1}-800.webp`,
    alt: `${base}, em ${tone}`,
    width: 800,
    height: 800,
  }
}
