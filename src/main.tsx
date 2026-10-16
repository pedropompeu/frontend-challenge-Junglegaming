import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { createQueryClient } from './app/query-client'
import { Providers } from './app/providers'
import { parseSearch, stringifySearch } from './app/search-serializer'
import { setBackendReady } from './shared/lib/backend-ready'
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
  // O shell abre já, enquanto o backend simulado sobe; rede e socket esperam por ele.
  setBackendReady(import('@/mocks/browser').then(({ enableMocks }) => enableMocks()))
}

// O index.html traz título e descrição para quem não executa JS (prévias de link). Com o app
// no ar, vale o `head` de cada rota; as tags estáticas saem para não haver duas.
document.head.querySelectorAll('title, meta[name="description"]').forEach((tag) => tag.remove())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
