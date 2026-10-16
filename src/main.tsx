import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { createQueryClient } from './app/query-client'
import { Providers } from './app/providers'
import { parseSearch, stringifySearch } from './app/search-serializer'
import './index.css'

const queryClient = createQueryClient()
const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
  parseSearch,
  stringifySearch,
  context: { queryClient },
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
  const { enableMocks } = await import('@/mocks/browser')
  await enableMocks()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
