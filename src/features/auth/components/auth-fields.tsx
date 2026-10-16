import { useState, type ComponentProps } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { FacebookIcon } from '@/shared/layout/social-icons'
import { Unavailable } from '@/shared/ui/unavailable'

export const fieldClass =
  'h-12 rounded-md border-line-strong bg-ink px-4 text-base text-cream placeholder:text-khaki md:text-base'

export function PasswordInput({ className, ...props }: ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        data-slot="input"
        className={cn(
          'w-full min-w-0 border focus-visible:border-ring aria-invalid:border-destructive',
          fieldClass,
          'pr-12',
          className,
        )}
      />
      <button
        type="button"
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center text-sand hover:text-cream"
      >
        {visible ? (
          <EyeOffIcon aria-hidden="true" className="size-5" />
        ) : (
          <EyeIcon aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  )
}

export function SubmitButton({
  busy,
  label,
  busyLabel,
}: {
  busy: boolean
  label: string
  busyLabel: string
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="h-12 w-full rounded-md bg-primary font-bold text-ink transition-colors hover:bg-primary-hi disabled:cursor-wait disabled:opacity-70"
    >
      {busy ? busyLabel : label}
    </button>
  )
}

const socialButton =
  'inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-band text-sm font-medium text-cream'

/** Login social fora do escopo: visível como no Figma, mas avisa que não está disponível. */
export function SocialLogin() {
  return (
    <div className="grid gap-4">
      <p className="flex items-center gap-3 text-sm text-sand before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
        Ou continue com
      </p>
      <div className="grid gap-3">
        <Unavailable className={socialButton}>
          <span aria-hidden="true" className="text-base font-bold">
            G
          </span>
          Continuar com Google
        </Unavailable>
        <Unavailable className={socialButton}>
          <FacebookIcon aria-hidden="true" className="size-5" />
          Continuar com Facebook
        </Unavailable>
      </div>
    </div>
  )
}
