import { describe, expect, it } from 'vitest'
import {
  afterAuthTarget,
  authSearchSchema,
  closeAuthTarget,
  safeRedirect,
} from '@/features/auth/schemas'

describe('safeRedirect', () => {
  it('accepts internal paths with search', () => {
    expect(safeRedirect('/perfil?aba=1')).toBe('/perfil?aba=1')
  })

  it.each(['https://evil.test', '//evil.test', '/\\evil.test', 'perfil', 42])(
    'rejects %s',
    (value) => {
      expect(safeRedirect(value)).toBeUndefined()
    },
  )
})

describe('authSearchSchema', () => {
  it('drops unsafe redirects and unknown reasons instead of failing', () => {
    expect(authSearchSchema.parse({ redirect: '//x', motivo: 'outra' })).toEqual({
      redirect: undefined,
      motivo: undefined,
    })
  })

  it('accepts an empty search', () => {
    expect(authSearchSchema.parse({})).toEqual({})
  })
})

describe('afterAuthTarget', () => {
  it('returns the internal redirect', () => {
    expect(afterAuthTarget({ redirect: '/nft/nft_x?edicao=1' })).toBe('/nft/nft_x?edicao=1')
  })

  it('falls back to home without redirect or when it points back to an auth screen', () => {
    expect(afterAuthTarget({})).toBe('/')
    expect(afterAuthTarget({ redirect: '/entrar' })).toBe('/')
    expect(afterAuthTarget({ redirect: '/cadastro?redirect=%2Fperfil' })).toBe('/')
  })
})

describe('closeAuthTarget', () => {
  const isPrivate = (href: string) => href.startsWith('/checkout') || href.startsWith('/perfil')

  it('keeps a public redirect', () => {
    expect(closeAuthTarget({ redirect: '/nft/nft_x' }, isPrivate)).toBe('/nft/nft_x')
  })

  it('goes home when the redirect is private: the guard would bounce back to the login', () => {
    expect(closeAuthTarget({ redirect: '/checkout', motivo: 'expirada' }, isPrivate)).toBe('/')
    expect(closeAuthTarget({ redirect: '/perfil/carteiras' }, isPrivate)).toBe('/')
  })
})
