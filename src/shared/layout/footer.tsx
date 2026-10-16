import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Unavailable } from '@/shared/ui/unavailable'
import { FacebookIcon, InstagramIcon, LinkedinIcon, TwitterIcon, YoutubeIcon } from './social-icons'

type FooterLink = { label: string; href?: string }

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
  const className = 'text-sm text-cream hover:text-primary-hi'
  if (link.href) {
    return (
      <a href={link.href} className={className}>
        {link.label}
      </a>
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
    <footer className="page-container pb-6">
      <div className="grid gap-4 bg-band px-6 py-6 text-sm sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <p className="font-bold tracking-[0.15em]">KURIO</p>
        <p className="max-w-[24ch] leading-[22px]">
          Feito para colecionadores, criadores e cultura
        </p>
        <p>contato@email.com</p>
        <p>+55 11 4002 8922</p>
      </div>
      <div className="grid gap-8 bg-surface px-6 py-8 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {COLUMNS.map((col) => (
          <Column key={col.title} title={col.title}>
            <ul className="mt-2 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <FooterAnchor link={link} />
                </li>
              ))}
            </ul>
          </Column>
        ))}
        <Column title="Redes sociais">
          <ul className="mt-3 flex gap-2">
            {SOCIALS.map(({ label, Icon }) => (
              <li key={label}>
                <Unavailable className="grid size-8 place-items-center rounded-md border border-primary text-primary-hi">
                  <Icon className="size-4" />
                  <span className="sr-only">{label}</span>
                </Unavailable>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg font-bold">Carteiras compatíveis</h2>
          <p className="mt-2 inline-block rounded-md border border-line-strong bg-band px-2.5 py-1.5 text-[10px] font-bold tracking-wide text-primary-hi">
            METAMASK • WALLETCONNECT • COINBASE
          </p>
        </Column>
      </div>
      <p className="mt-3 text-center text-sm">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  )
}
