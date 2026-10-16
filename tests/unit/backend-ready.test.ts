// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { io } from 'socket.io-client'
import { NftSummarySchema, PageSchema } from '@/contracts'
import { setBackendReady } from '@/shared/lib/backend-ready'
import { request } from '@/shared/lib/http'
import { createSocket } from '@/shared/lib/socket'
import { setupMockApi } from './helpers/mock-api'

vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({})) }))

const server = setupMockApi('default')

function gate() {
  let open!: () => void
  const promise = new Promise<void>((resolve) => {
    open = resolve
  })
  return { promise, open }
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 30))

afterEach(() => {
  setBackendReady(Promise.resolve())
  server.events.removeAllListeners()
})

it('holds api requests until the simulated backend is up', async () => {
  const backend = gate()
  setBackendReady(backend.promise)
  const started = vi.fn()
  server.events.on('request:start', started)

  const page = request(PageSchema(NftSummarySchema), { url: '/nfts' })
  await settle()
  expect(started).not.toHaveBeenCalled()

  backend.open()
  await expect(page).resolves.toMatchObject({ items: expect.any(Array) })
  expect(started).toHaveBeenCalledOnce()
})

it('opens the socket only after the simulated backend is up', async () => {
  const backend = gate()
  setBackendReady(backend.promise)

  const socket = createSocket(null)
  await settle()
  expect(io).not.toHaveBeenCalled()

  backend.open()
  await socket
  expect(io).toHaveBeenCalledOnce()
})
