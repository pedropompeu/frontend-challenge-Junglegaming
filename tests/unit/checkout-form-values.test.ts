import { describe, expect, it } from 'vitest'
import type { Quote, User, Wallet } from '@/contracts'
import { initialCheckoutValues, sameQuoteValues } from '@/features/checkout/form-values'

const user: User = {
  id: 'usr_ana',
  username: 'ana_kurio',
  email: 'ana@kurio.test',
  displayName: 'Ana Souza',
  avatarUrl: null,
}

const primary: Wallet = {
  id: 'wal_primary',
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

const reserve: Wallet = {
  ...primary,
  id: 'wal_reserve',
  slot: 'secondary',
  nickname: 'Reserva',
  network: 'polygon',
  profileName: 'ana_reserva',
  address: '0xa91f000000000000000000000000000000e82c',
  secondaryAddress: 'nova.kurio.eth',
  walletType: 'coinbase',
  ensName: null,
}

describe('initialCheckoutValues', () => {
  it('prefills the session profile and the primary wallet', () => {
    const v = initialCheckoutValues({
      user,
      wallets: [reserve, primary],
      draft: null,
      network: 'ethereum',
    })
    expect(v).toMatchObject({
      displayName: 'Ana Souza',
      username: 'ana_kurio',
      email: 'ana@kurio.test',
      network: 'ethereum',
      profileName: 'ana_kurio',
      ensName: 'anasouza',
      referralCode: '',
      useCustomWallet: false,
      walletId: 'wal_primary',
      walletAddress: primary.address,
      secondaryAddress: '',
      walletType: 'metamask',
      provider: 'metamask',
      note: '',
    })
  })

  it('draft wins over defaults, except the network kept in the checkout prefs', () => {
    const v = initialCheckoutValues({
      user,
      wallets: [primary, reserve],
      draft: {
        note: 'Presente',
        referralCode: 'AMIGO42',
        network: 'solana',
        walletId: 'wal_reserve',
      },
      network: 'polygon',
    })
    expect(v).toMatchObject({
      note: 'Presente',
      referralCode: 'AMIGO42',
      network: 'polygon',
      walletId: 'wal_reserve',
      walletAddress: reserve.address,
      secondaryAddress: 'nova.kurio.eth',
      walletType: 'coinbase',
    })
  })

  it('a registered wallet always comes from the server, never from a stale draft', () => {
    const v = initialCheckoutValues({
      user,
      wallets: [primary],
      draft: { walletId: 'wal_deleted', walletAddress: '0xdead', walletType: 'coinbase' },
      network: 'ethereum',
    })
    expect(v).toMatchObject({
      walletId: 'wal_primary',
      walletAddress: primary.address,
      walletType: 'metamask',
    })
  })

  it('keeps the custom wallet typed in the draft', () => {
    const v = initialCheckoutValues({
      user,
      wallets: [primary],
      draft: { useCustomWallet: true, walletAddress: '0xabc', walletType: 'coinbase' },
      network: 'ethereum',
    })
    expect(v).toMatchObject({
      useCustomWallet: true,
      walletAddress: '0xabc',
      walletType: 'coinbase',
    })
  })

  it('without registered wallets starts on a custom wallet', () => {
    const v = initialCheckoutValues({ user, wallets: [], draft: null, network: 'ethereum' })
    expect(v).toMatchObject({
      useCustomWallet: true,
      walletId: '',
      walletAddress: '',
      walletType: '',
      profileName: '',
    })
  })
})

const quote: Quote = {
  id: 'qte_1',
  cartVersion: 1,
  network: 'ethereum',
  lines: [
    {
      cartItemId: 'cit_1',
      nftId: 'nft_1',
      editionId: 'edn_1',
      name: 'Neon Vessel',
      editionKind: 'open',
      quantity: 2,
      unitPrice: '0.5',
      lineTotal: '1',
    },
  ],
  subtotal: '1',
  discount: '0',
  coupon: null,
  networkFee: '0.012',
  total: '1.012',
  createdAt: '2026-10-16T12:00:00.000Z',
  expiresAt: '2026-10-16T12:15:00.000Z',
}

describe('sameQuoteValues', () => {
  it('ignores a new quote id and dates with the same values', () => {
    expect(
      sameQuoteValues(quote, { ...quote, id: 'qte_2', expiresAt: '2026-10-16T12:30:00.000Z' }),
    ).toBe(true)
  })

  it('detects total, fee and line changes', () => {
    expect(sameQuoteValues(quote, { ...quote, total: '1.1' })).toBe(false)
    expect(sameQuoteValues(quote, { ...quote, networkFee: '0.02' })).toBe(false)
    const [line] = quote.lines
    expect(
      sameQuoteValues(quote, {
        ...quote,
        lines: [{ ...line!, unitPrice: '0.6', lineTotal: '1.2' }],
      }),
    ).toBe(false)
    expect(sameQuoteValues(quote, { ...quote, lines: [] })).toBe(false)
    expect(sameQuoteValues(quote, { ...quote, coupon: { code: 'KURIO10', percentOff: 10 } })).toBe(
      false,
    )
  })
})
