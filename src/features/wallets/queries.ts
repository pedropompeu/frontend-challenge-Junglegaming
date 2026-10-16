import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UpsertWalletBody, Wallet, WalletSlot } from '@/contracts'
import { qk } from '@/shared/lib/query-keys'
import { fetchWallets, saveWallet } from './api'
import { upsertWallet } from './schemas'

export function walletsQuery(userId: string) {
  return queryOptions({
    queryKey: qk.wallets(userId),
    queryFn: ({ signal }) => fetchWallets(signal),
  })
}

/** Salva o slot e já atualiza a lista usada no checkout. */
export function useSaveWallet(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ slot, body }: { slot: WalletSlot; body: UpsertWalletBody }) =>
      saveWallet(slot, body),
    onSuccess: (wallet) => {
      queryClient.setQueryData<Wallet[]>(qk.wallets(userId), (list) => upsertWallet(list, wallet))
    },
  })
}
