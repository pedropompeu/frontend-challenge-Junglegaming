import { describe, expect, it } from 'vitest'
import {
  ApiErrorBodySchema,
  EthAmountSchema,
  NftSchema,
  PageSchema,
  NftSummarySchema,
  RealtimeEventSchema,
  RegisterBodySchema,
  UpsertWalletBodySchema,
} from '@/contracts'

const edition = {
  id: 'ed_1',
  kind: '1/10',
  price: '1.2',
  originalPrice: null,
  supply: 10,
  available: 4,
}
const nft = {
  id: 'nft_neon-vessel',
  name: 'Neon Vessel',
  description: 'desc',
  collectionId: 'col_1',
  collectionName: 'Neon',
  category: 'arte-digital',
  network: 'ethereum',
  rarity: 'rare',
  images: [{ src: '/a.webp', alt: 'alt', width: 800, height: 800 }],
  rating: 4.5,
  reviewsCount: 10,
  tokenId: '#001',
  attributes: [{ trait: 'Cor', value: 'Azul' }],
  editions: [edition],
  createdAt: '2026-10-01T00:00:00.000Z',
  trendingScore: 80,
  version: 1,
}
const sampleNftEvent = {
  eventId: 'evt_1',
  type: 'nft.updated',
  resource: { type: 'nft', id: nft.id },
  version: 2,
  occurredAt: '2026-10-01T00:00:00.000Z',
  payload: { editions: [edition] },
}
const validRegister = {
  username: 'nova_user',
  email: 'nova@kurio.test',
  password: 'Senha123',
  confirmPassword: 'Senha123',
}

describe('contracts', () => {
  it('accepts ETH only as decimal strings', () => {
    expect(EthAmountSchema.safeParse('1.5').success).toBe(true)
    expect(EthAmountSchema.safeParse('0').success).toBe(true)
    expect(EthAmountSchema.safeParse(1.5).success).toBe(false)
    expect(EthAmountSchema.safeParse('1e3').success).toBe(false)
    expect(EthAmountSchema.safeParse('-1').success).toBe(false)
    expect(EthAmountSchema.safeParse('1.1234567890123456789').success).toBe(false)
  })
  it('parses a full NFT and a page of summaries', () => {
    expect(NftSchema.parse(nft).editions[0]!.kind).toBe('1/10')
    const page = PageSchema(NftSummarySchema).parse({
      items: [{ ...nft, fromPrice: '1.2' }],
      page: 1,
      pageSize: 9,
      total: 1,
      totalPages: 1,
    })
    expect(page.items[0]!.fromPrice).toBe('1.2')
  })
  it('discriminates realtime events', () => {
    expect(RealtimeEventSchema.parse(sampleNftEvent).type).toBe('nft.updated')
    expect(RealtimeEventSchema.safeParse({ ...sampleNftEvent, type: 'other' }).success).toBe(false)
  })
  it('requires matching and strong passwords on register', () => {
    expect(RegisterBodySchema.safeParse(validRegister).success).toBe(true)
    expect(RegisterBodySchema.safeParse({ ...validRegister, confirmPassword: 'x' }).success).toBe(
      false,
    )
    expect(
      RegisterBodySchema.safeParse({
        ...validRegister,
        password: 'fraca',
        confirmPassword: 'fraca',
      }).success,
    ).toBe(false)
  })
  it('validates wallet address by network', () => {
    const base = {
      displayName: 'Ana',
      nickname: 'ana',
      network: 'ethereum',
      profileName: 'Ana',
      address: '0x' + 'a'.repeat(40),
      secondaryAddress: null,
      walletType: 'metamask',
      referralCode: null,
      email: 'ana@kurio.test',
      ensName: 'ana',
    }
    expect(UpsertWalletBodySchema.safeParse(base).success).toBe(true)
    expect(UpsertWalletBodySchema.safeParse({ ...base, address: '0x123' }).success).toBe(false)
    expect(
      UpsertWalletBodySchema.safeParse({
        ...base,
        network: 'solana',
        address: '0x' + 'a'.repeat(40),
      }).success,
    ).toBe(false)
    expect(
      UpsertWalletBodySchema.safeParse({
        ...base,
        network: 'solana',
        address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
      }).success,
    ).toBe(true)
  })
  it('parses the error envelope', () => {
    const body = { error: { code: 'QUOTE_STALE', message: 'm', details: { quote: {} } } }
    expect(ApiErrorBodySchema.parse(body).error.code).toBe('QUOTE_STALE')
  })
})
