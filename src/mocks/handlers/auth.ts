import { HttpResponse } from 'msw'
import { LoginBodySchema, RegisterBodySchema, type Session, type SessionInfo, type User } from '@/contracts'
import { hashPassword, verifyPassword } from '../db/crypto'
import type { UserRecord } from '../db/schema'
import { getDb, mutate, nextId, now } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { getScenarioConfig } from '../scenarios/runtime'
import { parseBody } from './validate'

const DEFAULT_TTL_MS = 2 * 60 * 60 * 1000

export function toUser(rec: UserRecord): User {
  return {
    id: rec.id,
    username: rec.username,
    email: rec.email,
    displayName: rec.displayName,
    avatarUrl: rec.avatarUrl,
  }
}

function newToken(): string {
  return `tok_${crypto.randomUUID().replace(/-/g, '')}`
}

function issueSession(rec: UserRecord): Session {
  const ttl = getScenarioConfig().sessionTtlMs ?? DEFAULT_TTL_MS
  const session = {
    token: newToken(),
    userId: rec.id,
    expiresAt: new Date(now().getTime() + ttl).toISOString(),
  }
  mutate((db) => {
    db.sessions.push(session)
  })
  return { token: session.token, expiresAt: session.expiresAt, user: toUser(rec) }
}

export const authHandlers = [
  route('POST /auth/login', async ({ request }) => {
    const body = await parseBody(request, LoginBodySchema)
    if (!body.ok) return body.response
    const email = body.data.email.toLowerCase()
    const rec = getDb().users.find((u) => u.email.toLowerCase() === email)
    if (!rec || !(await verifyPassword(body.data.password, rec))) {
      return apiError(401, 'UNAUTHENTICATED', 'E-mail ou senha inválidos')
    }
    return json(issueSession(rec))
  }),

  route('POST /auth/register', async ({ request }) => {
    const body = await parseBody(request, RegisterBodySchema)
    if (!body.ok) return body.response
    const { username, password } = body.data
    const email = body.data.email.toLowerCase()
    const db = getDb()
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado', {
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      })
    }
    if (db.users.some((u) => u.username === username)) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', {
        fieldErrors: { username: 'Este nome de usuário já está em uso' },
      })
    }
    const id = nextId('usr')
    const salt = `salt-${id}`
    const rec: UserRecord = {
      id,
      username,
      email,
      displayName: username,
      avatarUrl: null,
      salt,
      passwordHash: await hashPassword(password, salt),
    }
    mutate((d) => {
      d.users.push(rec)
      d.favorites[id] = []
      d.wallets[id] = []
      d.profiles[id] = { displayName: username, username, email, ens: null, nickname: null, avatarUrl: null }
    })
    return json(issueSession(rec), 201)
  }),

  route('GET /session', ({ userId, token }) => {
    if (!userId) return unauthenticated()
    const db = getDb()
    const rec = db.users.find((u) => u.id === userId)
    const session = db.sessions.find((s) => s.token === token)
    if (!rec || !session) return unauthenticated()
    const info: SessionInfo = { user: toUser(rec), expiresAt: session.expiresAt }
    return json(info)
  }),

  route('POST /auth/logout', ({ token }) => {
    if (token) {
      mutate((db) => {
        db.sessions = db.sessions.filter((s) => s.token !== token)
      })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
