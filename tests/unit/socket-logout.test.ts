// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { registerConnection, resetSocketServer } from '@/mocks/socket/server'
import { call, login, setupMockApi } from './helpers/mock-api'

setupMockApi('default')

beforeEach(() => resetSocketServer())

it('logout closes the socket connections opened with that token', async () => {
  const token = await login('ana@kurio.test')
  const other = await login('ana@kurio.test')
  const closed: string[] = []
  registerConnection({ userId: 'usr_ana', token, send: () => {}, close: () => closed.push('this') })
  registerConnection({
    userId: 'usr_ana',
    token: other,
    send: () => {},
    close: () => closed.push('other'),
  })
  const r = await call('POST', '/api/auth/logout', { token })
  expect(r.status).toBe(204)
  expect(closed).toEqual(['this'])
})
