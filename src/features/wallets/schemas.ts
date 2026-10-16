import { z } from 'zod'
import {
  NetworkSchema,
  UpsertWalletBodySchema,
  WalletProviderSchema,
  type User,
  type Wallet,
  type WalletSlot,
} from '@/contracts'
import { safeRedirect } from '@/features/auth/schemas'

/** `?redirect=` de quem chegou do checkout: volta para lá depois de salvar. */
export const walletsSearchSchema = z.object({
  redirect: z.unknown().transform(safeRedirect).optional(),
})

export const WALLET_SLOT_TITLES: Record<WalletSlot, string> = {
  primary: 'Carteira principal',
  secondary: 'Carteira secundária',
}

/**
 * Formulário do frame Desktop/Carteiras: rede e tipo começam vazios ("Selecione…"). Valida com
 * as regras do contrato e entrega o corpo do `PUT /wallets/{slot}`.
 */
export const WalletFormSchema = z
  .object({
    displayName: z.string(),
    nickname: z.string(),
    network: z.union([NetworkSchema, z.literal('')]),
    profileName: z.string(),
    address: z.string(),
    secondaryAddress: z.string(),
    walletType: z.union([WalletProviderSchema, z.literal('')]),
    referralCode: z.string(),
    email: z.string(),
    ensName: z.string(),
  })
  .transform((v, ctx) => {
    if (!v.network)
      ctx.addIssue({ code: 'custom', path: ['network'], message: 'Selecione uma rede' })
    if (!v.walletType) {
      ctx.addIssue({
        code: 'custom',
        path: ['walletType'],
        message: 'Selecione o tipo de carteira',
      })
    }
    const body = UpsertWalletBodySchema.safeParse({
      ...v,
      network: v.network || 'ethereum',
      walletType: v.walletType || 'metamask',
    })
    if (!body.success) {
      for (const issue of body.error.issues) {
        // Sem rede escolhida, o formato do endereço ainda não se aplica.
        if (!v.network && issue.code === 'custom') continue
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message })
      }
    }
    if (!body.success || !v.network || !v.walletType) return z.NEVER
    return body.data
  })
export type WalletFormValues = z.input<typeof WalletFormSchema>

export function walletFormValues(wallet: Wallet): WalletFormValues {
  return {
    displayName: wallet.displayName,
    nickname: wallet.nickname,
    network: wallet.network,
    profileName: wallet.profileName,
    address: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    walletType: wallet.walletType,
    referralCode: wallet.referralCode ?? '',
    email: wallet.email,
    ensName: wallet.ensName ?? '',
  }
}

/** Carteira nova: nome de exibição, nome do perfil e e-mail vêm da conta. */
export function newWalletFormValues(
  user: Pick<User, 'displayName' | 'username' | 'email'>,
): WalletFormValues {
  return {
    displayName: user.displayName,
    nickname: '',
    network: '',
    profileName: user.username,
    address: '',
    secondaryAddress: '',
    walletType: '',
    referralCode: '',
    email: user.email,
    ensName: '',
  }
}

/** Lista com a carteira salva no lugar do slot, principal primeiro (como o servidor ordena). */
export function upsertWallet(list: Wallet[] | undefined, wallet: Wallet): Wallet[] {
  return [...(list ?? []).filter((w) => w.slot !== wallet.slot), wallet].sort((a, b) =>
    a.slot === b.slot ? 0 : a.slot === 'primary' ? -1 : 1,
  )
}
