import { Link } from '@tanstack/react-router'
import { ShoppingCartIcon } from 'lucide-react'

export function EmptyCart() {
  return (
    <div className="grid place-items-center gap-4 rounded-[20px] bg-surface px-6 py-14 text-center md:rounded-none">
      <ShoppingCartIcon aria-hidden="true" className="size-10 text-primary-hi" />
      <p className="text-lg font-bold">Seu carrinho está vazio</p>
      <p className="max-w-[36ch] text-sm text-sand">
        Escolha um NFT no mercado e adicione ao carrinho para ver o resumo aqui.
      </p>
      <Link
        to="/"
        hash="catalogo"
        className="inline-flex h-11 items-center rounded-md bg-primary px-6 font-bold text-ink hover:bg-primary-hi"
      >
        Explorar o mercado
      </Link>
    </div>
  )
}
