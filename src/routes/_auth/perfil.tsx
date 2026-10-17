import { Outlet, createFileRoute } from '@tanstack/react-router'
import { ProfileSidebar } from '@/features/profile/components/profile-sidebar'

export const Route = createFileRoute('/_auth/perfil')({
  component: AccountLayout,
})

/** Área da conta: "Meu perfil" ao lado (acima, no mobile) de dados do perfil ou carteiras. */
function AccountLayout() {
  return (
    // Sidebar e título em y 101, como nos frames Desktop/Perfil e Desktop/Carteiras.
    <div className="page-container grid gap-6 pt-4 pb-12 md:pt-[33px] lg:grid-cols-[310px_minmax(0,1fr)] lg:gap-7">
      <ProfileSidebar />
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  )
}
