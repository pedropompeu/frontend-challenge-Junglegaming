import { CartSchema, type AddCartItemBody, type Cart } from '@/contracts'
import { request } from '@/shared/lib/http'

export function fetchCart(signal?: AbortSignal): Promise<Cart> {
  return request(CartSchema, { url: '/cart', signal })
}

export function addCartItem(body: AddCartItemBody): Promise<Cart> {
  return request(CartSchema, { method: 'POST', url: '/cart/items', data: body })
}

export function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  return request(CartSchema, {
    method: 'PATCH',
    url: `/cart/items/${encodeURIComponent(itemId)}`,
    data: { quantity },
  })
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return request(CartSchema, {
    method: 'DELETE',
    url: `/cart/items/${encodeURIComponent(itemId)}`,
  })
}
