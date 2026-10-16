import { useId, type ComponentType, type SVGProps } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  DownloadIcon,
  HandCoinsIcon,
  HeartIcon,
  LogOutIcon,
  MapPinIcon,
  ShoppingCartIcon,
  TriangleAlertIcon,
  UserRoundIcon,
} from 'lucide-react'
import { useSession } from '@/features/auth/use-session'
import { Unavailable } from '@/shared/ui/unavailable'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/** Itens do frame fora do escopo do desafio: visíveis, mas avisam em vez de navegar. */
const UNAVAILABLE_ITEMS: Array<{ label: string; icon: Icon }> = [
  { label: 'Atividade', icon: ShoppingCartIcon },
  { label: 'Lista de interesse', icon: HeartIcon },
  { label: 'Ofertas', icon: HandCoinsIcon },
  { label: 'Arquivos baixados', icon: DownloadIcon },
  { label: 'Suporte', icon: TriangleAlertIcon },
]

// Abaixo de `lg` a lista vira uma faixa rolável (aba ativa sublinhada); a partir dele, a coluna
// do Figma com a barra à esquerda do item ativo.
const item =
  'flex h-11 shrink-0 items-center gap-3 px-4 text-[15px] whitespace-nowrap text-primary-hi transition-colors hover:text-cream lg:h-[45px] lg:px-4'
const activeItem =
  'data-[status=active]:shadow-[inset_0_-3px_0_var(--color-primary)] lg:data-[status=active]:shadow-[inset_6px_0_0_var(--color-primary)]'
const icon = 'size-[18px] shrink-0'

/** "Meu perfil": navegação da área da conta (frames Desktop/Perfil e Desktop/Carteiras). */
export function ProfileSidebar() {
  const id = useId()
  const { logout } = useSession()
  const navigate = useNavigate()

  async function signOut() {
    await logout()
    void navigate({ to: '/' })
  }

  return (
    <nav aria-labelledby={`${id}-title`} className="min-w-0 bg-surface lg:self-start">
      <h2
        id={`${id}-title`}
        className="sr-only lg:not-sr-only lg:block lg:px-2.5 lg:pt-4 lg:pb-1 lg:text-lg lg:font-bold"
      >
        Meu perfil
      </h2>
      <ul className="-mx-4 flex overflow-x-auto bg-surface px-1 lg:mx-0 lg:block lg:overflow-visible lg:px-0">
        <li className="shrink-0">
          <Link
            to="/perfil"
            activeOptions={{ exact: true, includeSearch: false }}
            className={`${item} ${activeItem}`}
          >
            <UserRoundIcon aria-hidden="true" className={icon} />
            Dados do perfil
          </Link>
        </li>
        <li className="shrink-0">
          <Link
            to="/perfil/carteiras"
            activeOptions={{ includeSearch: false }}
            className={`${item} ${activeItem}`}
          >
            <MapPinIcon aria-hidden="true" className={icon} />
            Carteiras
          </Link>
        </li>
        {UNAVAILABLE_ITEMS.map(({ label, icon: ItemIcon }) => (
          <li key={label} className="shrink-0">
            <Unavailable className={item}>
              <ItemIcon aria-hidden="true" className={icon} />
              {label}
            </Unavailable>
          </li>
        ))}
        <li className="shrink-0 lg:border-t lg:border-line-strong">
          <button
            type="button"
            onClick={() => void signOut()}
            className={`${item} font-bold lg:w-full`}
          >
            <LogOutIcon aria-hidden="true" className={icon} />
            Sair
          </button>
        </li>
      </ul>
    </nav>
  )
}
