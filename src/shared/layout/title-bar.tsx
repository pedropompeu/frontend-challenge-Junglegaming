import { Link, useCanGoBack, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon } from 'lucide-react'

/** No mobile, voltar + título (o Figma não tem header); no desktop o título fica só para leitores. */
export function TitleBar({ title }: { title: string }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  // Círculo de 34 px do frame, 4 px para dentro da margem (x 28).
  const back =
    'grid size-[34px] place-items-center rounded-full border border-line bg-surface-2 text-khaki'
  const icon = <ChevronLeftIcon aria-hidden="true" className="size-5" />
  // Como nos frames, o título centraliza à direita do voltar (centro em x≈214 a 414 px; 220 no
  // frame). Abaixo da largura do frame desce de 20 para 18 px para caber entre o voltar e o botão
  // da demo, que fica no canto superior direito do carrinho e do checkout.
  return (
    <div className="relative flex h-12 items-center justify-center pr-6 pl-[38px] md:contents">
      {canGoBack ? (
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.history.back()}
          className={`${back} absolute left-1 md:hidden`}
        >
          {icon}
        </button>
      ) : (
        <Link to="/" aria-label="Voltar" className={`${back} absolute left-1 md:hidden`}>
          {icon}
        </Link>
      )}
      <h1 className="text-center text-lg font-bold min-[414px]:text-xl md:sr-only">{title}</h1>
    </div>
  )
}
