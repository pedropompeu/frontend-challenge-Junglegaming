import type { UseFormReturn } from 'react-hook-form'
import type { ChangePasswordBody } from '@/contracts'
import { PasswordInput } from '@/features/auth/components/auth-fields'
import { cn } from '@/shared/lib/utils'
import { fieldErrorClass, inputClass } from '@/shared/ui/field-styles'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/shared/ui/form'
import { FieldLabel } from '@/shared/ui/form-fields'

const FIELDS: Array<{
  name: keyof ChangePasswordBody
  label: string
  autoComplete: 'current-password' | 'new-password'
}> = [
  { name: 'currentPassword', label: 'Senha atual', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nova senha', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Confirmar nova senha', autoComplete: 'new-password' },
]

export const PASSWORD_FIELD_NAMES = FIELDS.map((f) => f.name)

/**
 * "Alterar senha" do frame Desktop/Perfil. Fica dentro do formulário do perfil (o frame tem um
 * só "Salvar"), mas com estado próprio: em branco, não entra no envio.
 */
export function PasswordFields({ form }: { form: UseFormReturn<ChangePasswordBody> }) {
  return (
    <Form {...form}>
      {/* Frame desktop: título 16/500 com base em y 480 e campos a cada 91 px a partir de y 533. */}
      <fieldset className="grid gap-5 md:gap-[21px]">
        <legend className="mb-5 text-lg text-cream md:mb-4 md:text-base md:leading-[25px] md:font-medium">
          Alterar senha
        </legend>
        {FIELDS.map(({ name, label, autoComplete }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem className="content-start">
                <FieldLabel>{label}</FieldLabel>
                <FormControl>
                  <PasswordInput
                    {...field}
                    autoComplete={autoComplete}
                    className={cn(inputClass, 'pr-12')}
                  />
                </FormControl>
                <FormMessage className={fieldErrorClass} />
              </FormItem>
            )}
          />
        ))}
      </fieldset>
    </Form>
  )
}
