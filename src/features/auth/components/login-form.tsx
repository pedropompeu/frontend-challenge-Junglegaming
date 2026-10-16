import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginBodySchema, type LoginBody } from '@/contracts'
import { errorMessage } from '@/shared/lib/api-error'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form'
import { Input } from '@/shared/ui/input'
import { Unavailable } from '@/shared/ui/unavailable'
import { applyServerFieldErrors } from '../form-errors'
import { useSession } from '../use-session'
import { PasswordInput, SubmitButton, fieldClass } from './auth-fields'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login } = useSession()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: { email: '', password: '' },
  })

  async function submit(values: LoginBody) {
    setFormError(null)
    try {
      await login(values)
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
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="contato@email.com"
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
                <PasswordInput autoComplete="current-password" placeholder="Senha" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Unavailable asChild>
          <a
            href="#"
            className="justify-self-end text-sm font-medium text-primary-hi hover:underline"
          >
            Esqueceu a senha?
          </a>
        </Unavailable>
        <SubmitButton busy={form.formState.isSubmitting} label="Entrar" busyLabel="Entrando…" />
      </form>
    </Form>
  )
}
