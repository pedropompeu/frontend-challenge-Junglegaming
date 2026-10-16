import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { pageHead } from '@/app/page-head'
import type { User } from '@/contracts'
import { useSession } from '@/features/auth/use-session'
import { WalletsPanel } from '@/features/wallets/components/wallets-panel'
import { walletsQuery } from '@/features/wallets/queries'
import { walletsSearchSchema } from '@/features/wallets/schemas'
import { RetryBox } from '@/shared/ui/retry-box'
import { Skeleton } from '@/shared/ui/skeleton'

export const Route = createFileRoute('/_auth/perfil/carteiras')({
  head: () =>
    pageHead('Carteiras', 'Conecte e gerencie as carteiras que você usa para pagar seus NFTs.'),
  validateSearch: walletsSearchSchema,
  component: WalletsPage,
})

function WalletsPage() {
  const { user } = useSession()
  return (
    <>
      <h1 className="sr-only">Carteiras</h1>
      {user ? <WalletsLoader user={user} /> : <WalletsSkeleton />}
    </>
  )
}

function WalletsLoader({ user }: { user: User }) {
  const { redirect } = Route.useSearch()
  const wallets = useQuery(walletsQuery(user.id))
  if (wallets.isError) {
    return (
      <RetryBox
        title="Não foi possível carregar suas carteiras"
        error={wallets.error}
        onRetry={() => void wallets.refetch()}
      />
    )
  }
  if (!wallets.data) return <WalletsSkeleton />
  return <WalletsPanel key={user.id} user={user} wallets={wallets.data} redirect={redirect} />
}

function WalletsSkeleton() {
  return (
    <div role="status" className="grid gap-5 md:grid-cols-2 md:gap-x-7 md:gap-y-8">
      <span className="sr-only">Carregando carteiras…</span>
      {Array.from({ length: 10 }, (_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-none bg-surface" />
      ))}
    </div>
  )
}
