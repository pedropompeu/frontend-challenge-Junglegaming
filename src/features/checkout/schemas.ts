import { z } from 'zod'
import {
  EmailSchema,
  NetworkSchema,
  UsernameSchema,
  WalletProviderSchema,
  isEnsName,
  isValidAddress,
  type Buyer,
  type CreateWalletSessionBody,
} from '@/contracts'

export const NOTE_MAX = 280

/**
 * "Perfil do colecionador" do checkout (frame Desktop/Pagamento). Carteira cadastrada
 * (`walletId`) preenche endereço e tipo; "Usar outra carteira?" libera esses campos para
 * uma carteira avulsa, validada pela rede escolhida.
 */
export const CheckoutFormSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Informe o nome de exibição').max(60),
    username: UsernameSchema,
    email: EmailSchema,
    network: NetworkSchema,
    profileName: z.string().trim().min(1, 'Informe o nome do perfil').max(60),
    useCustomWallet: z.boolean(),
    walletId: z.string(),
    walletAddress: z.string().trim(),
    secondaryAddress: z.string().trim().max(64, 'Use até 64 caracteres'),
    walletType: z.union([WalletProviderSchema, z.literal('')]),
    provider: WalletProviderSchema,
    referralCode: z.string().trim().max(32, 'Use até 32 caracteres'),
    ensName: z
      .string()
      .trim()
      .max(40, 'Use até 40 caracteres')
      .regex(/^[a-z0-9-]*$/, 'Use letras minúsculas, números e hífen'),
    note: z.string().max(NOTE_MAX, `Use até ${NOTE_MAX} caracteres`),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message })
    if (!v.useCustomWallet && !v.walletId) issue('walletId', 'Escolha uma carteira')
    if (!v.walletAddress) {
      issue('walletAddress', 'Informe o endereço da carteira')
    } else if (!isValidAddress(v.network, v.walletAddress)) {
      // Carteira cadastrada não se edita aqui: o conflito é com a rede escolhida.
      if (v.useCustomWallet) issue('walletAddress', 'Endereço inválido para a rede escolhida')
      else issue('network', 'A carteira escolhida não opera nesta rede')
    }
    if (
      v.secondaryAddress &&
      !isValidAddress(v.network, v.secondaryAddress) &&
      !isEnsName(v.secondaryAddress)
    ) {
      issue('secondaryAddress', 'Use um endereço da rede ou um nome .eth')
    }
    if (!v.walletType) issue('walletType', 'Selecione o tipo de carteira')
  })

export type CheckoutFormValues = z.input<typeof CheckoutFormSchema>

export const EMPTY_CHECKOUT_FORM: CheckoutFormValues = {
  displayName: '',
  username: '',
  email: '',
  network: 'ethereum',
  profileName: '',
  useCustomWallet: false,
  walletId: '',
  walletAddress: '',
  secondaryAddress: '',
  walletType: '',
  provider: 'metamask',
  referralCode: '',
  ensName: '',
  note: '',
}

const orNull = (v: string) => v.trim() || null

/** Snapshot do comprador que vai no pedido. */
export function buyerOf(v: CheckoutFormValues): Buyer {
  const note = v.note.trim()
  return {
    displayName: v.displayName.trim(),
    email: v.email.trim(),
    username: v.username.trim(),
    profileName: v.profileName.trim(),
    ensName: orNull(v.ensName),
    referralCode: orNull(v.referralCode),
    secondaryAddress: orNull(v.secondaryAddress),
    ...(note ? { note } : {}),
  }
}

/** O que conectar: a carteira cadastrada escolhida ou a avulsa digitada. */
export function walletSessionBodyOf(v: CheckoutFormValues): CreateWalletSessionBody | null {
  if (v.useCustomWallet) {
    const address = v.walletAddress.trim()
    if (!v.walletType || !isValidAddress(v.network, address)) return null
    return {
      customWallet: { address, walletType: v.walletType },
      provider: v.provider,
      network: v.network,
    }
  }
  return v.walletId ? { walletId: v.walletId, provider: v.provider, network: v.network } : null
}
