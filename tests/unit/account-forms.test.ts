import { describe, expect, it } from 'vitest'
import type { Profile, Wallet } from '@/contracts'
import { avatarFileError } from '@/features/profile/avatar-image'
import {
  EMPTY_PASSWORD_FORM,
  hasPasswordInput,
  profileChanged,
  profileFormValues,
} from '@/features/profile/schemas'
import {
  WalletFormSchema,
  newWalletFormValues,
  upsertWallet,
  walletFormValues,
  walletsSearchSchema,
} from '@/features/wallets/schemas'

const ana = { displayName: 'Ana Souza', username: 'ana_kurio', email: 'ana@kurio.test' }

const wallet: Wallet = {
  id: 'wal_ana_primary',
  slot: 'primary',
  displayName: 'Ana Souza',
  nickname: 'Carteira principal',
  network: 'ethereum',
  profileName: 'ana_kurio',
  address: '0x8f3a21c4b9e07d5a6c12f0e9b4d7a3c5e1f2b6d9',
  secondaryAddress: null,
  walletType: 'metamask',
  referralCode: null,
  email: 'ana@kurio.test',
  ensName: 'anasouza',
}

function fieldErrors(values: unknown): Record<string, string> {
  const r = WalletFormSchema.safeParse(values)
  if (r.success) return {}
  return Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]))
}

describe('avatar file check', () => {
  it('accepts png, jpeg and webp up to 5 MB', () => {
    expect(avatarFileError({ type: 'image/png', size: 1_000 })).toBeNull()
    expect(avatarFileError({ type: 'image/jpeg', size: 1_000 })).toBeNull()
    expect(avatarFileError({ type: 'image/webp', size: 5 * 1024 * 1024 })).toBeNull()
  })

  it('refuses other formats and files over 5 MB', () => {
    expect(avatarFileError({ type: 'image/gif', size: 10 })).toBe(
      'Use uma imagem PNG, JPEG ou WebP',
    )
    expect(avatarFileError({ type: '', size: 10 })).toBe('Use uma imagem PNG, JPEG ou WebP')
    expect(avatarFileError({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toBe(
      'A imagem deve ter até 5 MB',
    )
  })
})

describe('profile form', () => {
  const profile: Profile = { ...ana, ens: null, nickname: 'Ana', avatarUrl: null }

  it('turns missing optional fields into empty text', () => {
    expect(profileFormValues(profile)).toEqual({ ...ana, ens: '', nickname: 'Ana' })
  })

  it('only counts trimmed differences as changes', () => {
    const saved = profileFormValues(profile)
    expect(profileChanged({ ...saved, displayName: ' Ana Souza ' }, saved)).toBe(false)
    expect(profileChanged({ ...saved, ens: null }, saved)).toBe(false)
    expect(profileChanged({ ...saved, ens: 'anasouza' }, saved)).toBe(true)
  })

  it('password change is optional until a field is filled', () => {
    expect(hasPasswordInput(EMPTY_PASSWORD_FORM)).toBe(false)
    expect(hasPasswordInput({ ...EMPTY_PASSWORD_FORM, newPassword: 'x' })).toBe(true)
  })
})

describe('wallet form', () => {
  it('new wallet starts from the account and asks for network and wallet type', () => {
    const values = newWalletFormValues(ana)
    expect(values).toMatchObject({
      displayName: 'Ana Souza',
      profileName: 'ana_kurio',
      network: '',
    })
    expect(fieldErrors({ ...values, address: 'nao-e-endereco' })).toEqual({
      network: 'Selecione uma rede',
      walletType: 'Selecione o tipo de carteira',
      nickname: 'Informe o apelido',
    })
  })

  it('checks the address against the chosen network', () => {
    const values = walletFormValues(wallet)
    expect(fieldErrors({ ...values, network: 'solana' })).toEqual({
      address: 'Endereço inválido para a rede escolhida',
    })
    expect(fieldErrors({ ...values, secondaryAddress: 'cofre.eth', ensName: 'Ana Souza' })).toEqual(
      { ensName: 'Use letras minúsculas, números e hífen' },
    )
  })

  it('round-trips a saved wallet into the request body', () => {
    const values = walletFormValues(wallet)
    expect(values).toMatchObject({ secondaryAddress: '', referralCode: '' })
    const { id: _id, slot: _slot, ...body } = wallet
    expect(WalletFormSchema.parse(values)).toEqual(body)
  })

  it('keeps the primary wallet first when a slot is saved', () => {
    const secondary = { ...wallet, id: 'wal_ana_secondary', slot: 'secondary' as const }
    expect(upsertWallet([wallet], secondary).map((w) => w.slot)).toEqual(['primary', 'secondary'])
    const renamed = { ...wallet, nickname: 'Cofre' }
    expect(upsertWallet([secondary, wallet], renamed)).toEqual([renamed, secondary])
    expect(upsertWallet(undefined, wallet)).toEqual([wallet])
  })

  it('only follows internal redirects', () => {
    expect(walletsSearchSchema.parse({ redirect: '/checkout' })).toEqual({ redirect: '/checkout' })
    expect(walletsSearchSchema.parse({ redirect: 'https://evil.test' })).toEqual({
      redirect: undefined,
    })
  })
})
