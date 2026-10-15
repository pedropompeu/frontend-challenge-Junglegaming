import type { ScenarioName } from '../scenarios/names'
import { COLLECTIONS } from '../fixtures/collections'
import { COUPONS } from '../fixtures/coupons'
import { buildNfts } from '../fixtures/nfts'
import { DEMO_PASSWORD, DEMO_USERS } from '../fixtures/users'
import { ANA_PRIMARY_WALLET } from '../fixtures/wallets'
import { hashPassword } from './crypto'
import type { MockDbState, UserRecord } from './schema'

export async function buildSeed(scenario: ScenarioName): Promise<MockDbState> {
  const nfts = scenario === 'empty-catalog' ? [] : buildNfts()
  const users: UserRecord[] = await Promise.all(
    DEMO_USERS.map(async (u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      avatarUrl: null,
      salt: u.salt,
      passwordHash: await hashPassword(DEMO_PASSWORD, u.salt),
    })),
  )
  const collections = COLLECTIONS.map((c) => ({
    ...c,
    count: nfts.filter((n) => n.collectionId === c.id).length,
  }))
  return {
    users,
    sessions: [],
    nfts,
    collections,
    favorites: {
      usr_ana: nfts.length ? [nfts[1]!.id, nfts[5]!.id] : [],
      usr_bruno: [],
    },
    carts: {},
    coupons: COUPONS.map((c) => ({ ...c })),
    quotes: [],
    orders: [],
    idempotency: {},
    profiles: Object.fromEntries(
      DEMO_USERS.map((u) => [
        u.id,
        {
          displayName: u.displayName,
          username: u.username,
          email: u.email,
          ens: u.ens,
          nickname: u.nickname,
          avatarUrl: null,
        },
      ]),
    ),
    wallets: { usr_ana: [{ ...ANA_PRIMARY_WALLET }], usr_bruno: [] },
    walletSessions: [],
    eventLog: [],
    seq: 0,
  }
}
