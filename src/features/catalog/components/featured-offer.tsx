import { Link } from '@tanstack/react-router'

/**
 * "NFT em destaque" abaixo dos filtros (desktop), no bloco de 310×470 do Figma: gradiente laranja
 * suave, arte de 366 px com raio 22 e as três formas decorativas do frame. Aponta para Baile de
 * Máscaras, que tem a arte do frame e uma edição 1/10 com poucas unidades.
 */
export function FeaturedOffer() {
  return (
    <section
      aria-labelledby="destaque-titulo"
      className="relative mt-6 overflow-hidden bg-linear-to-b from-primary/10 to-primary/3 pt-6"
    >
      <h2 id="destaque-titulo" className="px-5 text-2xl font-bold text-primary-hi">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-2.5 text-center text-[22px] leading-7 font-bold">OFERTA LIMITADA</p>
      <Link
        to="/nft/$nftId"
        params={{ nftId: 'nft_baile-de-mascaras' }}
        className="mt-2.5 block overflow-hidden rounded-[22px]"
      >
        <img
          src="/assets/nfts/4-400.webp"
          srcSet="/assets/nfts/4-400.webp 400w, /assets/nfts/4-800.webp 800w"
          sizes="310px"
          width={400}
          height={400}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-[366px] w-full object-cover"
        />
        <span className="sr-only">Ver Baile de Máscaras, em oferta limitada</span>
      </Link>
      <FeaturedShapes />
    </section>
  )
}

/** Formas do frame, em coordenadas do bloco (o Figma as põe em x 120, y 1456). */
function FeaturedShapes() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 310 470"
      className="pointer-events-none absolute top-0 left-0 h-[470px] w-[310px]"
    >
      <defs>
        <linearGradient
          id="destaque-g1"
          x1="2"
          y1="286"
          x2="38"
          y2="330"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#46A358" />
          <stop offset="1" stopColor="#46A358" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="destaque-g2"
          x1="232"
          y1="319"
          x2="285"
          y2="396"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D28A4C" />
          <stop offset="1" stopColor="#D28A4C" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id="destaque-g3"
          x1="32.667"
          y1="97"
          x2="50.333"
          y2="122.67"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D28A4C" />
          <stop offset="1" stopColor="#D28A4C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        opacity="0.2"
        x="17"
        y="300"
        width="20"
        height="20"
        rx="6"
        fill="none"
        stroke="url(#destaque-g1)"
        strokeWidth="2"
      />
      <rect
        x="248"
        y="343"
        width="45"
        height="45"
        rx="22.5"
        fill="url(#destaque-g2)"
        fillOpacity="0.3"
      />
      <rect
        x="38"
        y="105"
        width="15"
        height="15"
        rx="7.5"
        fill="url(#destaque-g3)"
        fillOpacity="0.3"
      />
    </svg>
  )
}
