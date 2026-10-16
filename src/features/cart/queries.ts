import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import type { AddCartItemBody, Cart } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { quotesKeyOf } from '@/features/quote/queries'
import { isApiError } from '@/shared/lib/api-error'
import { qk } from '@/shared/lib/query-keys'
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from './api'

export function cartQuery(ownerKey: string) {
  return queryOptions({
    queryKey: qk.cart(ownerKey),
    queryFn: ({ signal }) => fetchCart(signal),
    staleTime: 0,
  })
}

export function useCart() {
  const { ownerKey } = useSession()
  return useQuery(cartQuery(ownerKey))
}

/** Unidades no carrinho (badge do header e da navegação inferior). */
export function useCartCount(): number {
  const { ownerKey } = useSession()
  const { data } = useQuery({
    ...cartQuery(ownerKey),
    select: (cart) => cart.items.reduce((sum, item) => sum + item.quantity, 0),
  })
  return data ?? 0
}

/** Unidades desta edição que já estão no carrinho (teto do stepper do detalhe). */
export function useQuantityInCart(nftId: string, editionId: string): number {
  const { ownerKey } = useSession()
  const { data } = useQuery({
    ...cartQuery(ownerKey),
    select: (cart) =>
      cart.items.find((i) => i.nftId === nftId && i.editionId === editionId)?.quantity ?? 0,
  })
  return data ?? 0
}

const CART_MUTATION = ['cart'] as const

/** Resposta do servidor vira o cache; com outra mudança em voo, a última resposta é que vale. */
function settleCart(queryClient: QueryClient, ownerKey: string, cart: Cart | undefined) {
  if (queryClient.isMutating({ mutationKey: CART_MUTATION }) > 1) return
  if (cart) queryClient.setQueryData(qk.cart(ownerKey), cart)
  else void queryClient.invalidateQueries({ queryKey: qk.cart(ownerKey) })
  void queryClient.invalidateQueries({ queryKey: quotesKeyOf(ownerKey) })
}

/** Estoque informado por um 409 `AVAILABILITY_CONFLICT` (null se o servidor não disse). */
export function conflictAvailable(error: unknown): number | null {
  if (!isApiError(error) || error.code !== 'AVAILABILITY_CONFLICT') return null
  const details = error.details as { available?: unknown } | undefined
  return typeof details?.available === 'number' ? details.available : null
}

export function isAvailabilityConflict(error: unknown): boolean {
  return isApiError(error) && error.code === 'AVAILABILITY_CONFLICT'
}

export function availabilityMessage(available: number): string {
  if (available <= 0) return 'Esta edição esgotou'
  return available === 1
    ? 'Só resta 1 unidade desta edição'
    : `Só restam ${available} unidades desta edição`
}

export function useAddToCart() {
  const queryClient = useQueryClient()
  const { ownerKey } = useSession()
  return useMutation({
    mutationKey: [...CART_MUTATION, 'add'],
    mutationFn: (body: AddCartItemBody) => addCartItem(body),
    onSuccess: (cart) => settleCart(queryClient, ownerKey, cart),
    onError: (error) => {
      // O estoque mudou: o carrinho e o detalhe precisam do número novo.
      if (isAvailabilityConflict(error)) {
        void queryClient.invalidateQueries({ queryKey: qk.cart(ownerKey) })
        void queryClient.invalidateQueries({ queryKey: qk.nfts.all })
      }
    },
  })
}

/**
 * Quantidade com atualização otimista. As trocas do mesmo item rodam em fila (`scope`),
 * então a última quantidade pedida é a que fica no servidor.
 */
export function useUpdateCartItem(itemId: string) {
  const queryClient = useQueryClient()
  const { ownerKey } = useSession()
  const key = qk.cart(ownerKey)
  return useMutation({
    mutationKey: [...CART_MUTATION, 'update', itemId],
    scope: { id: `cart-item:${itemId}` },
    mutationFn: (quantity: number) => updateCartItem(itemId, quantity),
    onMutate: async (quantity) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient
        .getQueryData<Cart>(key)
        ?.items.find((i) => i.id === itemId)?.quantity
      queryClient.setQueryData<Cart>(key, (cart) => withQuantity(cart, itemId, quantity))
      return { previous }
    },
    onError: (error, _quantity, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Cart>(key, (cart) => withQuantity(cart, itemId, context.previous!))
      }
      const available = conflictAvailable(error)
      if (available !== null) {
        queryClient.setQueryData<Cart>(key, (cart) => withAvailable(cart, itemId, available))
      }
    },
    onSuccess: (cart) => settleCart(queryClient, ownerKey, cart),
    onSettled: (_cart, error) => {
      if (error) settleCart(queryClient, ownerKey, undefined)
    },
  })
}

export function useRemoveCartItem(itemId: string) {
  const queryClient = useQueryClient()
  const { ownerKey } = useSession()
  return useMutation({
    mutationKey: [...CART_MUTATION, 'remove', itemId],
    mutationFn: () => removeCartItem(itemId),
    onSuccess: (cart) => settleCart(queryClient, ownerKey, cart),
  })
}

function withQuantity(cart: Cart | undefined, itemId: string, quantity: number) {
  if (!cart) return cart
  return {
    ...cart,
    items: cart.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
  }
}

function withAvailable(cart: Cart | undefined, itemId: string, available: number) {
  if (!cart) return cart
  return {
    ...cart,
    items: cart.items.map((i) => (i.id === itemId ? { ...i, available } : i)),
  }
}
