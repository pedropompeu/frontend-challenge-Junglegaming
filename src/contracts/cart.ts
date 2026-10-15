import { z } from 'zod'
import { EthAmountSchema, IdSchema, IsoDateSchema, NetworkSchema } from './common'
import { EditionKindSchema, NftImageSchema } from './nft'

export const CartItemSchema = z.object({
  id: IdSchema,
  nftId: IdSchema,
  editionId: IdSchema,
  editionKind: EditionKindSchema,
  name: z.string(),
  image: NftImageSchema,
  network: NetworkSchema,
  unitPrice: EthAmountSchema,
  available: z.number().int().min(0),
  quantity: z.number().int().min(1),
  nftVersion: z.number().int().min(0),
})
export type CartItem = z.infer<typeof CartItemSchema>

export const CartOwnerSchema = z.object({ type: z.enum(['user', 'guest']), id: IdSchema })
export type CartOwner = z.infer<typeof CartOwnerSchema>

export const CartSchema = z.object({
  id: IdSchema,
  owner: CartOwnerSchema,
  items: z.array(CartItemSchema),
  version: z.number().int().min(0),
  updatedAt: IsoDateSchema,
})
export type Cart = z.infer<typeof CartSchema>

export const AddCartItemBodySchema = z.object({
  nftId: IdSchema,
  editionId: IdSchema,
  quantity: z.number().int().min(1),
})
export type AddCartItemBody = z.infer<typeof AddCartItemBodySchema>

export const UpdateCartItemBodySchema = z.object({ quantity: z.number().int().min(1) })
export type UpdateCartItemBody = z.infer<typeof UpdateCartItemBodySchema>
