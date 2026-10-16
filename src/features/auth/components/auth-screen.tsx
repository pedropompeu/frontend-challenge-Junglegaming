import { useRef, type MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'
import { CatalogGrid, CatalogGridSkeleton } from '@/features/catalog/components/catalog-grid'
import { nftListQuery } from '@/features/catalog/queries'
import { catalogSearchSchema, toListParams } from '@/features/catalog/search-schema'
import { useMediaQuery } from '@/shared/lib/use-media-query'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui/dialog'
import { afterAuthTarget, closeAuthTarget, type AuthSearch } from '../schemas'
import { SocialLogin } from './auth-fields'
import { LoginForm } from './login-form'
import { RegisterForm } from './register-form'

export type AuthMode = 'login' | 'register'

const COPY: Record<AuthMode, { title: string; mobileTitle: string; description: string }> = {
  login: {
    title: 'Entrar na Kurio',
    mobileTitle: 'Entrar',
    description: 'Entre para gerenciar sua carteira, coleção e perfil de criador.',
  },
  register: {
    title: 'Criar conta na Kurio',
    mobileTitle: 'Criar perfil de colecionador',
    description: 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.',
  },
}

const tab =
  'flex-1 border-b-2 border-transparent pb-3 text-center font-bold text-sand transition-colors hover:text-cream aria-[current=page]:border-primary aria-[current=page]:text-cream'

/**
 * Entrar/Criar conta: modal sobre o catálogo no desktop e tela cheia no mobile, como no Figma.
 * Concluir leva ao `redirect` (sempre interno) ou ao Início. Fechar sem entrar só volta ao
 * `redirect` se ele for público: numa rota privada o guard devolveria o usuário a esta tela.
 */
export function AuthScreen({ mode, search }: { mode: AuthMode; search: AuthSearch }) {
  const router = useRouter()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const target = afterAuthTarget(search)
  const closeTarget = closeAuthTarget(search, (href) => {
    const pathname = href.split(/[?#]/)[0] ?? '/'
    return router.matchRoutes(pathname).some((m) => m.routeId === '/_auth')
  })
  const contentRef = useRef<HTMLDivElement>(null)

  function leave() {
    void router.navigate({ href: target, replace: true })
  }

  function close() {
    void router.navigate({ href: closeTarget, replace: true })
  }

  const body = (
    <>
      {search.motivo === 'expirada' ? (
        <p
          role="status"
          className="rounded-md border border-primary/60 bg-primary/10 px-4 py-3 text-sm"
        >
          Sua sessão expirou. Entre novamente para continuar.
        </p>
      ) : null}
      {mode === 'login' ? <LoginForm onSuccess={leave} /> : <RegisterForm onSuccess={leave} />}
      <SocialLogin />
    </>
  )

  if (isDesktop) {
    return (
      <>
        <AuthBackdrop />
        <Dialog open onOpenChange={(open) => !open && close()}>
          <DialogContent
            ref={contentRef}
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              contentRef.current?.querySelector<HTMLInputElement>('input')?.focus()
            }}
            className="max-h-[calc(100dvh-2rem)] gap-6 overflow-y-auto border-line-strong bg-surface p-8 text-cream sm:max-w-[480px]"
          >
            <DialogTitle className="sr-only">{COPY[mode].title}</DialogTitle>
            <nav aria-label="Acesso" className="mr-8 flex border-b border-line">
              <Link to="/entrar" search={search} replace className={tab}>
                Entrar
              </Link>
              <Link to="/cadastro" search={search} replace className={tab}>
                Criar conta
              </Link>
            </nav>
            <DialogDescription className="text-sand">{COPY[mode].description}</DialogDescription>
            {body}
          </DialogContent>
        </Dialog>
      </>
    )
  }

  function back(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()
    close()
  }

  return (
    <section aria-labelledby="auth-title" className="page-container grid gap-6 pt-4 pb-10">
      <div className="grid grid-cols-[40px_1fr_40px] items-center">
        <a
          href={closeTarget}
          onClick={back}
          aria-label="Voltar"
          className="grid size-10 place-items-center rounded-full border border-line-strong text-cream"
        >
          <ChevronLeftIcon aria-hidden="true" className="size-5" />
        </a>
        <p className="text-center text-sm font-bold tracking-[0.2em]">KURIO</p>
      </div>
      <div className="grid gap-2">
        <h1 id="auth-title" className="text-2xl font-bold">
          {COPY[mode].mobileTitle}
        </h1>
        <p className="text-sand">{COPY[mode].description}</p>
      </div>
      {body}
      <p className="text-center text-sm text-sand">
        {mode === 'login' ? (
          <>
            Novo na Kurio?{' '}
            <Link to="/cadastro" search={search} replace className="font-bold text-primary-hi">
              Crie uma conta
            </Link>
          </>
        ) : (
          <>
            Já tem uma conta?{' '}
            <Link to="/entrar" search={search} replace className="font-bold text-primary-hi">
              Entre
            </Link>
          </>
        )}
      </p>
    </section>
  )
}

const BACKDROP_PARAMS = toListParams(catalogSearchSchema.parse({}))

/** Catálogo inerte atrás do modal (o Figma desenha o acesso sobre o Início). */
function AuthBackdrop() {
  const { data } = useQuery(nftListQuery(BACKDROP_PARAMS))
  return (
    <div inert aria-hidden="true" className="page-container py-10">
      <h2 className="mb-6 text-2xl font-bold">Mercado</h2>
      {data ? <CatalogGrid items={data.items} busy={false} /> : <CatalogGridSkeleton count={6} />}
    </div>
  )
}
