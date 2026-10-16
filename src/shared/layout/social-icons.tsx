import type { SVGProps } from 'react'

/** Glifos simplificados das redes do Figma (o lucide 1.x não traz ícones de marca). */
type IconProps = SVGProps<SVGSVGElement>

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M14 8h2V4.5h-2.5A3.5 3.5 0 0 0 10 8v2.5H8V14h2v6h3.5v-6H16l.5-3.5h-3V8.5A.5.5 0 0 1 14 8Z" />
    </svg>
  )
}

export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="4.5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.8" cy="7.2" r="0.6" fill="currentColor" />
    </svg>
  )
}

export function TwitterIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M20.5 6.5a7 7 0 0 1-2.2.6 3.7 3.7 0 0 0 1.7-2.1 7.5 7.5 0 0 1-2.4.9A3.8 3.8 0 0 0 11.2 9 10.7 10.7 0 0 1 3.4 5s-3.4 7.6 4.3 11a12 12 0 0 1-4.2 1.5C11 21.3 19.5 17.5 19.5 9.2c0-.2 0-.5-.1-.7a5.6 5.6 0 0 0 1.1-2Z" />
    </svg>
  )
}

export function LinkedinIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.5 10v9M5.5 5.5v.01M10 19v-9M10 13.5a3.5 3.5 0 0 1 7 0V19" />
    </svg>
  )
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="6" width="18" height="12" rx="4" />
      <path d="m10.5 9.5 4 2.5-4 2.5Z" fill="currentColor" />
    </svg>
  )
}
