import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterBodySchema, type RegisterBody } from '@/contracts'
import { errorMessage } from '@/shared/lib/api-error'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { applyServerFieldErrors } from '../form-errors'
import { useSession } from '../use-session'
import { PasswordInput, SubmitButton, fieldClass } from './auth-fields'

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register } = useSession()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(RegisterBodySchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  })

  async function submit(values: RegisterBody) {
    setFormError(null)
    try {
      await register(values)
      onSuccess()
    } catch (error) {
      if (!applyServerFieldErrors(form, error)) setFormError(errorMessage(error))
    }
  }

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(submit)} className="grid gap-4">
        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm"
          >
            {formError}
          </p>
        ) : null}
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Nome de usuário</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="Nome de usuário"
                  className={fieldClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="Digite seu e-mail"
                  className={fieldClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Senha</FormLabel>
              <FormControl>
                <PasswordInput autoComplete="new-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Confirmar senha</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="Confirmar senha"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SubmitButton
          busy={form.formState.isSubmitting}
          label="Criar conta"
          busyLabel="Criando conta…"
        />
      </form>
    </Form>
  )
}
