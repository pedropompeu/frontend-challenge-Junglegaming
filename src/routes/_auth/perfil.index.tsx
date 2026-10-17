import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import type { User } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { ProfileForm } from '@/features/profile/components/profile-form'
import { profileQuery } from '@/features/profile/queries'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_auth/perfil/')({
  head: () => pageHead('Meu perfil', 'Seu perfil de colecionador na Kurio: nome, avatar e senha.'),
  component: ProfilePage,
})

function ProfilePage() {
  const { user } = useSession()
  return (
    <section aria-labelledby="perfil-titulo">
      <h1 id="perfil-titulo" className="text-lg font-bold md:text-base md:leading-[15px]">
        Perfil do colecionador
      </h1>
      {user ? <ProfileLoader user={user} /> : <ProfileSkeleton />}
    </section>
  )
}

/** O formulário nasce com o perfil salvo: só aparece depois dele. */
function ProfileLoader({ user }: { user: User }) {
  const profile = useQuery(profileQuery(user.id))
  if (profile.isError) {
    return (
      <div className="mt-6">
        <RetryBox
          title="Não foi possível carregar seu perfil"
          error={profile.error}
          onRetry={() => void profile.refetch()}
        />
      </div>
    )
  }
  if (!profile.data) return <ProfileSkeleton />
  return <ProfileForm key={user.id} userId={user.id} profile={profile.data} />
}

function ProfileSkeleton() {
  return (
    <div role="status" className="mt-6 grid gap-5 md:mt-9 md:grid-cols-2 md:gap-x-7 md:gap-y-8">
      <span className="sr-only">Carregando perfil…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-none bg-surface" />
      ))}
    </div>
  )
}
