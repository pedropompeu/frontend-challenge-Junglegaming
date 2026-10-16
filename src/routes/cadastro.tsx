import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthScreen } from '@/features/auth/components/auth-screen'
import { afterAuthTarget, authSearchSchema } from '@/features/auth/schemas'
import { getStoredSession } from '@/shared/lib/session-store'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (getStoredSession()) throw redirect({ href: afterAuthTarget(search), replace: true })
  },
  component: RegisterPage,
})

function RegisterPage() {
  return <AuthScreen mode="register" search={Route.useSearch()} />
}
