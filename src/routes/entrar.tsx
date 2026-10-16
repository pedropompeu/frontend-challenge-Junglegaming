import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { afterAuthTarget, authSearchSchema } from '@/features/auth/schemas'
import { getStoredSession } from '@/shared/lib/session-store'

export const Route = createFileRoute('/entrar')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (getStoredSession()) throw redirect({ href: afterAuthTarget(search), replace: true })
  },
  component: LoginPage,
})

function LoginPage() {
  return <AuthScreen mode="login" search={Route.useSearch()} />
}
