import { setupWorker } from 'msw/browser'
import { installControl } from './control'
import { loadOrSeed } from './db/store'
import { handlers } from './handlers'
import { getScenario } from './scenarios/runtime'
import { createSocketHandler } from './socket/server'
import { resumeSettlements } from './socket/settlement'

/** Sobe o backend simulado (REST + Socket.IO) no navegador quando `VITE_ENABLE_MOCKS=true`. */
export async function enableMocks(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'true') return
  await loadOrSeed(getScenario())
  await setupWorker(...handlers, createSocketHandler(location.origin)).start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: { url: '/mockServiceWorker.js' },
  })
  resumeSettlements()
  installControl()
}
