import * as React from 'react'
import { cn } from '@/shared/lib/utils'
import type { Label as LabelPrimitive } from 'radix-ui'
import { Slot } from 'radix-ui'
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form'

import { Label } from '@/shared/ui/label'

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TTransformedValues = TFieldValues,
>({
  ...props
}: ControllerProps<TFieldValues, TName, TTransformedValues>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>')
  }

  const { id, hasDescription, hasMessage, registerDescription, registerMessage } = itemContext

  return {
    id,
    hasDescription,
    hasMessage,
    registerDescription,
    registerMessage,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
  /** Se a descrição e a mensagem estão no DOM: o `aria-describedby` só aponta para ids que existem. */
  hasDescription: boolean
  hasMessage: boolean
  registerDescription: (node: HTMLElement | null) => void
  registerMessage: (node: HTMLElement | null) => void
}

const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue)

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId()
  const [hasDescription, setHasDescription] = React.useState(false)
  const [hasMessage, setHasMessage] = React.useState(false)
  const registerDescription = React.useCallback((node: HTMLElement | null) => {
    setHasDescription(node !== null)
  }, [])
  const registerMessage = React.useCallback((node: HTMLElement | null) => {
    setHasMessage(node !== null)
  }, [])
  const value = React.useMemo(
    () => ({ id, hasDescription, hasMessage, registerDescription, registerMessage }),
    [id, hasDescription, hasMessage, registerDescription, registerMessage],
  )

  return (
    <FormItemContext.Provider value={value}>
      <div data-slot="form-item" className={cn('grid gap-2', className)} {...props} />
    </FormItemContext.Provider>
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField()

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn('data-[error=true]:text-destructive', className)}
      htmlFor={formItemId}
      {...props}
    />
  )
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, formItemId, formDescriptionId, formMessageId, hasDescription, hasMessage } =
    useFormField()
  const describedBy = [
    hasDescription && formDescriptionId,
    error && hasMessage && formMessageId,
  ].filter(Boolean)

  return (
    <Slot.Root
      data-slot="form-control"
      id={formItemId}
      aria-describedby={describedBy.length > 0 ? describedBy.join(' ') : undefined}
      aria-invalid={!!error}
      {...props}
    />
  )
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId, registerDescription } = useFormField()

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
      ref={registerDescription}
    />
  )
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId, registerMessage } = useFormField()
  const body = error ? String(error?.message ?? '') : props.children

  if (!body) {
    return null
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn('text-sm text-destructive', className)}
      {...props}
      ref={registerMessage}
    >
      {body}
    </p>
  )
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
}
