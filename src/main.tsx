import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import './index.css'

const router = createRouter({ routeTree, defaultPreload: 'intent', scrollRestoration: true })

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
    <RouterProvider router={router} />
  </StrictMode>,
)
