import Big from 'big.js'
import type { Edition, EditionKind, Network, Nft, Rarity } from '@/contracts'
import { mulberry32 } from '../db/prng'
import { CATEGORIES } from './categories'
import { COLLECTIONS } from './collections'
import { nftImage } from './images'

const NAMES = [
  'Neon Vessel',
  'Brisa de Cobre',
  'Rei do Asfalto',
  'Eco Dourado',
  'Lua de Jade',
  'Sopro Âmbar',
  'Ritmo Selvagem',
  'Guardião Lilás',
  'Vinil Eterno',
  'Sombra Verde',
  'Coroa de Musgo',
  'Pulso Urbano',
  'Maré Noturna',
  'Chama Serena',
  'Bambu Elétrico',
  'Faísca Rara',
  'Sax ao Luar',
  'Trilha de Ouro',
  'Monge Digital',
  'Grafite Vivo',
  'Néctar Solar',
  'Raiz Profunda',
  'Fumaça Azul',
  'Dínamo Gentil',
  'Velho Sábio',
  'Jazz de Bolso',
  'Pedra Fundamental',
  'Aurora Cítrica',
  'Bruma Rosa',
  'Totem Moderno',
  'Mestre do Groove',
  'Selo Imperial',
  'Garoa Fina',
  'Pixel Ancestral',
  'Fera Mansa',
  'Baile de Máscaras',
  'Cânion Sonoro',
  'Lenda Urbana',
  'Orvalho Neon',
  'Farol Tropical',
  'Cacau Cósmico',
  'Bússola Antiga',
  'Vento Norte',
  'Caderno de Rimas',
  'Ponte de Vidro',
  'Último Acorde',
  'Cartógrafo',
  'Relicário',
  'Mosaico Vivo',
  'Andarilho',
] as const

const NETWORKS: Network[] = ['ethereum', 'polygon', 'solana']
const FUNDOS = ['Creme', 'Sálvia', 'Areia', 'Menta', 'Terracota']
const ROUPAS = ['Jaqueta college', 'Blazer creme', 'Moletom lilás', 'Bomber creme', 'Gola alta']
const ACESSORIOS = [
  'Óculos redondos',
  'Fones de ouvido',
  'Chapéu bucket',
  'Brinco de ouro',
  'Corrente de jade',
]
const EXPRESSOES = ['Sereno', 'Confiante', 'Pensativo', 'Sorridente', 'Desconfiado']

function slug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function money(v: Big): string {
  const s = v.round(4, Big.roundHalfUp).toFixed()
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

const BASE_DATE = Date.parse('2026-10-01T00:00:00.000Z')
const DAY = 86_400_000

export function buildNfts(): Nft[] {
  const rand = mulberry32(42)
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)]!
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

  return NAMES.map((name, i): Nft => {
    const id = `nft_${slug(name)}`
    const collection = COLLECTIONS[i % COLLECTIONS.length]!
    // Fora do `rand()` para não mudar o resto dos dados gerados; 7 é coprimo de 9.
    const category = CATEGORIES[(i * 7) % CATEGORIES.length]!.id
    const network = NETWORKS[i % NETWORKS.length]!
    // Preço da edição aberta entre 0.05 e 2 ETH; 1/50 = 2.5×; 1/10 = 6×.
    const openPrice = new Big(0.05 + rand() * 1.95)
    const kindsPattern: EditionKind[][] = [
      ['1/10', '1/50', 'open'],
      ['1/10', '1/50', 'open'],
      ['1/10', 'open'],
      ['1/50', 'open'],
      ['open'],
    ]
    const kinds = i === 0 ? kindsPattern[0]! : kindsPattern[int(0, kindsPattern.length - 1)]!
    const editions: Edition[] = kinds.map((kind) => {
      const factor = kind === '1/10' ? 6 : kind === '1/50' ? 2.5 : 1
      const supply = kind === '1/10' ? 10 : kind === '1/50' ? 50 : null
      return {
        id: `ed_${slug(name)}_${kind === 'open' ? 'open' : kind.replace('/', '-')}`,
        kind,
        price: money(openPrice.times(factor)),
        originalPrice: null,
        supply,
        available: supply === null ? int(120, 900) : int(2, supply),
      }
    })
    // Variedade obrigatória: esgotados e preços promocionais.
    if (i % 11 === 3) editions[0]!.available = 0
    if (i % 9 === 4) {
      const e = editions[editions.length - 1]!
      e.originalPrice = money(new Big(e.price).times(1.25))
    }
    const rarity: Rarity = kinds.includes('1/10') ? (i % 7 === 0 ? 'legendary' : 'rare') : 'common'
    const base = i % 4
    const tone = Math.floor(i / 4) % 4
    const main = base + tone * 4
    const nft: Nft = {
      id,
      name,
      description: `${name} faz parte da coleção ${collection.name}: uma peça ilustrada à mão, cunhada na rede ${
        network === 'ethereum' ? 'Ethereum' : network === 'polygon' ? 'Polygon' : 'Solana'
      }, com atributos únicos e edições limitadas para colecionadores.`,
      collectionId: collection.id,
      collectionName: collection.name,
      category,
      network,
      rarity,
      images: [
        nftImage(main),
        nftImage(base + ((tone + 1) % 4) * 4),
        nftImage(base + ((tone + 2) % 4) * 4),
      ],
      rating: Math.round((3.6 + rand() * 1.4) * 10) / 10,
      reviewsCount: int(0, 64),
      tokenId: `#${String(1000 + i * 37).padStart(4, '0')}`,
      attributes: [
        { trait: 'Fundo', value: pick(FUNDOS) },
        { trait: 'Roupa', value: pick(ROUPAS) },
        { trait: 'Acessório', value: pick(ACESSORIOS) },
        { trait: 'Expressão', value: pick(EXPRESSOES) },
      ],
      editions,
      createdAt: new Date(BASE_DATE - int(0, 60) * DAY).toISOString(),
      trendingScore: int(0, 100),
      version: 1,
    }
    if (i === 0) {
      nft.rating = 4.8
      nft.reviewsCount = 19
      nft.trendingScore = 95
      nft.createdAt = new Date(BASE_DATE - 3 * DAY).toISOString()
    }
    return nft
  })
}
