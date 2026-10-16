import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionQuery } from '@/features/auth/queries'
import { isApiError } from '@/shared/lib/api-error'
import { clearStoredSession, getStoredSession } from '@/shared/lib/session-store'

/** Rotas privadas: sem sessão salva vão para `/entrar`; com sessão, o token é revalidado. */
export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ context, location }) => {
    if (!getStoredSession()) {
      throw redirect({ to: '/entrar', search: { redirect: location.href } })
    }
    try {
      await context.queryClient.fetchQuery({ ...sessionQuery(), staleTime: 0 })
    } catch (error) {
      // Falha de rede não desloga: o token salvo continua valendo até o servidor recusar.
      if (!isApiError(error) || error.status !== 401) return
      clearStoredSession()
      context.queryClient.removeQueries({ queryKey: ['private'] })
      throw redirect({ to: '/entrar', search: { redirect: location.href, motivo: 'expirada' } })
    }
  },
  component: Outlet,
})
