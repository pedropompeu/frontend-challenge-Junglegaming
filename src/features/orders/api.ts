import { OrderSchema, type CreateOrderBody, type Order } from '@/contracts'
import { ApiError } from '@/shared/lib/api-error'
import { request } from '@/shared/lib/http'

/** Prazo do envio do pedido; o resto da API usa o timeout padrão da instância. */
export const ORDER_TIMEOUT_MS = 10_000

/**
 * Cria o pedido com a chave de idempotência da tentativa. O prazo é um timer do próprio
 * cliente (AbortController) em vez do `timeout` do XHR: sem resposta no prazo vira `TIMEOUT`,
 * e o envio pode ser repetido com a mesma chave sem risco de pedido duplicado.
 */
export async function createOrder(body: CreateOrderBody, idempotencyKey: string): Promise<Order> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ORDER_TIMEOUT_MS)
  try {
    return await request(OrderSchema, {
      method: 'POST',
      url: '/orders',
      data: body,
      headers: { 'Idempotency-Key': idempotencyKey },
      signal: controller.signal,
      timeout: 0,
    })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new ApiError({ status: null, code: 'TIMEOUT', message: 'Tempo de resposta esgotado' })
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export function fetchOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return request(OrderSchema, { url: `/orders/${encodeURIComponent(orderId)}`, signal })
}
