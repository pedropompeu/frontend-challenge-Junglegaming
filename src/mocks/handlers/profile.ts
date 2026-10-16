import { HttpResponse } from 'msw'
import {
  AvatarBodySchema,
  ChangePasswordBodySchema,
  UpdateProfileBodySchema,
  type Profile,
} from '@/contracts'
import { hashPassword, verifyPassword } from '../db/crypto'
import { getDb, mutate } from '../db/store'
import { apiError, json, route, unauthenticated } from '../route'
import { parseBody } from './validate'

function profileOf(userId: string): Profile | null {
  return getDb().profiles[userId] ?? null
}

export const profileHandlers = [
  route('GET /profile', ({ userId }) => {
    const p = userId ? profileOf(userId) : null
    return p ? json(p) : unauthenticated()
  }),

  route('PATCH /profile', async ({ request, userId }) => {
    if (!userId || !profileOf(userId)) return unauthenticated()
    const body = await parseBody(request, UpdateProfileBodySchema)
    if (!body.ok) return body.response
    const data = body.data
    const email = data.email.toLowerCase()
    const others = getDb().users.filter((u) => u.id !== userId)
    if (others.some((u) => u.username === data.username)) {
      return apiError(409, 'USERNAME_TAKEN', 'Este nome de usuário já está em uso', {
        fieldErrors: { username: 'Este nome de usuário já está em uso' },
      })
    }
    if (others.some((u) => u.email.toLowerCase() === email)) {
      return apiError(409, 'EMAIL_TAKEN', 'Este e-mail já está cadastrado', {
        fieldErrors: { email: 'Este e-mail já está cadastrado' },
      })
    }
    const profile = mutate((db) => {
      const p = db.profiles[userId]!
      Object.assign(p, {
        displayName: data.displayName,
        username: data.username,
        email,
        ens: data.ens,
        nickname: data.nickname,
      })
      const u = db.users.find((x) => x.id === userId)
      if (u) Object.assign(u, { displayName: data.displayName, username: data.username, email })
      return p
    })
    return json(profile)
  }),

  route('PUT /profile/avatar', async ({ request, userId }) => {
    if (!userId || !profileOf(userId)) return unauthenticated()
    const body = await parseBody(request, AvatarBodySchema)
    if (!body.ok) return body.response
    const profile = mutate((db) => {
      const p = db.profiles[userId]!
      p.avatarUrl = body.data.dataUrl
      const u = db.users.find((x) => x.id === userId)
      if (u) u.avatarUrl = body.data.dataUrl
      return p
    })
    return json(profile)
  }),

  route('POST /profile/password', async ({ request, userId }) => {
    if (!userId) return unauthenticated()
    const body = await parseBody(request, ChangePasswordBodySchema)
    if (!body.ok) return body.response
    const user = getDb().users.find((u) => u.id === userId)
    if (!user) return unauthenticated()
    if (!(await verifyPassword(body.data.currentPassword, user))) {
      return apiError(422, 'VALIDATION_ERROR', 'Senha atual incorreta', {
        fieldErrors: { currentPassword: 'Senha atual incorreta' },
      })
    }
    const passwordHash = await hashPassword(body.data.newPassword, user.salt)
    mutate(() => {
      user.passwordHash = passwordHash
    })
    return new HttpResponse(null, { status: 204 })
  }),
]
