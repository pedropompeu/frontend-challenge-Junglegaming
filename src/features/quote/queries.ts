import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { QuoteRequest } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { qk } from '@/shared/lib/query-keys'
import { createQuote } from './api'
import { getCheckoutPrefs, setCheckoutPrefs } from './checkout-prefs'

/** Pedido de cotação a partir das preferências (sem cupom, o campo nem vai). */
export function quoteRequestOf(prefs: {
  couponCode: string | null
  network: QuoteRequest['network']
}): QuoteRequest {
  return prefs.couponCode
    ? { network: prefs.network, couponCode: prefs.couponCode }
    : { network: prefs.network }
}

export function quoteQuery(ownerKey: string, req: QuoteRequest) {
  return queryOptions({
    queryKey: qk.quote(ownerKey, req),
    queryFn: ({ signal }) => createQuote(req, signal),
    staleTime: 0,
  })
}

/** Todas as cotações do dono: invalidadas a cada mudança no carrinho. */
export const quotesKeyOf = (ownerKey: string) => ['private', ownerKey, 'quote'] as const

/**
 * Valida o cupom pedindo uma cotação com ele. Só um cupom aceito vai para as preferências;
 * o erro de campo (inválido/expirado) fica com quem chamou.
 */
export function useApplyCoupon() {
  const queryClient = useQueryClient()
  const { ownerKey } = useSession()
  return useMutation({
    mutationFn: (code: string) => {
      const { network } = getCheckoutPrefs(ownerKey)
      return createQuote({ network, couponCode: code.trim() })
    },
    onSuccess: (quote) => {
      const code = quote.coupon?.code ?? null
      const req = quoteRequestOf({ couponCode: code, network: quote.network })
      queryClient.setQueryData(qk.quote(ownerKey, req), quote)
      setCheckoutPrefs(ownerKey, { couponCode: code })
    },
  })
}
