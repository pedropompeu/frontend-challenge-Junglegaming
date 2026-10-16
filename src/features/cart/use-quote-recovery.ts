import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { setCheckoutPrefs } from '@/features/quote/checkout-prefs'
import { isApiError } from '@/shared/lib/api-error'
import { qk } from '@/shared/lib/query-keys'
import { availabilityMessage, conflictAvailable, isAvailabilityConflict } from './queries'

const COUPON_ERRORS = new Set(['COUPON_INVALID', 'COUPON_EXPIRED'])

/** Erro de cupom na cotação: não bloqueia o resumo, o cupom só sai das preferências. */
export const isCouponError = (error: unknown) => isApiError(error) && COUPON_ERRORS.has(error.code)

/**
 * Recupera a cotação que falhou por algo que o usuário não controla ali: cupom salvo que
 * deixou de valer sai das preferências com aviso; falta de estoque recarrega o carrinho.
 */
export function useQuoteRecovery(error: unknown, ownerKey: string) {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (!isApiError(error)) return
    if (COUPON_ERRORS.has(error.code)) {
      setCheckoutPrefs(ownerKey, { couponCode: null })
      toast.error(`${error.fieldErrors?.couponCode ?? error.message}. O cupom foi removido.`)
    } else if (isAvailabilityConflict(error)) {
      const available = conflictAvailable(error)
      if (available !== null) toast.error(availabilityMessage(available))
      void queryClient.invalidateQueries({ queryKey: qk.cart(ownerKey) })
    }
  }, [error, ownerKey, queryClient])
}
