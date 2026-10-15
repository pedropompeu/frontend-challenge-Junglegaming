import { z } from 'zod'
import { EmailSchema, PasswordSchema, UsernameSchema } from './auth'

export const ProfileSchema = z.object({
  displayName: z.string(),
  username: z.string(),
  email: z.string(),
  ens: z.string().nullable(),
  nickname: z.string().nullable(),
  avatarUrl: z.string().nullable(),
})
export type Profile = z.infer<typeof ProfileSchema>

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use até ${max} caracteres`)
    .transform((v) => (v === '' ? null : v))
    .nullable()

export const UpdateProfileBodySchema = z.object({
  displayName: z.string().trim().min(1, 'Informe o nome').max(60, 'Use até 60 caracteres'),
  username: UsernameSchema,
  email: EmailSchema,
  ens: optionalText(60),
  nickname: optionalText(40),
})
export type UpdateProfileBody = z.input<typeof UpdateProfileBodySchema>

export const AvatarBodySchema = z.object({
  dataUrl: z
    .string()
    .max(300_000, 'Imagem grande demais')
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Formato de imagem não suportado')
    .nullable(),
})
export type AvatarBody = z.infer<typeof AvatarBodySchema>

export const ChangePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual'),
    newPassword: PasswordSchema,
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem',
  })
export type ChangePasswordBody = z.infer<typeof ChangePasswordBodySchema>
