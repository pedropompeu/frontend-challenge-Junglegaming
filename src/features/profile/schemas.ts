import type { ChangePasswordBody, Profile } from '@/contracts'

export { ChangePasswordBodySchema, UpdateProfileBodySchema } from '@/contracts'

/** Valores do formulário: campos opcionais do perfil viram texto vazio. */
export type ProfileFormValues = {
  displayName: string
  username: string
  email: string
  ens: string
  nickname: string
}

export function profileFormValues(profile: Profile): ProfileFormValues {
  return {
    displayName: profile.displayName,
    username: profile.username,
    email: profile.email,
    ens: profile.ens ?? '',
    nickname: profile.nickname ?? '',
  }
}

/** Compara como o servidor gravaria (sem espaços nas pontas): só o que mudou vira `PATCH`. */
export function profileChanged(
  values: Partial<Record<keyof ProfileFormValues, string | null>>,
  saved: ProfileFormValues,
): boolean {
  return (Object.keys(saved) as Array<keyof ProfileFormValues>).some(
    (key) => (values[key] ?? '').trim() !== saved[key].trim(),
  )
}

export const EMPTY_PASSWORD_FORM: ChangePasswordBody = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

/** A troca de senha é opcional: só entra no "Salvar" quando algum campo foi preenchido. */
export function hasPasswordInput(values: ChangePasswordBody): boolean {
  return Object.values(values).some((v) => v !== '')
}
