import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  type ErrorComponentProps,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { SessionProvider } from '@/features/auth/session-provider'
import { RealtimeProvider } from '@/features/realtime/realtime-provider'
import { errorMessage } from '@/shared/lib/api-error'
import { SiteLayout } from '@/shared/layout/site-layout'

export type RouterContext = { queryClient: QueryClient }

// Painel de cenários do backend simulado: fica fora do bundle quando os mocks estão desligados.
const ScenarioPanel =
  import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/scenario-panel')) : null

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootComponent() {
  return (
    <SessionProvider>
      <RealtimeProvider>
        <SiteLayout>
          <Outlet />
        </SiteLayout>
        {ScenarioPanel ? (
          <Suspense fallback={null}>
            <ScenarioPanel />
          </Suspense>
        ) : null}
      </RealtimeProvider>
    </SessionProvider>
  )
}

function NotFound() {
  return (
    <section className="page-container grid min-h-[50vh] place-content-center gap-4 py-16 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-primary-hi">404</p>
      <h1 className="text-2xl font-bold md:text-4xl">Página não encontrada</h1>
      <p className="text-sand">O endereço que você abriu não existe ou foi removido.</p>
      <Link
        to="/"
        className="mx-auto mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
      >
        Voltar ao Início
      </Link>
    </section>
  )
}

function RootError({ error }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <section
      role="alert"
      className="page-container grid min-h-[50vh] place-content-center gap-4 py-16 text-center"
    >
      <h1 className="text-2xl font-bold md:text-4xl">Algo deu errado</h1>
      <p className="text-sand">{errorMessage(error)}</p>
      <button
        type="button"
        onClick={() => void router.invalidate()}
        className="mx-auto mt-2 inline-flex h-11 items-center rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
      >
        Tentar novamente
      </button>
    </section>
  )
}
