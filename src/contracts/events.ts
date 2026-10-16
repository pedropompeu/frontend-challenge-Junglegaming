import { z } from 'zod'
import { IdSchema, IsoDateSchema } from './common'
import { EditionSchema } from './nft'
import { OrderSchema } from './order'

export const NftUpdatedEventSchema = z.object({
  eventId: IdSchema,
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: IdSchema }),
  version: z.number().int().min(0),
  occurredAt: IsoDateSchema,
  payload: z.object({ editions: z.array(EditionSchema).min(1) }),
})
export type NftUpdatedEvent = z.infer<typeof NftUpdatedEventSchema>

export const OrderUpdatedEventSchema = z.object({
  eventId: IdSchema,
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: IdSchema }),
  version: z.number().int().min(0),
  userId: IdSchema,
  occurredAt: IsoDateSchema,
  payload: z.object({ order: OrderSchema }),
})
export type OrderUpdatedEvent = z.infer<typeof OrderUpdatedEventSchema>

export const RealtimeEventSchema = z.discriminatedUnion('type', [
  NftUpdatedEventSchema,
  OrderUpdatedEventSchema,
])
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>
