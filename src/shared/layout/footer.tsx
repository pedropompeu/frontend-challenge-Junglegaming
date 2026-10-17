import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link } from '@tanstack/react-router'
import { Unavailable } from '@/shared/ui/unavailable'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from './social-icons'

type FooterLink = { label: string; href?: '/perfil' | '/favoritos' }

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', href: '/perfil' },
      { label: 'Minha coleção', href: '/perfil' },
      { label: 'Atividade' },
      { label: 'Estúdio do criador' },
      { label: 'Lista de interesse', href: '/favoritos' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda' },
      { label: 'Como comprar NFTs' },
      { label: 'Carteira e segurança' },
      { label: 'Política do mercado' },
      { label: 'Denunciar item' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital' },
      { label: 'Fotografia' },
      { label: 'Música' },
      { label: 'Arte 3D' },
      { label: 'Utilidade' },
    ],
  },
]

const SOCIALS: Array<{ label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'Instagram', Icon: InstagramIcon },
  { label: 'Twitter', Icon: TwitterIcon },
  { label: 'LinkedIn', Icon: LinkedinIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
]

function FooterAnchor({ link }: { link: FooterLink }) {
  const className = 'text-sm text-cream hover:text-primary-hi lg:leading-5'
  if (link.href) {
    return (
      <Link to={link.href} className={className}>
        {link.label}
      </Link>
    )
  }
  return (
    <Unavailable asChild>
      <a href="#" className={className}>
        {link.label}
      </a>
    </Unavailable>
  )
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </div>
  )
}

export function Footer() {
  return (
    // Frame desktop: faixa de contato de 88 px e painel de 236 px com colunas a cada 302,67 px.
    <footer className="page-container pb-6 lg:pb-[30px]">
      <div className="grid gap-4 bg-band px-6 py-6 text-sm sm:grid-cols-2 lg:h-[88px] lg:grid-cols-[repeat(3,minmax(0,302.667fr))_minmax(0,260fr)] lg:items-center lg:gap-0 lg:py-0 lg:pr-0 lg:pl-8">
        <p className="font-bold tracking-[0.15em]">KURIO</p>
        <p className="max-w-[24ch] leading-[22px]">
          Feito para colecionadores, criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>
      <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 lg:h-[236px] lg:grid-cols-[repeat(3,minmax(0,302.667fr))_minmax(0,260fr)] lg:gap-0 lg:pt-[25px] lg:pr-0 lg:pb-0 lg:pl-8">
        {COLUMNS.map((col) => (
          <Column key={col.title} title={col.title}>
            <ul className="mt-2 space-y-2 lg:space-y-2.5 lg:text-sm lg:leading-5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </Column>
        ))}
        <Column title="Redes sociais">
          <ul className="mt-3 flex gap-2 lg:mt-3.5">
            {SOCIALS.map(({ label, Icon }) => (
              <li key={label}>
                <Unavailable className="grid size-8 place-items-center rounded-md border border-primary text-primary-hi lg:rounded-[5px] lg:text-primary">
                  <Icon className="size-4" />
                  <span className="sr-only">{label}</span>
                </Unavailable>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
          <p className="mt-2 inline-block rounded-md border border-line-strong bg-band px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-primary-hi lg:mt-[7px] lg:py-1.5 lg:text-[9px] lg:leading-3 lg:tracking-[0.1px] lg:[word-spacing:3px]">
            METAMASK • WALLETCONNECT • COINBASE
          </p>
        </Column>
      </div>
      <p className="mt-3 text-center text-sm lg:mt-2.5">
        © 2026 Kurio. Propriedade digital para todos.
      </p>
    </footer>
  )
}
