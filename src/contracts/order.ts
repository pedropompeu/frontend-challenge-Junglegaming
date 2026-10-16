import { z } from 'zod'
import { EthAmountSchema, IdSchema, IsoDateSchema, NetworkSchema } from './common'
import { CouponSchema, QuoteLineSchema } from './quote'

export const OrderStatusSchema = z.enum(['pending', 'confirmed', 'declined'])
export type OrderStatus = z.infer<typeof OrderStatusSchema>

/**
 * Snapshot do "Perfil do colecionador" preenchido no checkout. Vai só para o pedido:
 * não altera perfil nem carteiras cadastradas.
 */
export const BuyerSchema = z.object({
  displayName: z.string().trim().min(1),
  email: z.string().trim().email(),
  username: z.string().trim().min(1).optional(),
  profileName: z.string().trim().min(1).optional(),
  ensName: z.string().trim().nullable().optional(),
  referralCode: z.string().trim().nullable().optional(),
  secondaryAddress: z.string().trim().nullable().optional(),
  note: z.string().max(280).optional(),
})
export type Buyer = z.infer<typeof BuyerSchema>

export const OrderWalletSchema = z.object({
  label: z.string(),
  address: z.string(),
  provider: z.string(),
})
export type OrderWallet = z.infer<typeof OrderWalletSchema>

export const CreateOrderBodySchema = z.object({
  quoteId: IdSchema,
  walletSessionId: IdSchema,
  buyer: BuyerSchema,
})
export type CreateOrderBody = z.infer<typeof CreateOrderBodySchema>

export const OrderSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  status: OrderStatusSchema,
  quoteId: IdSchema,
  lines: z.array(QuoteLineSchema),
  subtotal: EthAmountSchema,
  discount: EthAmountSchema,
  coupon: CouponSchema.nullable(),
  networkFee: EthAmountSchema,
  total: EthAmountSchema,
  network: NetworkSchema,
  wallet: OrderWalletSchema,
  buyer: BuyerSchema,
  txHash: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  declineReason: z.string().nullable(),
  createdAt: IsoDateSchema,
  settledAt: IsoDateSchema.nullable(),
  version: z.number().int().min(0),
})
export type Order = z.infer<typeof OrderSchema>
