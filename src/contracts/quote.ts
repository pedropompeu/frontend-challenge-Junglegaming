import { z } from 'zod'
import { EthAmountSchema, IdSchema, IsoDateSchema, NetworkSchema } from './common'
import { EditionKindSchema, NftImageSchema } from './nft'

export const QuoteRequestSchema = z.object({
  couponCode: z.string().trim().min(1).optional(),
  network: NetworkSchema,
})
export type QuoteRequest = z.infer<typeof QuoteRequestSchema>

export const QuoteLineSchema = z.object({
  cartItemId: IdSchema,
  nftId: IdSchema,
  editionId: IdSchema,
  name: z.string(),
  editionKind: EditionKindSchema,
  quantity: z.number().int().min(1),
  unitPrice: EthAmountSchema,
  lineTotal: EthAmountSchema,
  /** Snapshot para o recibo: o pedido nunca relê o catálogo. Opcionais por compatibilidade. */
  tokenId: z.string().optional(),
  image: NftImageSchema.optional(),
})
export type QuoteLine = z.infer<typeof QuoteLineSchema>

export const CouponSchema = z.object({
  code: z.string(),
  percentOff: z.number().positive().max(100),
})
export type Coupon = z.infer<typeof CouponSchema>

export const QuoteSchema = z.object({
  id: IdSchema,
  cartVersion: z.number().int().min(0),
  network: NetworkSchema,
  lines: z.array(QuoteLineSchema),
  subtotal: EthAmountSchema,
  discount: EthAmountSchema,
  coupon: CouponSchema.nullable(),
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
  createdAt: IsoDateSchema,
  expiresAt: IsoDateSchema,
})
export type Quote = z.infer<typeof QuoteSchema>
