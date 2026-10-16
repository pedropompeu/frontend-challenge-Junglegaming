import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { ChangePasswordBody, Profile, UpdateProfileBody } from '@/contracts'
import { applyServerFieldErrors } from '@/features/auth/form-errors'
import { errorMessage } from '@/shared/lib/api-error'
import { Form } from '@/shared/ui/form'
import { TextField } from '@/shared/ui/form-fields'
import { useChangePassword, useUpdateProfile } from '../queries'
import {
  ChangePasswordBodySchema,
  EMPTY_PASSWORD_FORM,
  UpdateProfileBodySchema,
  hasPasswordInput,
  profileChanged,
  profileFormValues,
} from '../schemas'
import { AvatarField } from './avatar-field'
import { PASSWORD_FIELD_NAMES, PasswordFields } from './password-form'

type ProfileFormProps = {
  userId: string
  profile: Profile
}

/**
 * Frame Desktop/Perfil do colecionador: dados do perfil e troca de senha sob um só "Salvar".
 * O perfil só vai ao servidor se mudou; a senha, só se algum campo dela foi preenchido.
 */
export function ProfileForm({ userId, profile }: ProfileFormProps) {
  const profileForm = useForm({
    resolver: zodResolver(UpdateProfileBodySchema),
    defaultValues: profileFormValues(profile),
  })
  const passwordForm = useForm({
    resolver: zodResolver(ChangePasswordBodySchema),
    defaultValues: EMPTY_PASSWORD_FORM,
    // O foco vai para o primeiro erro da tela, que pode estar no perfil (ver `save`).
    shouldFocusError: false,
  })
  const updateProfile = useUpdateProfile(userId)
  const changePassword = useChangePassword()
  const busy = updateProfile.isPending || changePassword.isPending

  async function save() {
    const withPassword = hasPasswordInput(passwordForm.getValues())
    let password: ChangePasswordBody | null = null
    if (withPassword) {
      await passwordForm.handleSubmit((values) => {
        password = values
      })()
    } else {
      passwordForm.clearErrors()
    }
    await profileForm.handleSubmit(async (values) => {
      if (withPassword && !password) {
        const invalid = PASSWORD_FIELD_NAMES.find(
          (name) => passwordForm.getFieldState(name).invalid,
        )
        if (invalid) passwordForm.setFocus(invalid)
        return
      }
      await commit(values, password)
    })()
  }

  async function commit(values: UpdateProfileBody, password: ChangePasswordBody | null) {
    const changed = profileChanged(values, profileFormValues(profile))
    if (!changed && !password) {
      toast('Nenhuma alteração para salvar')
      return
    }
    if (changed) {
      try {
        const updated = await updateProfile.mutateAsync(values)
        profileForm.reset(profileFormValues(updated))
        toast.success('Perfil atualizado')
      } catch (error) {
        if (!applyServerFieldErrors(profileForm, error)) {
          toast.error(errorMessage(error, 'Não foi possível salvar o perfil'))
        }
        return
      }
    }
    if (password) {
      try {
        await changePassword.mutateAsync(password)
        passwordForm.reset(EMPTY_PASSWORD_FORM)
        toast.success('Senha alterada')
      } catch (error) {
        if (!applyServerFieldErrors(passwordForm, error)) {
          toast.error(errorMessage(error, 'Não foi possível alterar a senha'))
        }
      }
    }
  }

  const { control } = profileForm
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void save()
      }}
      className="mt-6 grid gap-x-7 gap-y-5 md:mt-8 md:grid-cols-2 md:gap-y-8"
    >
      <Form {...profileForm}>
        <TextField
          control={control}
          name="displayName"
          label="Nome de exibição"
          required
          autoComplete="name"
        />
        <TextField
          control={control}
          name="username"
          label="Nome de usuário"
          required
          autoComplete="username"
        />
        <TextField
          control={control}
          name="email"
          label="E-mail"
          type="email"
          required
          autoComplete="email"
        />
        <TextField control={control} name="ens" label="Nome ENS" prefix=".eth" />
        <TextField control={control} name="nickname" label="Apelido da carteira" />
      </Form>
      <AvatarField userId={userId} avatarUrl={profile.avatarUrl} />
      <div className="mt-3 md:col-start-1 md:mt-0">
        <PasswordFields form={passwordForm} />
      </div>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="h-10 min-w-[131px] bg-primary px-6 text-[15px] font-bold text-ink transition-colors hover:bg-primary-hi disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </form>
  )
}
