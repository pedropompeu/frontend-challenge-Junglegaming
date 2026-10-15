import { z } from 'zod'

/** Valor em ETH como string decimal: nunca `number`, nunca notação científica. */
export const EthAmountSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')
export type EthAmount = z.infer<typeof EthAmountSchema>

export const IdSchema = z.string().min(1)
export const IsoDateSchema = z.string().datetime({ offset: true })

export const NetworkSchema = z.enum(['ethereum', 'polygon', 'solana'])
export type Network = z.infer<typeof NetworkSchema>

export function PageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  })
}
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number }
