import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'

/** No mobile, voltar + título (o Figma não tem header); no desktop o título fica só para leitores. */
export function TitleBar({ title }: { title: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const back =
    'grid size-10 place-items-center rounded-full border border-line-strong bg-surface-2 text-cream'
  const icon = <ChevronLeftIcon aria-hidden="true" className="size-5" />
  return (
    <div className="relative flex h-12 items-center justify-center md:contents">
      {canGoBack ? (
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.history.back()}
          className={`${back} absolute left-0 md:hidden`}
        >
          {icon}
        </button>
      ) : (
        <Link to="/" aria-label="Voltar" className={`${back} absolute left-0 md:hidden`}>
          {icon}
        </Link>
      )}
      <h1 className="text-xl font-bold md:sr-only">{title}</h1>
    </div>
  )
}
