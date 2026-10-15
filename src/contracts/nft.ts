import { z } from 'zod'
import { EthAmountSchema, IdSchema, IsoDateSchema, NetworkSchema } from './common'

export const EditionKindSchema = z.enum(['1/10', '1/50', 'open'])
export type EditionKind = z.infer<typeof EditionKindSchema>

export const EditionSchema = z.object({
  id: IdSchema,
  kind: EditionKindSchema,
  price: EthAmountSchema,
  originalPrice: EthAmountSchema.nullable(),
  supply: z.number().int().positive().nullable(),
  available: z.number().int().min(0),
})
export type Edition = z.infer<typeof EditionSchema>

export const NftImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})
export type NftImage = z.infer<typeof NftImageSchema>

export const RaritySchema = z.enum(['common', 'rare', 'legendary'])
export type Rarity = z.infer<typeof RaritySchema>

export const NftSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  description: z.string(),
  collectionId: IdSchema,
  collectionName: z.string(),
  network: NetworkSchema,
  rarity: RaritySchema,
  images: z.array(NftImageSchema).min(1),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),
  tokenId: z.string(),
  attributes: z.array(z.object({ trait: z.string(), value: z.string() })),
  editions: z.array(EditionSchema).min(1),
  createdAt: IsoDateSchema,
  trendingScore: z.number(),
  version: z.number().int().min(0),
})
export type Nft = z.infer<typeof NftSchema>

export const NftSummarySchema = NftSchema.pick({
  id: true,
  name: true,
  collectionName: true,
  network: true,
  rarity: true,
  images: true,
  editions: true,
  version: true,
}).extend({ fromPrice: EthAmountSchema })
export type NftSummary = z.infer<typeof NftSummarySchema>

export const CollectionSchema = z.object({ id: IdSchema, name: z.string(), count: z.number().int().min(0) })
export type Collection = z.infer<typeof CollectionSchema>

export const NftSortSchema = z.enum(['relevance', 'price-asc', 'price-desc', 'newest', 'rating'])
export type NftSort = z.infer<typeof NftSortSchema>

export const NftTabSchema = z.enum(['all', 'new', 'trending'])
export type NftTab = z.infer<typeof NftTabSchema>

export const NftListParamsSchema = z.object({
  q: z.string().optional(),
  collections: z.array(z.string()).optional(),
  networks: z.array(NetworkSchema).optional(),
  priceMin: z.number().min(0).optional(),
  priceMax: z.number().min(0).optional(),
  sort: NftSortSchema,
  tab: NftTabSchema,
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(48),
})
export type NftListParams = z.infer<typeof NftListParamsSchema>
