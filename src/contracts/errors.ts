import { z } from 'zod'

export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'AVAILABILITY_CONFLICT',
  'QUOTE_STALE',
  'IDEMPOTENCY_CONFLICT',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'WALLET_REJECTED',
  'TRANSIENT',
])
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    fieldErrors: z.record(z.string(), z.string()).optional(),
    details: z.unknown().optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>
