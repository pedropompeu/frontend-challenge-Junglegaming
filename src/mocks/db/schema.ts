import type {
  CartOwner,
  Collection,
  Nft,
  Order,
  Profile,
  Quote,
  RealtimeEvent,
  User,
  Wallet,
  WalletSession,
} from '@/contracts'

export type UserRecord = User & { passwordHash: string; salt: string }
export type SessionRecord = { token: string; userId: string; expiresAt: string }
export type CartRecordItem = { id: string; nftId: string; editionId: string; quantity: number }
export type CartRecord = {
  id: string
  owner: CartOwner
  items: CartRecordItem[]
  version: number
  updatedAt: string
}
export type CouponRecord = { code: string; percentOff: number; expiresAt: string }
export type QuoteRecord = Quote & { ownerKey: string }
export type OrderRecord = Order & {
  idempotencyKey: string
  settleAt: string | null
  scheduledStatus: 'confirmed' | 'declined' | null
}
export type WalletSessionRecord = WalletSession & { userId: string; connected: boolean }

export type MockDbState = {
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: Nft[]
  collections: Collection[]
  favorites: Record<string, string[]>
  carts: Record<string, CartRecord>
  coupons: CouponRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  idempotency: Record<string, { payloadHash: string; orderId: string }>
  profiles: Record<string, Profile>
  wallets: Record<string, Wallet[]>
  walletSessions: WalletSessionRecord[]
  eventLog: RealtimeEvent[]
  seq: number
}
