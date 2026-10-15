import { z } from 'zod'
import { IdSchema, IsoDateSchema } from './common'

export const UserSchema = z.object({
  id: IdSchema,
  username: z.string(),
  email: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
})
export type User = z.infer<typeof UserSchema>

export const SessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: IsoDateSchema,
  user: UserSchema,
})
export type Session = z.infer<typeof SessionSchema>

export const SessionInfoSchema = z.object({ user: UserSchema, expiresAt: IsoDateSchema })
export type SessionInfo = z.infer<typeof SessionInfoSchema>

export const EmailSchema = z.string().trim().min(1, 'Informe o e-mail').email('E-mail inválido')

export const PasswordSchema = z
  .string()
  .min(8, 'A senha precisa de pelo menos 8 caracteres')
  .regex(/[A-Z]/, 'A senha precisa de uma letra maiúscula')
  .regex(/\d/, 'A senha precisa de um número')

export const UsernameSchema = z
  .string()
  .trim()
  .min(3, 'Use de 3 a 20 caracteres')
  .max(20, 'Use de 3 a 20 caracteres')
  .regex(/^[a-z0-9_]+$/, 'Use apenas letras minúsculas, números e _')

export const LoginBodySchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Informe a senha'),
})
export type LoginBody = z.infer<typeof LoginBodySchema>

export const RegisterBodySchema = z
  .object({
    username: UsernameSchema,
    email: EmailSchema,
    password: PasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type RegisterBody = z.infer<typeof RegisterBodySchema>
