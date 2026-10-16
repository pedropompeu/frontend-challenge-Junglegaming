import { Link } from '@tanstack/react-router'

/** "NFT em destaque" abaixo dos filtros (desktop). Aponta para um NFT com edição em promoção. */
export function FeaturedOffer() {
  return (
    <section aria-labelledby="destaque-titulo" className="relative mt-4 bg-surface pt-6">
      <h2 id="destaque-titulo" className="px-4 text-2xl font-bold text-primary-hi">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-2 text-center text-xl font-bold">OFERTA LIMITADA</p>
      <Link
        to="/nft/$nftId"
        params={{ nftId: 'nft_lua-de-jade' }}
        className="mt-3 block overflow-hidden rounded-t-[32px] rounded-b-[16px]"
      >
        <img
          src="/assets/nfts/8-400.webp"
          width={400}
          height={460}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[366px] w-full object-cover"
        />
        <span className="sr-only">Ver Lua de Jade, em oferta limitada</span>
      </Link>
    </section>
  )
}
