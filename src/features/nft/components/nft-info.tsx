import type { ReactNode } from 'react'
import { MailIcon } from 'lucide-react'
import type { Edition, Nft } from '@/contracts'
import { LinkedinIcon, TwitterIcon } from '@/shared/layout/social-icons'
import { EthPrice } from '@/shared/ui/eth-price'
import { Unavailable } from '@/shared/ui/unavailable'
import { Rating } from './rating'

type NftInfoProps = {
  nft: Nft
  edition: Edition
  /** Seletor de edição e compra, entre a descrição e os metadados (ordem do Figma). */
  children: ReactNode
}

const SHARE = [
  { label: 'Compartilhar no LinkedIn', Icon: LinkedinIcon },
  { label: 'Compartilhar por e-mail', Icon: MailIcon },
  { label: 'Compartilhar no Twitter', Icon: TwitterIcon },
] as const

export function NftInfo({ nft, edition, children }: NftInfoProps) {
  return (
    // No mobile o frame separa título, descrição, edição e metadados por 12 px.
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3 md:block">
        <h1 className="text-xl leading-tight font-bold md:text-3xl">{nft.name}</h1>
        <Rating rating={nft.rating} reviewsCount={nft.reviewsCount} className="md:hidden" />
      </div>
      <div className="hidden items-center justify-between gap-4 border-b border-divider pb-3 md:flex">
        <EthPrice value={edition.price} original={edition.originalPrice} size="xl" />
        <Rating rating={nft.rating} reviewsCount={nft.reviewsCount} />
      </div>
      <section aria-labelledby="nft-about">
        <h2 id="nft-about" className="sr-only font-bold md:not-sr-only">
          Sobre este NFT:
        </h2>
        <p className="max-w-[46ch] text-sm leading-6 text-sand md:mt-1">{nft.description}</p>
      </section>
      {children}
      <dl className="grid gap-3 text-[15px] leading-5 text-khaki md:text-sm">
        <div className="flex gap-1">
          <dt>ID do token:</dt>
          <dd>{nft.tokenId}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Coleção:</dt>
          <dd>{nft.collectionName}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Atributos:</dt>
          <dd>{nft.attributes.map((a) => a.value).join(', ')}</dd>
        </div>
      </dl>
      <div className="hidden items-center gap-4 md:flex">
        <p className="text-sm font-bold">Compartilhar este NFT:</p>
        <ul className="flex gap-3 text-cream">
          {SHARE.map(({ label, Icon }) => (
            <li key={label}>
              <Unavailable className="grid size-6 place-items-center hover:text-primary-hi">
                <Icon aria-hidden="true" className="size-4" />
                <span className="sr-only">{label}</span>
              </Unavailable>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
