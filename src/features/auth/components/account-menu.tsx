import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { HeartIcon, LogInIcon, LogOutIcon, UserRoundIcon } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { useSession } from '../use-session'

const AUTH_PATHS = ['/entrar', '/cadastro']

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Canto direito do header: "Entrar" para visitante, menu da conta para quem está logado. */
export function AccountMenu() {
  const { status, user, logout } = useSession()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })

  if (status === 'loading') {
    return <span aria-hidden="true" className="size-9 animate-pulse rounded-full bg-surface-2" />
  }

  if (status === 'anonymous' || !user) {
    const onAuthScreen = AUTH_PATHS.includes(location.pathname)
    return (
      <Link
        to="/entrar"
        search={onAuthScreen ? {} : { redirect: location.href }}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-[15px] font-medium text-ink transition-colors hover:bg-primary-hi lg:w-[100px]"
      >
        <LogInIcon aria-hidden="true" className="size-5" />
        Entrar
      </Link>
    )
  }

  async function signOut() {
    await logout()
    void navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
        <Avatar size="lg" className="border border-line-strong">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-surface-2 font-bold text-cream">
            {initials(user.displayName)}
          </AvatarFallback>
        </Avatar>
        <span className="sr-only">Conta de {user.displayName}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 border-line-strong bg-surface text-cream">
        <DropdownMenuLabel>
          <span className="block font-bold">{user.displayName}</span>
          <span className="block text-xs font-normal text-sand">@{user.username}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserRoundIcon aria-hidden="true" />
            Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/favoritos">
            <HeartIcon aria-hidden="true" />
            Favoritos
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOutIcon aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
