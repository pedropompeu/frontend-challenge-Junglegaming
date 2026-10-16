import type { Network, Quote, User, Wallet } from '@/contracts'
import type { CheckoutDraft } from './draft-store'
import { EMPTY_CHECKOUT_FORM, type CheckoutFormValues } from './schemas'

/** Campos que a carteira cadastrada define (e que ficam só leitura enquanto ela é a escolhida). */
export function walletFieldsOf(wallet: Wallet) {
  return {
    useCustomWallet: false,
    walletId: wallet.id,
    walletAddress: wallet.address,
    secondaryAddress: wallet.secondaryAddress ?? '',
    walletType: wallet.walletType,
  } satisfies Partial<CheckoutFormValues>
}

export const primaryWalletOf = (wallets: Wallet[]): Wallet | null =>
  wallets.find((w) => w.slot === 'primary') ?? wallets[0] ?? null

/**
 * Valores iniciais do checkout: perfil da sessão e carteira principal, por cima o rascunho.
 * A rede vem das preferências (é ela que a cotação usa), e os dados de uma carteira cadastrada
 * vêm sempre do servidor: um rascunho velho não reaparece com endereço que ela não tem mais.
 */
export function initialCheckoutValues({
  user,
  wallets,
  draft,
  network,
}: {
  user: User
  wallets: Wallet[]
  draft: CheckoutDraft | null
  network: Network
}): CheckoutFormValues {
  const primary = primaryWalletOf(wallets)
  const defaults: CheckoutFormValues = {
    ...EMPTY_CHECKOUT_FORM,
    displayName: user.displayName,
    username: user.username,
    email: user.email,
    ...(primary
      ? {
          profileName: primary.profileName,
          ensName: primary.ensName ?? '',
          referralCode: primary.referralCode ?? '',
          provider: primary.walletType,
          ...walletFieldsOf(primary),
        }
      : { useCustomWallet: true }),
  }
  const values: CheckoutFormValues = { ...defaults, ...draft, network }
  if (values.useCustomWallet) return values
  const chosen = wallets.find((w) => w.id === values.walletId) ?? primary
  return chosen
    ? { ...values, ...walletFieldsOf(chosen) }
    : { ...values, useCustomWallet: true, walletId: '' }
}

/** Mesmos valores para o comprador (linhas, cupom, taxa e total), ainda que o id da cotação mude. */
export function sameQuoteValues(a: Quote, b: Quote): boolean {
  return (
    a.network === b.network &&
    a.subtotal === b.subtotal &&
    a.discount === b.discount &&
    a.networkFee === b.networkFee &&
    a.total === b.total &&
    a.coupon?.code === b.coupon?.code &&
    a.coupon?.percentOff === b.coupon?.percentOff &&
    a.lines.length === b.lines.length &&
    a.lines.every((line, i) => {
      const other = b.lines[i]
      return (
        other !== undefined &&
        line.cartItemId === other.cartItemId &&
        line.editionId === other.editionId &&
        line.quantity === other.quantity &&
        line.unitPrice === other.unitPrice &&
        line.lineTotal === other.lineTotal
      )
    })
  )
}
