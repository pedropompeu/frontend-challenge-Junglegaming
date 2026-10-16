import type { ReactNode } from 'react'
import type { Control, FieldPath, FieldValues } from 'react-hook-form'
import { cn } from '@/shared/lib/utils'
import { fieldErrorClass, inputClass, selectTriggerClass } from './field-styles'
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from './form'
import { Input } from './input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/** Rótulo com asterisco fora do `<label>`: o nome acessível fica só com o texto. */
export function FieldLabel({
  children,
  required,
  srOnly,
}: {
  children: ReactNode
  required?: boolean
  srOnly?: boolean
}) {
  return (
    <div className={cn('flex items-baseline gap-3', srOnly && 'sr-only')}>
      <FormLabel className="text-[15px] font-normal text-cream">{children}</FormLabel>
      {required ? (
        <span aria-hidden="true" className="text-coral">
          *
        </span>
      ) : null}
    </div>
  )
}

type TextFieldProps<T extends FieldValues, TOut> = {
  /** O resolver pode transformar os valores (ex.: texto vazio vira `null`): `TOut` é a saída. */
  control: Control<T, unknown, TOut>
  name: FieldPath<T>
  label: string
  required?: boolean
  srOnlyLabel?: boolean
  placeholder?: string
  autoComplete?: string
  type?: 'text' | 'email'
  readOnly?: boolean
  description?: string
  /** Caixa à esquerda do campo, como o ".eth" dos frames de perfil e carteiras. */
  prefix?: string
  /** Texto depois do campo. */
  suffix?: string
}

export function TextField<T extends FieldValues, TOut = T>({
  control,
  name,
  label,
  required,
  srOnlyLabel,
  placeholder,
  autoComplete,
  type = 'text',
  readOnly,
  description,
  prefix,
  suffix,
}: TextFieldProps<T, TOut>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="content-start">
          <FieldLabel required={required} srOnly={srOnlyLabel}>
            {label}
          </FieldLabel>
          {srOnlyLabel ? (
            // Mantém o campo alinhado aos vizinhos de linha, que têm rótulo visível.
            <span aria-hidden="true" className="hidden text-[15px] md:block">
              &nbsp;
            </span>
          ) : null}
          <div className="flex items-center gap-2.5">
            {prefix ? (
              <span
                aria-hidden="true"
                className="grid h-11 w-[78px] shrink-0 place-items-center border border-line-strong text-[15px] text-cream"
              >
                {prefix}
              </span>
            ) : null}
            <FormControl>
              <Input
                {...field}
                value={(field.value as string | null) ?? ''}
                type={type}
                placeholder={placeholder}
                autoComplete={autoComplete ?? 'off'}
                readOnly={readOnly}
                aria-required={required ? true : undefined}
                className={cn(inputClass, suffix && 'max-w-56')}
              />
            </FormControl>
            {suffix ? (
              <span aria-hidden="true" className="text-sand">
                {suffix}
              </span>
            ) : null}
          </div>
          {description ? (
            <FormDescription className="text-xs text-sand">{description}</FormDescription>
          ) : prefix ? (
            <FormDescription className="sr-only">Digite só o nome, sem o {prefix}.</FormDescription>
          ) : null}
          <FormMessage className={fieldErrorClass} />
        </FormItem>
      )}
    />
  )
}

type SelectFieldProps<T extends FieldValues, TOut, V extends string> = {
  control: Control<T, unknown, TOut>
  name: FieldPath<T>
  label: string
  options: Record<V, string>
  placeholder: string
  required?: boolean
  disabled?: boolean
}

export function SelectField<T extends FieldValues, V extends string, TOut = T>({
  control,
  name,
  label,
  options,
  placeholder,
  required,
  disabled,
}: SelectFieldProps<T, TOut, V>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="content-start">
          <FieldLabel required={required}>{label}</FieldLabel>
          <Select
            value={field.value as string}
            onValueChange={(value) => field.onChange(value as V)}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger
                ref={field.ref}
                onBlur={field.onBlur}
                aria-required={required ? true : undefined}
                className={selectTriggerClass}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {(Object.keys(options) as V[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {options[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage className={fieldErrorClass} />
        </FormItem>
      )}
    />
  )
}
