import { createFileRoute, redirect } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { afterAuthTarget, authSearchSchema } from '@/features/auth/schemas'
import { getStoredSession } from '@/shared/lib/session-store'

export const Route = createFileRoute('/entrar')({
  head: () =>
    pageHead(
      'Entrar',
      'Entre na sua conta Kurio para comprar NFTs, acompanhar pedidos e gerenciar carteiras.',
    ),
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (getStoredSession()) throw redirect({ href: afterAuthTarget(search), replace: true })
  },
  component: LoginPage,
})

function LoginPage() {
  return <AuthScreen mode="login" search={Route.useSearch()} />
}
