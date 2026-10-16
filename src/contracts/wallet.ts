import { z } from 'zod'
import { EmailSchema } from './auth'
import { IdSchema, NetworkSchema } from './common'

export const WalletProviderSchema = z.enum(['walletconnect', 'metamask', 'coinbase'])
export type WalletProvider = z.infer<typeof WalletProviderSchema>

export const WalletSlotSchema = z.enum(['primary', 'secondary'])
export type WalletSlot = z.infer<typeof WalletSlotSchema>

export const WalletSchema = z.object({
  id: IdSchema,
  slot: WalletSlotSchema,
  displayName: z.string(),
  nickname: z.string(),
  network: NetworkSchema,
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string().nullable(),
  walletType: WalletProviderSchema,
  referralCode: z.string().nullable(),
  email: z.string(),
  ensName: z.string().nullable(),
})
export type Wallet = z.infer<typeof WalletSchema>

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isValidAddress(network: z.infer<typeof NetworkSchema>, address: string): boolean {
  return network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
}

const ENS_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/

/** Nome ENS completo (`cofre.eth`), aceito onde o Figma pede "ENS ou carteira secundária". */
export function isEnsName(value: string): boolean {
  return ENS_NAME.test(value)
}

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable()

export const UpsertWalletBodySchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, 'Informe o nome de exibição')
      .max(60, 'Use até 60 caracteres'),
    nickname: z.string().trim().min(1, 'Informe o apelido').max(40, 'Use até 40 caracteres'),
    network: NetworkSchema,
    profileName: z
      .string()
      .trim()
      .min(1, 'Informe o nome do perfil')
      .max(60, 'Use até 60 caracteres'),
    address: z.string().trim().min(1, 'Informe o endereço da carteira'),
    secondaryAddress: nullableText(64),
    walletType: WalletProviderSchema,
    referralCode: nullableText(32),
    email: EmailSchema,
    ensName: z
      .string()
      .trim()
      .regex(/^[a-z0-9-]*$/, 'Use letras minúsculas, números e hífen')
      .max(40, 'Use até 40 caracteres')
      .transform((v) => (v === '' ? null : v))
      .nullable(),
  })
  .superRefine((v, ctx) => {
    if (!isValidAddress(v.network, v.address)) {
      ctx.addIssue({
        code: 'custom',
        path: ['address'],
        message: 'Endereço inválido para a rede escolhida',
      })
    }
    if (
      v.secondaryAddress &&
      !isValidAddress(v.network, v.secondaryAddress) &&
      !isEnsName(v.secondaryAddress)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['secondaryAddress'],
        message: 'Use um endereço da rede ou um nome .eth',
      })
    }
  })
export type UpsertWalletBody = z.input<typeof UpsertWalletBodySchema>

export const WalletSessionSchema = z.object({
  id: IdSchema,
  /** `null` quando a sessão é de uma carteira avulsa ("Usar outra carteira?"). */
  walletId: IdSchema.nullable(),
  provider: WalletProviderSchema,
  network: NetworkSchema,
  address: z.string(),
  status: z.literal('connected'),
})
export type WalletSession = z.infer<typeof WalletSessionSchema>

export const CustomWalletSchema = z.object({
  address: z.string().trim().min(1, 'Informe o endereço da carteira'),
  walletType: WalletProviderSchema,
})
export type CustomWallet = z.infer<typeof CustomWalletSchema>

/** Conecta uma carteira cadastrada (`walletId`) ou uma avulsa (`customWallet`), nunca as duas. */
export const CreateWalletSessionBodySchema = z
  .object({
    walletId: IdSchema.optional(),
    customWallet: CustomWalletSchema.optional(),
    provider: WalletProviderSchema,
    network: NetworkSchema,
  })
  .superRefine((v, ctx) => {
    if (Boolean(v.walletId) === Boolean(v.customWallet)) {
      ctx.addIssue({
        code: 'custom',
        path: ['walletId'],
        message: 'Escolha uma carteira cadastrada ou informe outra carteira',
      })
    } else if (v.customWallet && !isValidAddress(v.network, v.customWallet.address)) {
      ctx.addIssue({
        code: 'custom',
        path: ['customWallet', 'address'],
        message: 'Endereço inválido para a rede escolhida',
      })
    }
  })
export type CreateWalletSessionBody = z.infer<typeof CreateWalletSessionBodySchema>
