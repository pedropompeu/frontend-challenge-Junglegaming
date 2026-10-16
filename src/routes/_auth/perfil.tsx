import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSession } from '@/features/auth/use-session'

export const Route = createFileRoute('/_auth/perfil')({
  component: ProfilePage,
})

/** Perfil provisório: a Task 19 traz coleção, carteiras e pedidos. */
function ProfilePage() {
  const { user, logout } = useSession()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    void navigate({ to: '/' })
  }

  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold md:text-4xl">Perfil do colecionador</h1>
      {user ? (
        <div className="mt-6 grid gap-1">
          <p className="text-lg font-bold">{user.displayName}</p>
          <p className="text-sand">@{user.username}</p>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-8 inline-flex h-11 items-center rounded-md border border-line-strong px-6 font-bold hover:border-primary hover:text-primary-hi"
      >
        Sair
      </button>
    </section>
  )
}
